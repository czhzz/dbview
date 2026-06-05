import React, { useState, useEffect, useCallback } from 'react'
import { Table, Button, Space, Typography, Spin } from 'antd'
import { ReloadOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { dataApi } from '../../services/api'
import { useUIStore } from '../../stores/uiStore'
import type { PaginationResult } from '../../types/database'

interface Props {
  connId: string
  table: string
  schema?: string
}

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500]

const DataTable: React.FC<Props> = ({ connId, table, schema }) => {
  const [data, setData] = useState<PaginationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [sortColumn, setSortColumn] = useState<string | undefined>()
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC')
  const { setStatusText } = useUIStore()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await dataApi.query(connId, {
        table,
        schema,
        page,
        pageSize,
        orderBy: sortColumn ? { column: sortColumn, direction: sortDirection } : undefined
      })
      setData(result)
      setStatusText(`表: ${table} | ${result.total} 行 | ${result.executionTime}ms`)
    } catch (err) {
      setStatusText(`查询失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }, [connId, table, schema, page, pageSize, sortColumn, sortDirection, setStatusText])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'ASC') {
        setSortDirection('DESC')
      } else {
        setSortColumn(undefined)
        setSortDirection('ASC')
      }
    } else {
      setSortColumn(column)
      setSortDirection('ASC')
    }
    setPage(1)
  }

  const columns = (data?.columns || []).map((col) => ({
    title: (
      <span
        onClick={() => handleSort(col)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        {col}
        {sortColumn === col && (
          <span style={{ marginLeft: 4 }}>
            {sortDirection === 'ASC' ? (
              <ArrowUpOutlined style={{ fontSize: 10 }} />
            ) : (
              <ArrowDownOutlined style={{ fontSize: 10 }} />
            )}
          </span>
        )}
      </span>
    ),
    dataIndex: col,
    key: col,
    ellipsis: true,
    width: 150,
    render: (val: unknown) => {
      if (val === null) return <Typography.Text type="secondary">NULL</Typography.Text>
      if (val instanceof Date) return val.toLocaleString()
      return String(val)
    }
  }))

  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="tab-content" style={{ padding: '0' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData} size="small">
            刷新
          </Button>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            共 {data.total} 行 | {data.executionTime}ms
          </Typography.Text>
        </Space>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Table
          className="result-table"
          columns={columns}
          dataSource={data.rows.map((row, i) => ({ ...row, _key: i }))}
          rowKey="_key"
          loading={loading}
          size="small"
          scroll={{ x: 'max-content', y: 'calc(100vh - 240px)' }}
          pagination={{
            current: page,
            pageSize,
            total: data.total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: (total) => `共 ${total} 行`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            }
          }}
          sticky
          virtual
        />
      </div>
    </div>
  )
}

export default DataTable