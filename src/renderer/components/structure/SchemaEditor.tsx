import { useState, useCallback } from 'react'
import { Modal, Form, Input, Select, Switch, InputNumber, Typography, Alert, message } from 'antd'
import { sqlApi } from '../../services/api'
import { useDbType } from '../../hooks/useDbType'
import { quoteId, quoteTable, type DbType } from '../../utils/sql-quote'
import type { ColumnInfo, IndexInfo } from '../../types/database'

// Common SQL column types
const COLUMN_TYPES = [
  'INT', 'BIGINT', 'SMALLINT', 'TINYINT',
  'DECIMAL', 'FLOAT', 'DOUBLE',
  'VARCHAR', 'CHAR', 'TEXT', 'LONGTEXT', 'MEDIUMTEXT',
  'DATE', 'DATETIME', 'TIMESTAMP', 'TIME',
  'BOOLEAN',
  'BLOB', 'LONGBLOB',
  'JSON',
  'ENUM'
]

/** Hook that manages schema editing state and renders dialogs */
export function useSchemaEditor(
  connId: string,
  table: string,
  schema: string | undefined,
  onSuccess: () => void
) {
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
      message.success(`已删除列 "${col.name}"`)
      onSuccess()
    } catch (err) {
      message.error(`删除列失败: ${err instanceof Error ? err.message : '未知错误'}`)
    }
  }, [connId, table, schema, dbType, onSuccess])

  const handleDeleteIndex = useCallback(async (idx: IndexInfo) => {
    // MySQL: DROP INDEX `idx` ON `table`;  Others: DROP INDEX "idx"
    const ddl = dbType === 'mysql'
      ? `DROP INDEX ${quoteId(idx.name, dbType)} ON ${quoteTable(table, schema, dbType)};`
      : `DROP INDEX ${quoteId(idx.name, dbType)};`
    try {
      await sqlApi.execute(connId, ddl)
      message.success(`已删除索引 "${idx.name}"`)
      onSuccess()
    } catch (err) {
      message.error(`删除索引失败: ${err instanceof Error ? err.message : '未知错误'}`)
    }
  }, [connId, table, schema, dbType, onSuccess])

  const executeDdl = useCallback(async (ddl: string) => {
    try {
      await sqlApi.execute(connId, ddl)
      message.success('DDL 执行成功')
      onSuccess()
    } catch (err) {
      message.error(`DDL 执行失败: ${err instanceof Error ? err.message : '未知错误'}`)
      throw err
    }
  }, [connId, onSuccess])

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

