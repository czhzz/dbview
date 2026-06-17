import { useState, useCallback } from 'react'
import { Modal, Form, Input, Select, Switch, InputNumber, Typography, Alert, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { sqlApi } from '../../services/api'
import { useDbType } from '../../hooks/useDbType'
import { quoteId, quoteTable, type DbType } from '../../utils/sql-quote'
import {
  generateColumnDDL,
  generateIndexDDL,
  type ColumnFormValues,
  type IndexFormValues
} from '../../utils/ddl-generator'
import type { ColumnInfo, IndexInfo } from '../../types/database'

// Common SQL column types — per database engine
const COLUMN_TYPES_BY_DB: Record<string, string[]> = {
  mysql: [
    'INT', 'BIGINT', 'SMALLINT', 'TINYINT',
    'DECIMAL', 'FLOAT', 'DOUBLE',
    'VARCHAR', 'CHAR', 'TEXT', 'LONGTEXT', 'MEDIUMTEXT',
    'DATE', 'DATETIME', 'TIMESTAMP', 'TIME',
    'BOOLEAN',
    'BLOB', 'LONGBLOB',
    'JSON',
    'ENUM'
  ],
  postgresql: [
    'INT', 'BIGINT', 'SMALLINT',
    'DECIMAL', 'FLOAT', 'DOUBLE',
    'VARCHAR', 'CHAR', 'TEXT',
    'DATE', 'TIMESTAMP', 'TIMESTAMPTZ', 'TIME',
    'BOOLEAN',
    'BYTEA',
    'JSON', 'JSONB',
    'UUID',
    'SERIAL', 'BIGSERIAL'
  ],
  oracle: [
    'INT', 'BIGINT', 'SMALLINT',
    'DECIMAL', 'FLOAT', 'DOUBLE',
    'VARCHAR2', 'NVARCHAR2', 'CHAR', 'NCHAR', 'CLOB', 'NCLOB',
    'DATE', 'TIMESTAMP',
    'BLOB', 'RAW',
    'NUMBER'
  ],
  sqlite: [
    'INT', 'BIGINT', 'SMALLINT', 'TINYINT',
    'DECIMAL', 'FLOAT', 'DOUBLE',
    'VARCHAR', 'CHAR', 'TEXT',
    'DATE', 'DATETIME', 'TIMESTAMP', 'TIME',
    'BOOLEAN',
    'BLOB',
    'JSON'
  ]
}

/** Hook that manages schema editing state and renders dialogs */
export function useSchemaEditor(
  connId: string,
  table: string,
  schema: string | undefined,
  onSuccess: () => void
) {
  const { t } = useTranslation()

  const [colDialogOpen, setColDialogOpen] = useState(false)
  const [colDialogMode, setColDialogMode] = useState<'add' | 'edit'>('add')
  const [editingColumn, setEditingColumn] = useState<ColumnInfo | undefined>()
  const [indexDialogOpen, setIndexDialogOpen] = useState(false)

  const handleAddColumn = useCallback(() => {
    setColDialogMode('add')
    setEditingColumn(undefined)
    setColDialogOpen(true)
  }, [])

  const handleEditColumn = useCallback((col: ColumnInfo) => {
    setColDialogMode('edit')
    setEditingColumn(col)
    setColDialogOpen(true)
  }, [])

  const dbType = useDbType(connId)

  const handleDeleteColumn = useCallback(async (col: ColumnInfo) => {
    const ddl = `ALTER TABLE ${quoteTable(table, schema, dbType)} DROP COLUMN ${quoteId(col.name, dbType)};`
    try {
      await sqlApi.execute(connId, ddl)
      message.success(t('structure.deleteColumnSuccess', { name: col.name }))
      onSuccess()
    } catch (err) {
      message.error(t('structure.deleteColumnError', { message: err instanceof Error ? err.message : t('common.unknownError') }))
    }
  }, [connId, table, schema, dbType, onSuccess, t])

  const handleDeleteIndex = useCallback(async (idx: IndexInfo) => {
    // MySQL: DROP INDEX `idx` ON `table`;  Others: DROP INDEX "idx"
    const ddl = dbType === 'mysql'
      ? `DROP INDEX ${quoteId(idx.name, dbType)} ON ${quoteTable(table, schema, dbType)};`
      : `DROP INDEX ${quoteId(idx.name, dbType)};`
    try {
      await sqlApi.execute(connId, ddl)
      message.success(t('structure.deleteIndexSuccess', { name: idx.name }))
      onSuccess()
    } catch (err) {
      message.error(t('structure.deleteIndexError', { message: err instanceof Error ? err.message : t('common.unknownError') }))
    }
  }, [connId, table, schema, dbType, onSuccess, t])

  const executeDdl = useCallback(async (ddl: string) => {
    try {
      await sqlApi.execute(connId, ddl)
      message.success(t('structure.executeSuccess'))
      onSuccess()
    } catch (err) {
      message.error(t('structure.executeFailed', { message: err instanceof Error ? err.message : t('common.unknownError') }))
      throw err
    }
  }, [connId, onSuccess, t])

  return {
    colDialogOpen,
    colDialogMode,
    editingColumn,
    indexDialogOpen,
    handleAddColumn,
    handleEditColumn,
    handleDeleteColumn,
    handleAddIndex: useCallback(() => setIndexDialogOpen(true), []),
    handleDeleteIndex,
    setColDialogOpen,
    setIndexDialogOpen,
    executeDdl
  }
}

// ---- Column Dialog ----

export const ColumnDialog: React.FC<{
  open: boolean
  mode: 'add' | 'edit'
  table: string
  schema?: string
  dbType: DbType
  column?: ColumnInfo
  onClose: () => void
  onConfirm: (ddl: string) => Promise<void>
}> = ({ open, mode, table, schema, dbType, column, onClose, onConfirm }) => {
  const { t } = useTranslation()
  const [form] = Form.useForm<ColumnFormValues>()
  const [previewDdl, setPreviewDdl] = useState<string | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const handleOk = async () => {
    if (previewDdl) {
      setConfirmLoading(true)
      try {
        await onConfirm(previewDdl)
      } finally {
        setConfirmLoading(false)
        setPreviewDdl(null)
      }
      onClose()
      return
    }

    try {
      const values = await form.validateFields()
      const ddl = generateColumnDDL(values, mode, table, schema, dbType)
      setPreviewDdl(ddl)
    } catch {
      // validation error
    }
  }

  return (
    <Modal
      title={mode === 'add' ? t('structure.addColumn') : t('structure.editColumn') + (column ? ` - ${column.name}` : '')}
      open={open}
      onOk={handleOk}
      okText={previewDdl ? t('structure.execute') : t('structure.previewSql')}
      onCancel={() => { setPreviewDdl(null); onClose() }}
      confirmLoading={confirmLoading}
      width={520}
      destroyOnClose
    >
      {!previewDdl ? (
        <Form
          form={form}
          layout="vertical"
          initialValues={
            mode === 'edit' && column
              ? {
                  name: column.name,
                  type: column.type.replace(/\(.+\)/, ''),
                  length: column.maxLength,
                  nullable: column.nullable,
                  defaultValue: column.defaultValue || '',
                  comment: column.comment
                }
              : { nullable: true }
          }
        >
          <Form.Item name="name" label={t('structure.columnName')} rules={[{ required: true }]}>
            <Input disabled={mode === 'edit'} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="type" label={t('structure.columnType')} rules={[{ required: true }]} style={{ flex: 2 }}>
              <Select showSearch options={COLUMN_TYPES_BY_DB[dbType]?.map((tp) => ({ value: tp, label: tp })) ?? []} />
            </Form.Item>
            <Form.Item name="length" label={t('structure.columnLength')} style={{ flex: 1 }}>
              <InputNumber min={1} placeholder={t('structure.optional')} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="nullable" label={t('structure.nullable')} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="defaultValue" label={t('structure.defaultValue')}>
            <Input placeholder={t('structure.defaultValuePlaceholder')} />
          </Form.Item>
          <Form.Item name="comment" label={t('structure.comment')}>
            <Input />
          </Form.Item>
        </Form>
      ) : (
        <div>
          <Alert
            message={t('structure.irreversibleBackup')}
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('structure.ddlToExecute')}
          </Typography.Text>
          <pre
            style={{
              background: '#f5f5f5',
              padding: 12,
              borderRadius: 4,
              fontSize: 13,
              marginTop: 8,
              overflow: 'auto'
            }}
          >
            {previewDdl}
          </pre>
        </div>
      )}
    </Modal>
  )
}

