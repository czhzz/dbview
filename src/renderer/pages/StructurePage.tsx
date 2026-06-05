import React, { useEffect, useState } from 'react'
import { Tabs, Typography, Space } from 'antd'
import { TableOutlined } from '@ant-design/icons'
import { databaseApi } from '../services/api'
import ColumnList from '../components/structure/ColumnList'
import IndexList from '../components/structure/IndexList'
import DDLViewer from '../components/structure/DDLViewer'
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

  useEffect(() => {
    loadStructure()
  }, [connId, table, schema])

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

  return (
    <div className="tab-content">
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Space>
          <TableOutlined />
          <Typography.Text strong>{schema ? `${schema}.` : ''}{table}</Typography.Text>
          <Typography.Text type="secondary">表结构</Typography.Text>
        </Space>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <Tabs
          defaultActiveKey="columns"
          items={[
            {
              key: 'columns',
              label: `字段 (${columns.length})`,
              children: <ColumnList columns={columns} loading={loading} />
            },
            {
              key: 'indexes',
              label: `索引 (${indexes.length})`,
              children: <IndexList indexes={indexes} loading={loading} />
            },
            {
              key: 'ddl',
              label: 'DDL',
              children: <DDLViewer ddl={ddl} loading={loading} />
            }
          ]}
        />
      </div>
    </div>
  )
}

export default StructurePage