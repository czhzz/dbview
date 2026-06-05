import React, { useState, useCallback } from 'react'
import { Button, Dropdown, Progress, Modal, message } from 'antd'
import {
  DownloadOutlined,
  FileTextOutlined,
  FileExcelOutlined,
  DatabaseOutlined
} from '@ant-design/icons'
import { dialogApi, dataApi, fileApi } from '../../services/api'
import { formatCSV, formatJSON, formatSQLInsert, type ExportData } from '../../utils/export-formatters'
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
  /** Optional base query params (sort, filters) for "export all" */
  baseQueryParams?: Omit<PaginationQuery, 'page' | 'pageSize'>
}

const FORMAT_FILTERS: Record<ExportFormat, { name: string; extensions: string[] }> = {
  csv: { name: 'CSV 文件', extensions: ['csv'] },
  json: { name: 'JSON 文件', extensions: ['json'] },
  sql: { name: 'SQL 文件', extensions: ['sql'] }
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

const DataExport: React.FC<DataExportProps> = ({
  currentData,
  connId,
  tableName,
  schema,
  baseQueryParams
}) => {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState({ percent: 0, visible: false })

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
    [tableName]
  )

  const doExportCurrentPage = useCallback(
    async (format: ExportFormat) => {
      if (currentData.rows.length === 0) {
        message.warning('没有可导出的数据')
        return
      }
      try {
        setExporting(true)
        const content = formatData(currentData, format)
        const saved = await saveFile(content, format, timestamp())
        if (saved) {
          message.success(`已导出 ${currentData.rows.length} 行数据`)
        }
      } catch (err) {
        message.error(`导出失败: ${err instanceof Error ? err.message : '未知错误'}`)
      } finally {
        setExporting(false)
      }
    },
    [currentData, saveFile]
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
          tableName
        }
        const content = formatData(exportData, format)
        const saved = await saveFile(content, format, timestamp())
        if (saved) {
          message.success(`已导出全部 ${allRows.length} 行数据`)
        }
      } catch (err) {
        message.error(`导出失败: ${err instanceof Error ? err.message : '未知错误'}`)
      } finally {
        setExporting(false)
        setProgress({ percent: 0, visible: false })
      }
    },
    [connId, tableName, schema, baseQueryParams, currentData.columns, saveFile]
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
              label: '导出当前页',
              children: makeMenuItems('current')
            },
            {
              key: 'all',
              label: '导出全部',
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
          导出
        </Button>
      </Dropdown>
      <Modal
        title="正在导出"
        open={progress.visible}
        footer={null}
        closable={false}
        centered
        width={400}
      >
        <Progress percent={progress.percent} status="active" />
        <p style={{ textAlign: 'center', marginTop: 8, color: '#999' }}>
          正在拉取数据，请稍候...
        </p>
      </Modal>
    </>
  )
}

export default DataExport
