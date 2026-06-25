import React, { useState, useCallback } from 'react'
import { Button, Space, Typography, Table, Select, message, Modal, Progress, Tag, Input } from 'antd'
import { UploadOutlined, PlayCircleOutlined, WarningOutlined, TableOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { importApi, databaseApi } from '../../services/api'
import type { ImportPreview, ImportResult } from '../../types/database'

interface Props {
  connId: string
  onSuccess?: () => void
}

const DataImport: React.FC<Props> = ({ connId, onSuccess }) => {
  const { t } = useTranslation()
  const [filePath, setFilePath] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [targetTable, setTargetTable] = useState('')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [tables, setTables] = useState<{ name: string }[]>([])
  const [createTableMode, setCreateTableMode] = useState(false)
  const [newTableName, setNewTableName] = useState('')

  // Load available tables
  React.useEffect(() => {
    databaseApi.getTables(connId).then(setTables).catch(() => {})
  }, [connId])

  const handleSelectFile = useCallback(async () => {
    // Use a hidden input for file selection
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv,.json,.xlsx,.xls'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setFilePath(file.name)
      setLoading(true)
      try {
        const result = await importApi.preview(file.path)
        setPreview(result)
        // Auto-map columns with same name
        const mapping: Record<string, string> = {}
        result.columns.forEach((col) => {
          mapping[col] = col
        })
        setColumnMapping(mapping)
      } catch (err) {
        message.error(t('dataImport.previewFailed', { message: String(err) }))
      } finally {
        setLoading(false)
      }
    }
    input.click()
  }, [t])

  const handleImport = useCallback(async () => {
    if (!preview || !filePath) return

    let table = targetTable

    if (createTableMode) {
      if (!newTableName) {
        message.warning(t('dataImport.enterTableName'))
        return
      }
      // Create table from detected types
      const cols = preview.columns.map((col) => ({
        name: col,
        type: preview.detectedTypes[col] || 'TEXT'
      }))
      const createResult = await importApi.createTable(connId, newTableName, cols)
      if (!createResult.success) {
        message.error(t('dataImport.createTableFailed'))
        return
      }
      table = newTableName
      message.success(t('dataImport.tableCreated'))
    }

    if (!table) {
      message.warning(t('dataImport.selectTargetTable'))
      return
    }

    setImporting(true)
    setImportProgress(0)
    try {
      const importResult = await importApi.execute(connId, table, filePath, columnMapping)
      setResult(importResult)
      if (importResult.errors.length === 0) {
        message.success(t('dataImport.importSuccess', { count: importResult.importedRows }))
        onSuccess?.()
      } else {
        message.warning(t('dataImport.importWithErrors', {
          imported: importResult.importedRows,
          errors: importResult.errors.length
        }))
      }
    } catch (err) {
      message.error(t('dataImport.importFailed', { message: String(err) }))
    } finally {
      setImporting(false)
      setImportProgress(100)
    }
  }, [preview, filePath, targetTable, columnMapping, createTableMode, newTableName, connId, t, onSuccess])

  const handleMappingChange = (fileCol: string, tableCol: string) => {
    setColumnMapping((prev) => ({ ...prev, [fileCol]: tableCol }))
  }

  if (!preview) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
        <Typography.Text type="secondary">{t('dataImport.selectFileHint')}</Typography.Text>
        <Button type="primary" icon={<UploadOutlined />} onClick={handleSelectFile} loading={loading}>
          {t('dataImport.selectFile')}
        </Button>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Typography.Text strong>{t('dataImport.title')}</Typography.Text>
        <Tag>{filePath}</Tag>
        <div style={{ flex: 1 }} />
        <Button size="small" icon={<UploadOutlined />} onClick={handleSelectFile}>
          {t('dataImport.changeFile')}
        </Button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {/* Column Mapping */}
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          {t('dataImport.columnMapping')}
        </Typography.Text>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ padding: '6px 12px', border: '1px solid #f0f0f0', textAlign: 'left', fontSize: 12 }}>
                {t('dataImport.fileColumn')}
              </th>
              <th style={{ padding: '6px 12px', border: '1px solid #f0f0f0', textAlign: 'left', fontSize: 12 }}>
                {t('dataImport.detectedType')}
              </th>
              <th style={{ padding: '6px 12px', border: '1px solid #f0f0f0', textAlign: 'left', fontSize: 12 }}>
                {t('dataImport.targetColumn')}
              </th>
              <th style={{ padding: '6px 12px', border: '1px solid #f0f0f0', textAlign: 'left', fontSize: 12 }}>
                {t('dataImport.skip')}
              </th>
            </tr>
          </thead>
          <tbody>
            {preview.columns.map((col) => (
              <tr key={col}>
                <td style={{ padding: '4px 12px', border: '1px solid #f0f0f0', fontSize: 12 }}>{col}</td>
                <td style={{ padding: '4px 12px', border: '1px solid #f0f0f0', fontSize: 12 }}>
                  <Tag>{preview.detectedTypes[col] || 'TEXT'}</Tag>
                </td>
                <td style={{ padding: '4px 12px', border: '1px solid #f0f0f0', fontSize: 12 }}>
                  <Select
                    size="small"
                    style={{ width: 150 }}
                    value={columnMapping[col] || ''}
                    onChange={(v) => handleMappingChange(col, v)}
                    allowClear
                    placeholder={t('dataImport.selectColumn')}
                    options={preview.columns.map((c) => ({ label: c, value: c }))}
                  />
                </td>
                <td style={{ padding: '4px 12px', border: '1px solid #f0f0f0', textAlign: 'center' }}>
                  <Button
                    size="small"
                    type="text"
                    danger={!columnMapping[col]}
                    onClick={() => {
                      if (columnMapping[col]) {
                        const next = { ...columnMapping }
                        delete next[col]
                        setColumnMapping(next)
                      } else {
                        setColumnMapping((prev) => ({ ...prev, [col]: col }))
                      }
                    }}
                  >
                    {columnMapping[col] ? t('common.yes') : t('common.no')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Data Preview */}
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          {t('dataImport.dataPreview')} ({preview.rows.length} / {preview.totalRows} {t('dataImport.rows')})
        </Typography.Text>
        <div style={{ overflow: 'auto', maxHeight: 300, marginBottom: 16 }}>
          <Table
            dataSource={preview.rows.map((r, i) => ({ ...r, _key: i }))}
            columns={preview.columns.map((col) => ({
              title: col,
              dataIndex: col,
              key: col,
              width: 120,
              ellipsis: true,
              render: (val: unknown) => val === null ? <Typography.Text type="secondary">NULL</Typography.Text> : String(val)
            }))}
            rowKey="_key"
            size="small"
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        </div>

        {/* Target Table */}
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button
              size="small"
              type={createTableMode ? 'default' : 'primary'}
              onClick={() => setCreateTableMode(false)}
            >
              {t('dataImport.existingTable')}
            </Button>
            <Button
              size="small"
              type={createTableMode ? 'primary' : 'default'}
              icon={<TableOutlined />}
              onClick={() => setCreateTableMode(true)}
            >
              {t('dataImport.createTable')}
            </Button>
          </Space>
          <div style={{ marginTop: 8 }}>
            {createTableMode ? (
              <Input
                size="small"
                placeholder={t('dataImport.newTableName')}
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                style={{ width: 200 }}
              />
            ) : (
              <Select
                size="small"
                style={{ width: 200 }}
                value={targetTable || undefined}
                onChange={setTargetTable}
                placeholder={t('dataImport.selectTargetTable')}
                options={tables.map((t) => ({ label: t.name, value: t.name }))}
                showSearch
              />
            )}
          </div>
        </div>

        {/* Import Button */}
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleImport}
          loading={importing}
          disabled={!filePath || (!targetTable && !createTableMode)}
        >
          {t('dataImport.startImport')}
        </Button>

        {/* Progress */}
        {importing && (
          <div style={{ marginTop: 12 }}>
            <Progress percent={importProgress} size="small" />
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ marginTop: 12 }}>
            <Typography.Text>
              {t('dataImport.importResult', { count: result.importedRows })}
            </Typography.Text>
            {result.errors.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Typography.Text type="danger">
                  {t('dataImport.errors', { count: result.errors.length })}
                </Typography.Text>
                {result.errors.slice(0, 5).map((err, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#ff4d4f', marginTop: 2 }}>
                    {t('dataImport.row')} {err.row}: {err.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DataImport
