import React, { useState, useCallback } from 'react'
import { Button, Dropdown, Progress, Modal, message } from 'antd'
import {
  DownloadOutlined,
  FileTextOutlined,
  FileExcelOutlined,
  DatabaseOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { dialogApi, dataApi, fileApi } from '../../services/api'
import { formatCSV, formatJSON, formatSQLInsert, type ExportData } from '../../utils/export-formatters'
import type { DbType } from '../../utils/sql-quote'
import type { PaginationQuery, PaginationResult, SQLResult } from '../../types/database'

type ExportFormat = 'csv' | 'json' | 'sql'

interface DataExportProps {
  /** Current page data already loaded (for "export current page") */
  currentData: ExportData
  /** Connection ID — needed for fetching all data */
  connId: string
  /** Table name — used for default file name and SQL INSERT target */
  tableName: string
  /** Schema name (optional, for PostgreSQL/Oracle) */
  schema?: string
  /** Database type — used for SQL INSERT quoting */
  dbType: DbType
  /** Optional base query params (sort, filters) for "export all" */
  baseQueryParams?: Omit<PaginationQuery, 'page' | 'pageSize'>
}

const DataExport: React.FC<DataExportProps> = ({
  currentData,
  connId,
  tableName,
  schema,
  dbType,
  baseQueryParams
}) => {
  const { t } = useTranslation()
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState({ percent: 0, visible: false })

  const FORMAT_FILTERS: Record<ExportFormat, { name: string; extensions: string[] }> = {
    csv: { name: t('dataExport.csvFile'), extensions: ['csv'] },
    json: { name: t('dataExport.jsonFile'), extensions: ['json'] },
    sql: { name: t('dataExport.sqlFile'), extensions: ['sql'] }
  }

  const FORMAT_ICONS: Record<ExportFormat, React.ReactNode> = {
    csv: <FileExcelOutlined />,
    json: <FileTextOutlined />,
    sql: <DatabaseOutlined />
  }

  function timestamp(): string {
    const now = new Date()
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      '_',
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0')
    ].join('')
  }

  function formatData(data: ExportData, format: ExportFormat): string {
    switch (format) {
      case 'csv':
        return formatCSV(data)
      case 'json':
        return formatJSON(data)
      case 'sql':
        return formatSQLInsert(data)
    }
  }

  /** Write content to a file selected by the user */
  const saveFile = useCallback(
    async (content: string, format: ExportFormat, suffix: string) => {
      const filter = FORMAT_FILTERS[format]
      const result = await dialogApi.showSaveDialog({
        defaultPath: `${tableName}_${suffix}.${format}`,
        filters: [filter]
      })
      if (result.canceled || !result.filePath) return false

      await fileApi.write(result.filePath, content)
      return true
    },
    [tableName, t]
  )

  const doExportCurrentPage = useCallback(
    async (format: ExportFormat) => {
      if (currentData.rows.length === 0) {
        message.warning(t('table.noData'))
        return
      }
      try {
        setExporting(true)
        const content = formatData(currentData, format)
        const saved = await saveFile(content, format, timestamp())
        if (saved) {
          message.success(t('table.exportSuccess', { count: currentData.rows.length }))
        }
      } catch (err) {
        message.error(t('table.exportFailed', { message: err instanceof Error ? err.message : t('common.unknownError') }))
      } finally {
        setExporting(false)
      }
    },
    [currentData, saveFile, t]
  )

  const doExportAll = useCallback(
    async (format: ExportFormat) => {
      try {
        setExporting(true)
        setProgress({ percent: 0, visible: true })

        // Fetch all data in pages
        const PAGE_SIZE = 500
        let page = 1
        let allRows: Record<string, unknown>[] = []
        let total = 0
        let columns: string[] = currentData.columns

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const params: PaginationQuery = {
            ...(baseQueryParams || { table: tableName, schema }),
            table: tableName,
            schema,
            page,
            pageSize: PAGE_SIZE
          }
          const result: PaginationResult = await dataApi.query(connId, params)
          columns = result.columns
          total = result.total
          allRows = allRows.concat(result.rows)

          const pct = Math.min(100, Math.round((allRows.length / total) * 100))
          setProgress({ percent: pct, visible: true })

          if (allRows.length >= total || result.rows.length < PAGE_SIZE) {
            break
          }
          page++
        }

        setProgress({ percent: 100, visible: true })

        const exportData: ExportData = {
          columns,
          rows: allRows,
          tableName,
          dbType
        }
        const content = formatData(exportData, format)
        const saved = await saveFile(content, format, timestamp())
        if (saved) {
          message.success(t('dataExport.exportAllSuccess', { count: allRows.length }))
        }
      } catch (err) {
        message.error(t('table.exportFailed', { message: err instanceof Error ? err.message : t('common.unknownError') }))
      } finally {
        setExporting(false)
        setProgress({ percent: 0, visible: false })
      }
    },
    [connId, tableName, schema, baseQueryParams, currentData.columns, saveFile, t]
  )

  const makeMenuItems = (scope: 'current' | 'all') => {
    const handler = scope === 'current' ? doExportCurrentPage : doExportAll
    return [
      {
        key: 'csv',
        label: 'CSV',
        icon: FORMAT_ICONS.csv,
        onClick: () => handler('csv')
      },
      {
        key: 'json',
        label: 'JSON',
        icon: FORMAT_ICONS.json,
        onClick: () => handler('json')
      },
      {
        key: 'sql',
        label: 'SQL INSERT',
        icon: FORMAT_ICONS.sql,
        onClick: () => handler('sql')
      }
    ]
  }

  return (
    <>
      <Dropdown
        menu={{
          items: [
            {
              key: 'current',
              label: t('table.exportCurrentPage'),
              children: makeMenuItems('current')
            },
            {
              key: 'all',
              label: t('table.exportAll'),
              children: makeMenuItems('all')
            }
          ]
        }}
        trigger={['click']}
      >
        <Button
          icon={<DownloadOutlined />}
          size="small"
          loading={exporting}
          disabled={currentData.rows.length === 0}
        >
          {t('table.export')}
        </Button>
      </Dropdown>
      <Modal
        title={t('table.exporting')}
        open={progress.visible}
        footer={null}
        closable={false}
        centered
        width={400}
      >
        <Progress percent={progress.percent} status="active" />
        <p style={{ textAlign: 'center', marginTop: 8, color: '#999' }}>
          {t('table.exportingProgress')}
        </p>
      </Modal>
    </>
  )
}

export default DataExport
