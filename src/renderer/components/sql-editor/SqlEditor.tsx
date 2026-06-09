import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Button, Space, Typography, Table, Tabs, message } from 'antd'
import {
  PlaySquareOutlined,
  DeleteOutlined,
  StopOutlined,
  FormatPainterOutlined,
  HistoryOutlined
} from '@ant-design/icons'
import { EditorView, basicSetup } from 'codemirror'
import { sql, MySQL, PostgreSQL } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { keymap } from '@codemirror/view'
import { format as sqlFormat, type SqlLanguage } from 'sql-formatter'
import { sqlApi, historyApi } from '../../services/api'
import { useUIStore } from '../../stores/uiStore'
import { useConnectionStore } from '../../stores/connectionStore'
import { useTheme } from '../../hooks/useTheme'
import DataExport from '../data-table/DataExport'
import QueryHistory from './QueryHistory'
import type { SQLResult } from '../../types/database'

interface Props {
  connId: string
  initialSql?: string
  tabId: string
}

/** Map db type to sql-formatter language */
function getFormatterLanguage(dbType: string): SqlLanguage {
  switch (dbType) {
    case 'postgresql':
      return 'postgresql'
    case 'oracle':
      return 'plsql'
    case 'sqlite':
      return 'sqlite'
    case 'mysql':
    default:
      return 'mysql'
  }
}

/** Map db type to CodeMirror SQL dialect */
function getCMDialect(dbType: string) {
  switch (dbType) {
    case 'postgresql':
      return PostgreSQL
    default:
      return MySQL
  }
}

const DB_TYPE_LABELS: Record<string, string> = {
  mysql: 'MySQL',
  postgresql: 'PostgreSQL',
  sqlite: 'SQLite',
  oracle: 'Oracle'
}

