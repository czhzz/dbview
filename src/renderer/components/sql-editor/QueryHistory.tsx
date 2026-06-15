import React, { useEffect, useState, useCallback } from 'react'
import { Input, List, Typography, Space, Button, Popconfirm, Empty } from 'antd'
import { SearchOutlined, DeleteOutlined, CloseOutlined, ClearOutlined } from '@ant-design/icons'
import { historyApi } from '../../services/api'
import type { HistoryEntry } from '../../../preload/types'
import { useTranslation } from 'react-i18next'

interface Props {
  connId: string
  onLoadSql: (sql: string) => void
  onClose: () => void
}

const PAGE_SIZE = 50

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
  const { t } = useTranslation()
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState(0)
  const pageRef = useRef(0)

  const loadHistory = useCallback(async (page: number) => {
    if (page === 0) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    try {
      const result = await historyApi.list(connId, search || undefined, PAGE_SIZE, page * PAGE_SIZE)
      if (page === 0) {
        setEntries(result.items)
      } else {
        setEntries((prev) => [...prev, ...result.items])
      }
      setTotal(result.total)
      pageRef.current = page
    } catch {
      // Silently fail — history is non-critical
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [connId, search])

  useEffect(() => {
    pageRef.current = 0
    loadHistory(0)
  }, [loadHistory])

  const handleLoadMore = useCallback(() => {
    loadHistory(pageRef.current + 1)
  }, [loadHistory])

  const handleDelete = useCallback(async (id: number) => {
    await historyApi.delete(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setTotal((prev) => prev - 1)
  }, [])

  const handleClearAll = useCallback(async () => {
    await historyApi.clear(connId)
    setEntries([])
    setTotal(0)
    pageRef.current = 0
  }, [connId])

  const hasMore = entries.length < total

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
            {t('queryHistory.title')}
          </Typography.Text>
          <Input
            size="small"
            placeholder={t('queryHistory.search')}
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              pageRef.current = 0
            }}
            style={{ width: 200 }}
            allowClear
          />
        </Space>
        <Space>
          <Popconfirm
            title={t('queryHistory.clearConfirm')}
            onConfirm={handleClearAll}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
          >
            <Button icon={<ClearOutlined />} size="small" danger>
              {t('queryHistory.clearAll')}
            </Button>
          </Popconfirm>
          <Button icon={<CloseOutlined />} size="small" onClick={onClose}>
            {t('queryHistory.close')}
          </Button>
        </Space>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {entries.length === 0 ? (
          <Empty
            description={search ? t('queryHistory.emptySearch') : t('queryHistory.empty')}
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
                      title={t('queryHistory.deleteConfirm')}
                      onConfirm={(e) => {
                        e?.stopPropagation()
                        handleDelete(entry.id)
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                      okText={t('common.confirm')}
                      cancelText={t('common.cancel')}
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
          >
            {/* Summary + Load more footer */}
            <div style={{ textAlign: 'center', padding: '8px 12px', borderTop: '1px solid #f0f0f0' }}>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: hasMore ? 8 : 0 }}>
                {t('queryHistory.loadedSummary', { total, loaded: entries.length })}
              </Typography.Text>
              {hasMore && (
                <Button
                  size="small"
                  type="default"
                  loading={loadingMore}
                  onClick={handleLoadMore}
                >
                  {t('queryHistory.loadMore')}
                </Button>
              )}
            </div>
          </List>
        )}
      </div>
    </div>
  )
}

export default QueryHistory