// ---- Index Dialog ----

export const IndexDialog: React.FC<{
  open: boolean
  table: string
  schema?: string
  dbType: DbType
  availableColumns: string[]
  onClose: () => void
  onConfirm: (ddl: string) => Promise<void>
}> = ({ open, table, schema, dbType, availableColumns, onClose, onConfirm }) => {
  const { t } = useTranslation()
  const [form] = Form.useForm<IndexFormValues>()
  const [previewDdl, setPreviewDdl] = useState<string | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const handleOk = async () => {
    if (previewDdl) {
      setConfirmLoading(true)
      try {
        await onConfirm(previewDdl)
      } finally {
        setConfirmLoading(false)
        setPreviewDdl(null)
      }
      onClose()
      return
    }

    try {
      const values = await form.validateFields()
      const ddl = generateIndexDDL(values, table, schema, dbType)
      setPreviewDdl(ddl)
    } catch {
      // validation error
    }
  }

  return (
    <Modal
      title={t('structure.addIndex')}
      open={open}
      onOk={handleOk}
      okText={previewDdl ? t('structure.execute') : t('structure.previewSql')}
      onCancel={() => { setPreviewDdl(null); onClose() }}
      confirmLoading={confirmLoading}
      width={480}
      destroyOnClose
    >
      {!previewDdl ? (
        <Form
          form={form}
          layout="vertical"
          initialValues={{ unique: false }}
        >
          <Form.Item name="name" label={t('structure.indexName')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="columns" label={t('structure.indexColumns')} rules={[{ required: true }]}>
            <Select
              mode="multiple"
              options={availableColumns.map((c) => ({ value: c, label: c }))}
              placeholder={t('structure.selectColumns')}
            />
          </Form.Item>
          <Form.Item name="unique" label={t('structure.uniqueIndex')} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      ) : (
        <div>
          <Alert
            message={t('structure.irreversibleBackup')}
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('structure.ddlToExecute')}
          </Typography.Text>
          <pre
            style={{
              background: '#f5f5f5',
              padding: 12,
              borderRadius: 4,
              fontSize: 13,
              marginTop: 8,
              overflow: 'auto'
            }}
          >
            {previewDdl}
          </pre>
        </div>
      )}
    </Modal>
  )
}