const SqlEditor: React.FC<Props> = ({ connId, initialSql, tabId }) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [results, setResults] = useState<SQLResult[]>([])
  const [running, setRunning] = useState(false)
  const [activeQueryId, setActiveQueryId] = useState<string | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('results')
  const [historyVisible, setHistoryVisible] = useState(false)
  const { setStatusText } = useUIStore()
  const connections = useConnectionStore((s) => s.connections)

  const { cmTheme, isDark } = useTheme()

  // Editor height (resizable)
  const [editorHeight, setEditorHeight] = React.useState(200)
  const isEditorResizing = React.useRef(false)
  const editorResizeStartY = React.useRef(0)
  const editorResizeStartH = React.useRef(0)

  // Derive the database type from the connection config
  const connection = useMemo(
    () => connections.find((c) => c.id === connId),
    [connections, connId]
  )
  const dbType = connection?.type || 'mysql'
  const dbLabel = DB_TYPE_LABELS[dbType] || dbType

  // -- SQL Formatter --------------------------------------------------------

  const handleFormat = useCallback(() => {
    if (!viewRef.current) return
    const currentSql = viewRef.current.state.doc.toString()
    if (!currentSql.trim()) return

    try {
      const formatted = sqlFormat(currentSql, {
        language: getFormatterLanguage(dbType),
        keywordCase: 'upper',
        indentStyle: 'standard',
        logicalOperatorNewline: 'before'
      })
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: formatted
        }
      })
    } catch {
      message.warning('SQL 格式化失败，请检查语法')
    }
  }, [dbType])

  // -- CodeMirror init ------------------------------------------------------

  useEffect(() => {
    if (!editorRef.current) return

    if (viewRef.current) {
      viewRef.current.destroy()
    }

    const executeCallback = async () => {
      if (viewRef.current) {
        const sqlText = viewRef.current.state.doc.toString()
        await handleExecute(sqlText)
      }
    }

    const formatCallback = () => {
      handleFormat()
      return true
    }

    viewRef.current = new EditorView({
      doc: initialSql || '',
      extensions: [
        basicSetup,
        sql({ dialect: getCMDialect(dbType) }),
        ...(cmTheme === 'dark' ? [oneDark] : []),
        keymap.of([
          {
            key: 'Ctrl-Enter',
            run: () => {
              executeCallback()
              return true
            }
          },
          {
            key: 'Ctrl-s',
            run: formatCallback
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
  }, [tabId, dbType, cmTheme])

  // -- Execute / Cancel -----------------------------------------------------

  const getCurrentSql = useCallback((): string => {
    return viewRef.current?.state.doc.toString() || ''
  }, [])

  const handleExecute = useCallback(async (sqlText?: string) => {
    const sqlToRun = sqlText || getCurrentSql()
    if (!sqlToRun.trim()) {
      message.warning('请输入 SQL 语句')
      return
    }

    setRunning(true)
    let queryId: string | undefined
    try {
      queryId = await sqlApi.registerQuery(connId)
      setActiveQueryId(queryId)
      const result = await sqlApi.execute(connId, sqlToRun, queryId)
      setResults((prev) => [result, ...prev])
      setActiveResultTab('results')
      setStatusText(
        result.message ||
          `查询完成 | ${result.rows.length} 行 | ${result.executionTime}ms`
      )

      // Save to query history
      try {
        await historyApi.add({
          sql: sqlToRun,
          connId,
          connType: dbType,
          executionTime: result.executionTime,
          rowCount: result.rows.length
        })
      } catch {
        // History save failure should not block the user
      }
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
  }, [connId, dbType, getCurrentSql, setStatusText])

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

  // -- Load SQL from history ------------------------------------------------

  const handleLoadFromHistory = useCallback((sqlText: string) => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: sqlText
        }
      })
    }
    setHistoryVisible(false)
    setActiveResultTab('results')
  }, [])

  // -- Render result table --------------------------------------------------

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

    const exportData = {
      columns: result.columns,
      rows: result.rows,
      tableName: 'query_result'
    }

    return (
      <div key={`result-${result.executionTime}-${Math.random()}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {result.columns.length > 0 ? (
          <>
            <div style={{ padding: '4px 12px', borderBottom: '1px solid #f0f0f0' }}>
              <Space>
                <DataExport
                  currentData={exportData}
                  connId={connId}
                  tableName="query_result"
                />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {result.rows.length} 行 | {result.executionTime}ms
                </Typography.Text>
              </Space>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <Table
                className="result-table"
                columns={cols}
                dataSource={result.rows.map((row, i) => ({ ...row, _key: i }))}
                rowKey="_key"
                size="small"
                scroll={{ x: 'max-content', y: 'calc(100vh - 460px)' }}
                pagination={{
                  showSizeChanger: true,
                  pageSizeOptions: [50, 100, 200],
                  showTotal: (total) => `共 ${total} 行`,
                  defaultPageSize: 100
                }}
                sticky
              />
            </div>
          </>
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
          borderBottom: `1px solid ${isDark ? '#333' : '#e8e8e8'}`,
          background: isDark ? '#1e1e1e' : '#fafafa',
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
            icon={<FormatPainterOutlined />}
            onClick={handleFormat}
            size="small"
            title="格式化 SQL (Ctrl+S)"
          >
            格式化
          </Button>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => setHistoryVisible((v) => !v)}
            size="small"
          >
            历史
          </Button>
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
          {dbLabel}
        </Typography.Text>
      </div>

      {/* CodeMirror editor */}
      <div style={{ height: editorHeight, position: 'relative' }} ref={editorRef} />
      {/* Editor resize handle */}
      <div
        onMouseDown={(e) => {
          e.preventDefault()
          isEditorResizing.current = true
          editorResizeStartY.current = e.clientY
          editorResizeStartH.current = editorHeight

          const handleMouseMove = (ev: MouseEvent) => {
            if (!isEditorResizing.current) return
            const diff = ev.clientY - editorResizeStartY.current
            setEditorHeight(Math.max(80, Math.min(600, editorResizeStartH.current + diff)))
          }

          const handleMouseUp = () => {
            isEditorResizing.current = false
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
          }

          document.addEventListener('mousemove', handleMouseMove)
          document.addEventListener('mouseup', handleMouseUp)
        }}
        style={{
          height: 4,
          cursor: 'row-resize',
          background: 'transparent',
          borderBottom: `1px solid ${isDark ? '#333' : '#e8e8e8'}`,
          flexShrink: 0
        }}
      />

      {/* Results / History */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {historyVisible ? (
          <QueryHistory
            connId={connId}
            onLoadSql={handleLoadFromHistory}
            onClose={() => setHistoryVisible(false)}
          />
        ) : (
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
                key: 'session-history',
                label: '本次记录',
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
        )}
      </div>
    </div>
  )
}

export default SqlEditor
