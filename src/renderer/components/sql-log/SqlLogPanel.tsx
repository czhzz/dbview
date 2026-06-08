import React, { useEffect, useRef, useCallback } from 'react'
import { Button, Tag, Empty, Tooltip } from 'antd'
import {
  ClearOutlined,
  DownOutlined,
  UpOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CodeOutlined
} from '@ant-design/icons'
import { useLogStore } from '../../stores/logStore'
import { useTheme } from '../../hooks/useTheme'
import type { SqlLogEntry } from '../../../preload/types'

const categoryConfig: Record<string, { color: string; label: string; darkColor: string }> = {
  user: { color: '#1677ff', label: '用户', darkColor: '#1677ff' },
  system: { color: '#fa8c16', label: '系统', darkColor: '#ffa940' },
  metadata: { color: '#8c8c8c', label: '元数据', darkColor: '#a0a0a0' }
}

const SqlLogPanel: React.FC = () => {
  const {
    logs,
    panelVisible,
    panelHeight,
    filter,
    addLog,
    clearLogs,
    togglePanel,
    setPanelHeight,
    setFilter
  } = useLogStore()
  const { isDark } = useTheme()
  const listRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(0)

  // Subscribe to SQL log events from main process
  useEffect(() => {
    const unsub = window.electronAPI.sqlLog.onLog((entry: SqlLogEntry) => {
      addLog(entry)
    })
    return unsub
  }, [addLog])

  // Auto-scroll to bottom on new log
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [logs])

  // Resize handler
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isResizing.current = true
      startY.current = e.clientY
      startHeight.current = panelHeight

      const handleMouseMove = (ev: MouseEvent) => {
        if (!isResizing.current) return
        const diff = startY.current - ev.clientY
        setPanelHeight(startHeight.current + diff)
      }

      const handleMouseUp = () => {
        isResizing.current = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [panelHeight, setPanelHeight]
  )

  const filteredLogs = filter === 'all' ? logs : logs.filter((l) => l.category === filter)

  const bgColor = isDark ? '#1e1e1e' : '#ffffff'
  const borderColor = isDark ? '#333' : '#e8e8e8'
  const headerBg = isDark ? '#252525' : '#fafafa'
  const textColor = isDark ? '#d4d4d4' : '#333'
  const secondaryColor = isDark ? '#888' : '#999'
  const hoverBg = isDark ? '#2a2a2a' : '#fafafa'
  const sqlColor = isDark ? '#9cdcfe' : '#d63384'

  if (!panelVisible) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: panelHeight, borderTop: `1px solid ${borderColor}`, background: bgColor }}>
      {/* Resize handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        style={{
          height: 4,
          cursor: 'row-resize',
          background: 'transparent',
          flexShrink: 0
        }}
      />

      {/* Header */}
      <div
        style={{
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          background: headerBg,
          borderBottom: `1px solid ${borderColor}`,
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CodeOutlined style={{ color: secondaryColor }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>SQL 日志</span>
          <span style={{ fontSize: 11, color: secondaryColor }}>({filteredLogs.length})</span>

          {/* Filter buttons */}
          <div style={{ display: 'flex', gap: 2, marginLeft: 8 }}>
            {(['all', 'user', 'system', 'metadata'] as const).map((f) => (
              <Button
                key={f}
                type={filter === f ? 'primary' : 'text'}
                size="small"
                style={{ fontSize: 11, height: 20, padding: '0 6px' }}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? '全部' : categoryConfig[f].label}
              </Button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <Tooltip title="清空日志">
            <Button
              type="text"
              size="small"
              icon={<ClearOutlined />}
              style={{ fontSize: 12 }}
              onClick={() => {
                clearLogs()
                window.electronAPI.sqlLog.clear()
              }}
            />
          </Tooltip>
          <Tooltip title="折叠面板">
            <Button
              type="text"
              size="small"
              icon={<DownOutlined />}
              style={{ fontSize: 12 }}
              onClick={togglePanel}
            />
          </Tooltip>
        </div>
      </div>

      {/* Log list */}
      <div ref={listRef} style={{ flex: 1, overflow: 'auto', fontSize: 12 }}>
        {filteredLogs.length === 0 ? (
          <div style={{ padding: '20px 0' }}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无日志" />
          </div>
        ) : (
          filteredLogs.map((entry) => (
            <LogEntryRow key={entry.id} entry={entry} isDark={isDark} textColor={textColor} secondaryColor={secondaryColor} hoverBg={hoverBg} sqlColor={sqlColor} borderColor={borderColor} />
          ))
        )}
      </div>
    </div>
  )
}

/** Single log entry row */
const LogEntryRow: React.FC<{
  entry: SqlLogEntry
  isDark: boolean
  textColor: string
  secondaryColor: string
  hoverBg: string
  sqlColor: string
  borderColor: string
}> = ({ entry, isDark, textColor, secondaryColor, hoverBg, sqlColor, borderColor }) => {
  const [expanded, setExpanded] = React.useState(false)
  const time = new Date(entry.timestamp)
  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`

  const cat = categoryConfig[entry.category] || categoryConfig.metadata
  const tagColor = isDark ? cat.darkColor : cat.color

  return (
    <div
      style={{
        padding: '4px 12px',
        borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#f5f5f5'}`,
        cursor: 'pointer',
        background: entry.status === 'error' ? (isDark ? '#3a1f1f' : '#fff2f0') : undefined,
        transition: 'background 0.15s'
      }}
      onClick={() => setExpanded(!expanded)}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.background = entry.status === 'error' ? (isDark ? '#4a2f2f' : '#fff5f5') : hoverBg
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.background = entry.status === 'error' ? (isDark ? '#3a1f1f' : '#fff2f0') : undefined
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Status icon */}
        {entry.status === 'success' ? (
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
        ) : (
          <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />
        )}

        {/* Timestamp */}
        <span style={{ color: secondaryColor, fontSize: 11, fontFamily: 'monospace', flexShrink: 0 }}>{timeStr}</span>

        {/* Category tag */}
        <Tag
          color={tagColor}
          style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0, borderRadius: 3 }}
        >
          {cat.label}
        </Tag>

        {/* SQL text (truncated) */}
        <span
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
            fontSize: 12,
            color: sqlColor
          }}
        >
          {entry.sql}
        </span>

        {/* Execution time */}
        <span style={{ color: secondaryColor, fontSize: 11, flexShrink: 0 }}>
          {entry.executionTime}ms
        </span>

        {/* Source */}
        <span style={{ color: secondaryColor, fontSize: 10, flexShrink: 0, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.source}
        </span>

        {/* Expand indicator */}
        <span style={{ color: secondaryColor, fontSize: 10 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ marginTop: 4, marginLeft: 24, padding: '8px 10px', background: isDark ? '#1a1a1a' : '#f8f8f8', borderRadius: 4, border: `1px solid ${borderColor}` }}>
          <pre
            style={{
              margin: 0,
              fontFamily: 'monospace',
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              color: textColor,
              lineHeight: 1.6
            }}
          >
            {entry.sql}
          </pre>
          {entry.error && (
            <div style={{ marginTop: 6, color: '#ff4d4f', fontSize: 11 }}>
              错误: {entry.error}
            </div>
          )}
          <div style={{ marginTop: 4, fontSize: 11, color: secondaryColor, display: 'flex', gap: 16 }}>
            <span>耗时: {entry.executionTime}ms</span>
            <span>行数: {entry.rowCount}</span>
            <span>来源: {entry.source}</span>
            <span>连接: {entry.connId.slice(0, 8)}...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default SqlLogPanel
