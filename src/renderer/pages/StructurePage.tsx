import React, { useEffect, useState } from 'react'
import { Tabs, Typography, Space, Button } from 'antd'
import { TableOutlined, EditOutlined } from '@ant-design/icons'
import { databaseApi } from '../services/api'
import ColumnList from '../components/structure/ColumnList'
import IndexList from '../components/structure/IndexList'
import DDLViewer from '../components/structure/DDLViewer'
import { useSchemaEditor, ColumnDialog, IndexDialog } from '../components/structure/SchemaEditor'
import type { ColumnInfo, IndexInfo } from '../types/database'

interface Props {
  connId: string
  table: string
  schema?: string
}

const StructurePage: React.FC<Props> = ({ connId, table, schema }) => {
  const [columns, setColumns] = useState<ColumnInfo[]>([])
  const [indexes, setIndexes] = useState<IndexInfo[]>([])
  const [ddl, setDdl] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  const loadStructure = async () => {
    setLoading(true)
    try {
      const [cols, idxs, ddlText] = await Promise.all([
        databaseApi.getColumns(connId, table, schema),
        databaseApi.getIndexes(connId, table, schema),
        databaseApi.getDDL(connId, table, schema)
      ])
      setColumns(cols)
      setIndexes(idxs)
      setDdl(ddlText)
    } catch (err) {
      console.error('Failed to load structure:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStructure()
  }, [connId, table, schema])

  const editor = useSchemaEditor(connId, table, schema, loadStructure)

  return (
    <div className="tab-content">
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Space>
          <TableOutlined />
          <Typography.Text strong>{schema ? `${schema}.` : ''}{table}</Typography.Text>
          <Typography.Text type="secondary">表结构</Typography.Text>
          {!editing ? (
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => setEditing(true)}
            >
              编辑
            </Button>
          ) : (
            <Button size="small" onClick={() => setEditing(false)}>
              退出编辑
            </Button>
          )}
        </Space>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <Tabs
          defaultActiveKey="columns"
          items={[
            {
              key: 'columns',
              label: `字段 (${columns.length})`,
              children: (
                <div>
                  {editing && (
                    <div style={{ marginBottom: 12 }}>
                      <Button
                        size="small"
                        onClick={editor.handleAddColumn}
                      >
                        + 添加列
                      </Button>
                    </div>
                  )}
                  <ColumnList
                    columns={columns}
                    loading={loading}
                    editable={editing}
                    onEdit={editor.handleEditColumn}
                    onDelete={editor.handleDeleteColumn}
                  />
                </div>
              )
            },
            {
              key: 'indexes',
              label: `索引 (${indexes.length})`,
              children: (
                <IndexList
                  indexes={indexes}
                  columns={columns.map((c) => c.name)}
                  loading={loading}
                  editable={editing}
                  onAdd={editor.handleAddIndex}
                  onDelete={editor.handleDeleteIndex}
                />
              )
            },
            {
              key: 'ddl',
              label: 'DDL',
              children: <DDLViewer ddl={ddl} loading={loading} />
            }
          ]}
        />
      </div>

      {/* Edit dialogs */}
      <ColumnDialog
        open={editor.colDialogOpen}
        mode={editor.colDialogMode}
        table={table}
        column={editor.editingColumn}
        onClose={() => editor.setColDialogOpen(false)}
        onConfirm={editor.executeDdl}
      />
      <IndexDialog
        open={editor.indexDialogOpen}
        table={table}
        availableColumns={columns.map((c) => c.name)}
        onClose={() => editor.setIndexDialogOpen(false)}
        onConfirm={editor.executeDdl}
      />
    </div>
  )
}

export default StructurePage
