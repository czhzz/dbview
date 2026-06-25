import React, { useState, useCallback } from 'react'
import { Button, Space, Typography, Input, Tabs, Tag, Table, Empty } from 'antd'
import { ThunderboltOutlined, BugOutlined, WarningOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { profilingApi } from '../../services/api'
import ExplainTree from './ExplainTree'
import type { UnifiedExplainPlan } from '../../types/database'

interface Props {
  connId: string
  dbType: string
  initialSql?: string
}

const ProfilingPanel: React.FC<Props> = ({ connId, dbType, initialSql }) => {
  const { t } = useTranslation()
  const [sql, setSql] = useState(initialSql || '')
  const [plan, setPlan] = useState<UnifiedExplainPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('explain')
  const [slowQueries, setSlowQueries] = useState<{ sql: string; duration: number; timestamp: number }[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])

  const handleExplain = useCallback(async () => {
    if (!sql.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await profilingApi.explain(connId, sql)
      setPlan(result)
      // Generate index suggestions
      const suggestions = generateIndexSuggestions(result)
      setSuggestions(suggestions)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPlan(null)
    } finally {
      setLoading(false)
    }
  }, [connId, sql])

  const handleAnalyzeSlow = useCallback(async () => {
    try {
      const queries = await profilingApi.analyzeSlowQueries(connId)
      setSlowQueries(queries)
      setActiveTab('slow')
    } catch {
      // Silently fail
    }
  }, [connId])

  const slowColumns = [
    { title: t('profiling.sql'), dataIndex: 'sql', key: 'sql', ellipsis: true, render: (v: string) => <Typography.Text code style={{ fontSize: 11 }}>{v}</Typography.Text> },
    { title: t('profiling.duration'), dataIndex: 'duration', key: 'duration', width: 100, render: (v: number) => <Tag color={v > 5000 ? 'red' : v > 1000 ? 'orange' : 'green'}>{v}ms</Tag> },
    { title: t('profiling.timestamp'), dataIndex: 'timestamp', key: 'timestamp', width: 160, render: (v: number) => new Date(v).toLocaleString() }
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Typography.Text strong style={{ fontSize: 13 }}>
          <BugOutlined style={{ marginRight: 4 }} />
          {t('profiling.title')}
        </Typography.Text>
        <div style={{ flex: 1 }} />
        <Button size="small" onClick={handleAnalyzeSlow} icon={<WarningOutlined />}>
          {t('profiling.analyzeSlow')}
        </Button>
      </div>

      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Input.TextArea
          rows={2}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder={t('profiling.enterSql')}
          style={{ fontSize: 12, fontFamily: 'Consolas, monospace' }}
        />
        <div style={{ marginTop: 6 }}>
          <Button
            type="primary"
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={handleExplain}
            loading={loading}
          >
            {t('profiling.explain')}
          </Button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Tabs
          size="small"
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarStyle={{ margin: 0, paddingLeft: 8 }}
          items={[
            {
              key: 'explain',
              label: t('profiling.executionPlan'),
              children: <ExplainTree plan={plan} loading={loading} error={error} />
            },
            {
              key: 'suggestions',
              label: (
                <span>
                  {t('profiling.suggestions')}
                  {suggestions.length > 0 && <Tag style={{ marginLeft: 4 }}>{suggestions.length}</Tag>}
                </span>
              ),
              children: (
                <div style={{ padding: 12, overflow: 'auto', height: '100%' }}>
                  {suggestions.length === 0 ? (
                    <Empty description={t('profiling.noSuggestions')} />
                  ) : (
                    suggestions.map((s, i) => (
                      <div key={i} style={{ padding: '8px 12px', marginBottom: 8, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4 }}>
                        <Typography.Text style={{ fontSize: 12 }}>{s}</Typography.Text>
                      </div>
                    ))
                  )}
                </div>
              )
            },
            {
              key: 'slow',
              label: t('profiling.slowQueries'),
              children: (
                <div style={{ overflow: 'auto', height: '100%' }}>
                  <Table
                    dataSource={slowQueries.map((q, i) => ({ ...q, key: i }))}
                    columns={slowColumns}
                    size="small"
                    pagination={false}
                  />
                </div>
              )
            }
          ]}
        />
      </div>
    </div>
  )
}

function generateIndexSuggestions(plan: UnifiedExplainPlan): string[] {
  const suggestions: string[] = []

  function walk(node: UnifiedExplainPlan) {
    // Detect Seq Scan with filter conditions
    if (node.nodeType === 'scan' && node.operation.includes('Seq Scan')) {
      const details = node.details || {}
      const filter = details.filter || details.extra || ''
      if (filter) {
        suggestions.push(`检测到全表扫描 (Seq Scan)${node.operation.includes('(') ? ` on ${node.operation.match(/\((.+?)\)/)?.[1] || ''}` : ''}，有过滤条件 "${filter}"。建议为相关列创建索引以提高查询性能。`)
      }
    }
    for (const child of node.children || []) {
      walk(child)
    }
  }

  walk(plan)
  return suggestions
}

export default ProfilingPanel
