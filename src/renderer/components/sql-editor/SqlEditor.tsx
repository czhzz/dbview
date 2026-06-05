import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Button, Space, Typography, Table, Tabs, message } from 'antd'
import {
  PlaySquareOutlined,
  ReloadOutlined,
  DeleteOutlined,
  StopOutlined
} from '@ant-design/icons'
import { EditorView, basicSetup } from 'codemirror'
import { sql, MySQL } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { keymap } from '@codemirror/view'
import { sqlApi } from '../../services/api'
import { useUIStore } from '../../stores/uiStore'
import type { SQLResult } from '../../types/database'

interface Props {
  connId: string
  initialSql?: string
  tabId: string
}

const SqlEditor: React.FC<Props> = ({ connId, initialSql, tabId }) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [results, setResults] = useState<SQLResult[]>([])
  const [running, setRunning] = useState(false)
  const [activeQueryId, setActiveQueryId] = useState<string | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('results')
  const { setStatusText } = useUIStore()

  useEffect(() => {
    if (!editorRef.current) return

    if (viewRef.current) {
      viewRef.current.destroy()
    }

    const executeCallback = async () => {
      if (viewRef.current) {
        const sql = viewRef.current.state.doc.toString()
        await handleExecute(sql)
      }
    }

    viewRef.current = new EditorView({
      doc: initialSql || '',
      extensions: [
        basicSetup,
        sql({ dialect: MySQL }),
        oneDark,
        keymap.of([
          {
            key: 'Ctrl-Enter',
            run: () => {
              executeCallback()
              return true
            }
          }
        ]),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto', fontFamily: "'Cascadia Code', 'Fira Code', monospace" },
          '.cm-content': { fontSize: '13px', lineHeight: '1.6', padding: '8px 0' },
          '.cm-gutters': { fontSize: '11px' }
        })
      ],
      parent: editorRef.current
    })

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
    }
  }, [tabId])

  const getCurrentSql = useCallback((): string => {
    return viewRef.current?.state.doc.toString() || ''
  }, [])

  const handleExecute = useCallback(async (sqlText?: string) => {
    const sql = sqlText || getCurrentSql()
    if (!sql.trim()) {
      message.warning('请输入 SQL 语句')
      return
    }

    setRunning(true)
    let queryId: string | undefined
    try {
      queryId = await sqlApi.registerQuery(connId)
      setActiveQueryId(queryId)
      const result = await sqlApi.execute(connId, sql, queryId)
      setResults((prev) => [result, ...prev])
      setActiveResultTab('results')
      setStatusText(
        result.message ||
          `查询完成 | ${result.rows.length} 行 | ${result.executionTime}ms`
      )
    } catch (err) {
      if (err instanceof Error && err.message === '查询已取消') {
        setStatusText('查询已取消')
      } else {
        message.error(`执行失败: ${err instanceof Error ? err.message : '未知错误'}`)
        setStatusText(`执行失败: ${err instanceof Error ? err.message : '未知错误'}`)
      }
    } finally {
      setRunning(false)
      setActiveQueryId(null)
    }
  }, [connId, getCurrentSql, setStatusText])

  const handleCancel = useCallback(async () => {
    if (activeQueryId) {
      await sqlApi.cancel(connId, activeQueryId)
      setActiveQueryId(null)
      setRunning(false)
      setStatusText('查询已取消')
    }
  }, [connId, activeQueryId, setStatusText])

  const clearResults = () => {
    setResults([])
    setActiveResultTab('results')
  }

  const renderResultTable = (result: SQLResult) => {
    const cols = result.columns.map((col) => ({
      title: col,
      dataIndex: col,
      key: col,
      ellipsis: true,
      width: 150,
      render: (val: unknown) => {
        if (val === null) return <Typography.Text type="secondary">NULL</Typography.Text>
        return String(val)
      }
    }))

    return (
      <div key={`result-${result.executionTime}-${Math.random()}`} style={{ flex: 1, overflow: 'auto' }}>
        {result.columns.length > 0 ? (
          <Table
            className="result-table"
            columns={cols}
            dataSource={result.rows.map((row, i) => ({ ...row, _key: i }))}
            rowKey="_key"
            size="small"
            scroll={{ x: 'max-content', y: 'calc(100vh - 420px)' }}
            pagination={{
              showSizeChanger: true,
              pageSizeOptions: [50, 100, 200],
              showTotal: (total) => `共 ${total} 行`,
              defaultPageSize: 100
            }}
            sticky
          />
        ) : (
          <div style={{ padding: 16, color: '#999' }}>
            {result.message || `影响行数: ${result.affectedRows}`}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="tab-content">
      {/* Editor toolbar */}
      <div
        style={{
          padding: '6px 12px',
          borderBottom: '1px solid #333',
          background: '#1e1e1e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Space>
          <Button
            type="primary"
            icon={<PlaySquareOutlined />}
            onClick={() => handleExecute()}
            loading={running}
            size="small"
          >
            执行 (Ctrl+Enter)
          </Button>
          {running && (
            <Button
              danger
              icon={<StopOutlined />}
              onClick={handleCancel}
              size="small"
            >
              取消
            </Button>
          )}
          <Button
            icon={<DeleteOutlined />}
            onClick={clearResults}
            disabled={results.length === 0}
            size="small"
          >
            清除结果
          </Button>
        </Space>
        <Typography.Text
          type="secondary"
          style={{ fontSize: 11, fontFamily: 'monospace' }}
        >
          MySQL
        </Typography.Text>
      </div>

      {/* CodeMirror editor */}
      <div style={{ height: 200, borderBottom: '1px solid #333' }} ref={editorRef} />

      {/* Results */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Tabs
          activeKey={activeResultTab}
          onChange={setActiveResultTab}
          size="small"
          style={{ marginBottom: 0 }}
          tabBarStyle={{ marginBottom: 0, paddingLeft: 12 }}
          items={[
            {
              key: 'results',
              label: `结果 (${results.length})`,
              children: (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {results.length > 0 ? (
                    renderResultTable(results[0])
                  ) : (
                    <div
                      style={{
                        padding: 32,
                        textAlign: 'center',
                        color: '#999'
                      }}
                    >
                      执行 SQL 查看结果
                    </div>
                  )}
                </div>
              )
            },
            {
              key: 'history',
              label: '执行记录',
              children: (
                <div style={{ padding: 12, maxHeight: 300, overflow: 'auto' }}>
                  {results.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '6px 0',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                      onClick={() => setActiveResultTab('results')}
                    >
                      <Typography.Text code>
                        [{r.executionTime}ms]
                      </Typography.Text>{' '}
                      {r.message || `${r.rows.length} 行`}
                    </div>
                  ))}
                  {results.length === 0 && (
                    <Typography.Text type="secondary">暂无执行记录</Typography.Text>
                  )}
                </div>
              )
            }
          ]}
        />
      </div>
    </div>
  )
}

export default SqlEditor