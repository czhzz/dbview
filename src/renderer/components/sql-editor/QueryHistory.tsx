import React, { useEffect, useState, useCallback } from 'react'
import { Input, List, Typography, Space, Button, Popconfirm, Empty } from 'antd'
import { SearchOutlined, DeleteOutlined, CloseOutlined, ClearOutlined } from '@ant-design/icons'
import { historyApi } from '../../services/api'
import type { HistoryEntry } from '../../../preload/types'

interface Props {
  connId: string
  onLoadSql: (sql: string) => void
  onClose: () => void
}

const DB_TYPE_LABELS: Record<string, string> = {
  mysql: 'MySQL',
  postgresql: 'PostgreSQL',
  sqlite: 'SQLite',
  oracle: 'Oracle'
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function truncateSql(sql: string, maxLen = 80): string {
  const oneLine = sql.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
  return oneLine.length > maxLen ? oneLine.slice(0, maxLen) + '...' : oneLine
}

const QueryHistory: React.FC<Props> = ({ connId, onLoadSql, onClose }) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const list = await historyApi.list(connId, search || undefined)
      setEntries(list)
    } catch {
      // Silently fail — history is non-critical
    } finally {
      setLoading(false)
    }
  }, [connId, search])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleDelete = useCallback(async (id: number) => {
    await historyApi.delete(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const handleClearAll = useCallback(async () => {
    await historyApi.clear(connId)
    setEntries([])
  }, [connId])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '6px 12px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fafafa'
        }}
      >
        <Space>
          <Typography.Text strong style={{ fontSize: 13 }}>
            查询历史
          </Typography.Text>
          <Input
            size="small"
            placeholder="搜索 SQL..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
        </Space>
        <Space>
          <Popconfirm
            title="确定清空所有历史记录？"
            onConfirm={handleClearAll}
            okText="确定"
            cancelText="取消"
          >
            <Button icon={<ClearOutlined />} size="small" danger>
              清空
            </Button>
          </Popconfirm>
          <Button icon={<CloseOutlined />} size="small" onClick={onClose}>
            关闭
          </Button>
        </Space>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {entries.length === 0 ? (
          <Empty
            description={search ? '没有匹配的记录' : '暂无查询历史'}
            style={{ marginTop: 40 }}
          />
        ) : (
          <List
            loading={loading}
            dataSource={entries}
            size="small"
            renderItem={(entry) => (
              <List.Item
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f5f5f5'
                }}
                onClick={() => onLoadSql(entry.sql)}
              >
                <div style={{ width: '100%' }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontFamily: 'monospace',
                      color: '#333',
                      marginBottom: 4,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={entry.sql}
                  >
                    {truncateSql(entry.sql)}
                  </div>
                  <Space size={8} style={{ fontSize: 11, color: '#999' }}>
                    <span>{formatTime(entry.executedAt)}</span>
                    <span>{DB_TYPE_LABELS[entry.connType] || entry.connType}</span>
                    <span>{entry.executionTime}ms</span>
                    <span>{entry.rowCount} 行</span>
                    <Popconfirm
                      title="删除此条记录？"
                      onConfirm={(e) => {
                        e?.stopPropagation()
                        handleDelete(entry.id)
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                      okText="确定"
                      cancelText="取消"
                    >
                      <DeleteOutlined
                        style={{ color: '#ff4d4f', fontSize: 11 }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </Space>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  )
}

export default QueryHistory