interface ColumnFormValues {
  name: string
  type: string
  length?: number
  nullable: boolean
  defaultValue?: string
  comment?: string
}

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
  const [form] = Form.useForm<ColumnFormValues>()
  const [previewDdl, setPreviewDdl] = useState<string | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const generateDDL = (values: ColumnFormValues): string => {
    const typeStr = values.length
      ? `${values.type}(${values.length})`
      : values.type
    const nullable = values.nullable ? '' : ' NOT NULL'
    const defaultVal = values.defaultValue !== undefined && values.defaultValue !== ''
      ? ` DEFAULT ${values.defaultValue}`
      : ''
    const comment = values.comment && dbType === 'mysql' ? ` COMMENT '${values.comment.replace(/'/g, "''")}'` : ''

    if (mode === 'add') {
      return `ALTER TABLE ${quoteTable(table, schema, dbType)} ADD COLUMN ${quoteId(values.name, dbType)} ${typeStr}${nullable}${defaultVal}${comment};`
    }

    // MODIFY COLUMN is MySQL-specific syntax
    if (dbType === 'mysql') {
      return `ALTER TABLE ${quoteTable(table, schema, dbType)} MODIFY COLUMN ${quoteId(values.name, dbType)} ${typeStr}${nullable}${defaultVal}${comment};`
    }

    // PostgreSQL: ALTER COLUMN ... SET DATA TYPE / SET DEFAULT / SET NOT NULL
    if (dbType === 'postgresql') {
      let pgDdl = `ALTER TABLE ${quoteTable(table, schema, dbType)} ALTER COLUMN ${quoteId(values.name, dbType)} SET DATA TYPE ${typeStr};`
      if (!values.nullable) {
        pgDdl += `\nALTER TABLE ${quoteTable(table, schema, dbType)} ALTER COLUMN ${quoteId(values.name, dbType)} SET NOT NULL;`
      }
      if (defaultVal) {
        pgDdl += `\nALTER TABLE ${quoteTable(table, schema, dbType)} ALTER COLUMN ${quoteId(values.name, dbType)} SET DEFAULT ${defaultVal};`
      }
      return pgDdl
    }

    // SQLite / Oracle: ADD COLUMN cannot add NOT NULL column (table must be empty)
    return `ALTER TABLE ${quoteTable(table, schema, dbType)} ADD COLUMN ${quoteId(values.name, dbType)} ${typeStr}${defaultVal};`
  }

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
      const ddl = generateDDL(values)
      setPreviewDdl(ddl)
    } catch {
      // validation error
    }
  }

  return (
    <Modal
      title={mode === 'add' ? '添加列' : `修改列 - ${column?.name}`}
      open={open}
      onOk={handleOk}
      okText={previewDdl ? '执行' : '预览 SQL'}
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
          <Form.Item name="name" label="列名" rules={[{ required: true }]}>
            <Input disabled={mode === 'edit'} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="type" label="类型" rules={[{ required: true }]} style={{ flex: 2 }}>
              <Select showSearch options={COLUMN_TYPES.map((t) => ({ value: t, label: t }))} />
            </Form.Item>
            <Form.Item name="length" label="长度" style={{ flex: 1 }}>
              <InputNumber min={1} placeholder="可选" style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="nullable" label="允许为空" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="defaultValue" label="默认值">
            <Input placeholder="留空表示无默认值" />
          </Form.Item>
          <Form.Item name="comment" label="注释">
            <Input />
          </Form.Item>
        </Form>
      ) : (
        <div>
          <Alert
            message="此操作不可逆，建议先备份"
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            将要执行的 DDL：
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

interface IndexFormValues {
  name: string
  columns: string[]
  unique: boolean
}

export const IndexDialog: React.FC<{
  open: boolean
  table: string
  schema?: string
  dbType: DbType
  availableColumns: string[]
  onClose: () => void
  onConfirm: (ddl: string) => Promise<void>
}> = ({ open, table, schema, dbType, availableColumns, onClose, onConfirm }) => {
  const [form] = Form.useForm<IndexFormValues>()
  const [previewDdl, setPreviewDdl] = useState<string | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const generateDDL = (values: IndexFormValues): string => {
    const unique = values.unique ? 'UNIQUE ' : ''
    const colList = values.columns.map((c) => quoteId(c, dbType)).join(', ')
    return `CREATE ${unique}INDEX ${quoteId(values.name, dbType)} ON ${quoteTable(table, schema, dbType)} (${colList});`
  }

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
      const ddl = generateDDL(values)
      setPreviewDdl(ddl)
    } catch {
      // validation error
    }
  }

  return (
    <Modal
      title="新建索引"
      open={open}
      onOk={handleOk}
      okText={previewDdl ? '执行' : '预览 SQL'}
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
          <Form.Item name="name" label="索引名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="columns" label="包含字段" rules={[{ required: true }]}>
            <Select
              mode="multiple"
              options={availableColumns.map((c) => ({ value: c, label: c }))}
              placeholder="选择一个或多个字段"
            />
          </Form.Item>
          <Form.Item name="unique" label="唯一索引" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      ) : (
        <div>
          <Alert
            message="此操作不可逆，建议先备份"
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            将要执行的 DDL：
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
