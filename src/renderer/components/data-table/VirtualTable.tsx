import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Input, Checkbox, Typography } from 'antd'

export interface VirtualColumn {
  key: string
  title: string
  width: number
  fixed?: 'left' | false
}

export interface VirtualTableProps {
  columns: VirtualColumn[]
  rows: Record<string, unknown>[]
  rowKey?: string
  estimatedRowHeight?: number
  overscan?: number
  frozenColumnCount?: number
  // Edit mode
  editing?: boolean
  editingCell?: { row: number; col: string } | null
  editValue?: string
  onCellDoubleClick?: (rowIndex: number, col: string) => void
  onEditValueChange?: (value: string) => void
  onCellSave?: () => void
  onCellCancel?: () => void
  editInputRef?: React.Ref<Input>
  // Selection
  selectedRowKeys?: number[]
  onSelectionChange?: (keys: number[]) => void
  // Column resize
  onColumnResize?: (columnKey: string, newWidth: number) => void
  // Modified cells highlight
  modifiedCells?: Set<string>
  pendingChanges?: Map<number, unknown>
  // Copy
  onCopy?: (type: 'cell' | 'rows' | 'rowsWithHeader', format: 'tsv' | 'json') => void
}

const VirtualTable: React.FC<VirtualTableProps> = ({
  columns,
  rows,
  rowKey = '_key',
  estimatedRowHeight = 32,
  overscan = 10,
  frozenColumnCount = 0,
  editing = false,
  editingCell,
  editValue = '',
  onCellDoubleClick,
  onEditValueChange,
  onCellSave,
  onCellCancel,
  editInputRef,
  selectedRowKeys = [],
  onSelectionChange,
  onColumnResize,
  modifiedCells = new Set(),
  pendingChanges = new Map(),
  onCopy
}) => {
  const tableRef = useRef<HTMLDivElement>(null)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    columns.forEach((c) => { initial[c.key] = c.width })
    return initial
  })
  const [columnOrder, setColumnOrder] = useState<string[]>(() => columns.map((c) => c.key))
  const [draggedCol, setDraggedCol] = useState<string | null>(null)
  const [resizingCol, setResizingCol] = useState<string | null>(null)
  const [resizeStartX, setResizeStartX] = useState(0)
  const [resizeStartWidth, setResizeStartWidth] = useState(0)
  const [selectAllChecked, setSelectAllChecked] = useState(false)

  // Sync column widths when columns prop changes
  useEffect(() => {
    setColumnWidths((prev) => {
      const next = { ...prev }
      columns.forEach((c) => {
        if (next[c.key] === undefined) next[c.key] = c.width
      })
      return next
    })
    setColumnOrder(columns.map((c) => c.key))
  }, [columns])

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan
  })

  const frozenColumns = useMemo(
    () => columnOrder.slice(0, frozenColumnCount),
    [columnOrder, frozenColumnCount]
  )
  const scrollableColumns = useMemo(
    () => columnOrder.slice(frozenColumnCount),
    [columnOrder, frozenColumnCount]
  )

  // -- Column resize --
  const handleResizeStart = useCallback(
    (col: string, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setResizingCol(col)
      setResizeStartX(e.clientX)
      setResizeStartWidth(columnWidths[col] || 150)
    },
    [columnWidths]
  )

  useEffect(() => {
    if (!resizingCol) return

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX
      const newWidth = Math.max(60, resizeStartWidth + diff)
      setColumnWidths((prev) => ({ ...prev, [resizingCol]: newWidth }))
      onColumnResize?.(resizingCol, newWidth)
    }

    const handleMouseUp = () => {
      setResizingCol(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizingCol, resizeStartX, resizeStartWidth, onColumnResize])

  // -- Column reorder (drag) --
  const handleColDragStart = (col: string, e: React.MouseEvent) => {
    if (resizingCol) return
    setDraggedCol(col)
  }

  const handleColDragOver = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault()
    if (!draggedCol || draggedCol === targetCol) return
    setColumnOrder((prev) => {
      const next = [...prev]
      const fromIdx = next.indexOf(draggedCol)
      const toIdx = next.indexOf(targetCol)
      if (fromIdx === -1 || toIdx === -1) return prev
      next.splice(fromIdx, 1)
      next.splice(toIdx, 0, draggedCol)
      return next
    })
  }

  const handleColDragEnd = () => {
    setDraggedCol(null)
  }

  // -- Selection --
  const [shiftAnchor, setShiftAnchor] = useState<number | null>(null)

  const toggleRowSelection = (index: number, e: React.MouseEvent) => {
    if (!onSelectionChange) return

    if (e.shiftKey && shiftAnchor !== null) {
      // Range selection
      const start = Math.min(shiftAnchor, index)
      const end = Math.max(shiftAnchor, index)
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i)
      const newKeys = [...new Set([...selectedRowKeys, ...range])]
      onSelectionChange(newKeys)
    } else {
      const idx = selectedRowKeys.indexOf(index)
      if (idx >= 0) {
        onSelectionChange(selectedRowKeys.filter((k) => k !== index))
      } else {
        onSelectionChange([...selectedRowKeys, index])
      }
      setShiftAnchor(index)
    }
  }

  const handleSelectAll = () => {
    if (!onSelectionChange) return
    if (selectAllChecked) {
      onSelectionChange([])
      setSelectAllChecked(false)
    } else {
      const allKeys = rows.map((_, i) => i)
      onSelectionChange(allKeys)
      setSelectAllChecked(true)
    }
  }

  // Reset selectAll when rows change
  useEffect(() => {
    setSelectAllChecked(selectedRowKeys.length === rows.length && rows.length > 0)
  }, [selectedRowKeys, rows.length])

  // -- Copy handling --
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedRowKeys.length > 0) {
          e.preventDefault()
          const copyData = selectedRowKeys
            .map((rowIdx) => columnOrder.map((col) => String(rows[rowIdx]?.[col] ?? '')))
            .map((row) => row.join('\t'))
            .join('\n')

          if (e.shiftKey) {
            // Copy with headers
            const headerRow = columnOrder.join('\t')
            navigator.clipboard.writeText(headerRow + '\n' + copyData)
          } else {
            navigator.clipboard.writeText(copyData)
          }
        } else if (editingCell) {
          // Single cell copy handled by default browser behavior
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // Only intercept if focus is on the table, not on an input
        if (tableRef.current?.contains(document.activeElement) && !editingCell) {
          e.preventDefault()
          handleSelectAll()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedRowKeys, columnOrder, rows, editingCell])

  // -- Render helpers --

  const renderCell = (col: string, rowIndex: number) => {
    const val = rows[rowIndex]?.[col]
    const isEditingThisCell = editingCell?.row === rowIndex && editingCell?.col === col
    const isModified = modifiedCells.has(`${rowIndex}:${col}`)
    const change = pendingChanges.get(rowIndex)
    const isDeleted = change && 'type' in change && (change as { type: string }).type === 'delete'

    if (isDeleted) {
      return (
        <Typography.Text type="secondary" delete style={{ opacity: 0.5, fontSize: 12 }}>
          {val === null ? 'NULL' : String(val)}
        </Typography.Text>
      )
    }

    if (isEditingThisCell) {
      return (
        <Input
          ref={editInputRef as React.Ref<Input>}
          size="small"
          value={editValue}
          onChange={(e) => onEditValueChange?.(e.target.value)}
          onPressEnter={onCellSave}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCellCancel?.()
          }}
          onBlur={onCellSave}
          style={{ padding: '0 4px', height: 24 }}
          autoFocus
        />
      )
    }

    return (
      <div
        onDoubleClick={() => editing && onCellDoubleClick?.(rowIndex, col)}
        style={{
          cursor: editing ? 'text' : undefined,
          border: isModified ? '1px solid #1890ff' : undefined,
          borderRadius: isModified ? 2 : undefined,
          padding: isModified ? '0 2px' : undefined,
          background: isModified ? '#e6f7ff' : undefined,
          fontSize: 12,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {val === null ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>NULL</Typography.Text>
        ) : val instanceof Date ? (
          val.toLocaleString()
        ) : (
          String(val)
        )}
      </div>
    )
  }

  const renderHeaderCell = (col: string) => {
    const isFrozen = frozenColumns.includes(col)
    const width = columnWidths[col] || 150
    return (
      <div
        draggable
        onDragStart={() => setDraggedCol(col)}
        onDragOver={(e) => handleColDragOver(e, col)}
        onDragEnd={handleColDragEnd}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          height: '100%',
          cursor: 'pointer',
          userSelect: 'none',
          fontSize: 12,
          fontWeight: 600,
          background: draggedCol === col ? '#e6f7ff' : undefined,
          width: isFrozen ? width : undefined,
          minWidth: isFrozen ? width : undefined
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {col}
        </span>
        <div
          style={{
            width: 4,
            cursor: 'col-resize',
            flexShrink: 0,
            height: '100%'
          }}
          onMouseDown={(e) => handleResizeStart(col, e)}
        />
      </div>
    )
  }

  const virtualRows = virtualizer.getVirtualItems()
  const totalHeight = virtualizer.getTotalSize()

  return (
    <div
      ref={tableRef}
      style={{
        overflow: 'auto',
        height: '100%',
        position: 'relative'
      }}
      tabIndex={0}
    >
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        {/* Header */}
        <thead>
          <tr>
            {editing && (
              <th
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 3,
                  background: '#fafafa',
                  borderBottom: '1px solid #f0f0f0',
                  width: 40,
                  minWidth: 40
                }}
              >
                <Checkbox checked={selectAllChecked} onChange={handleSelectAll} />
              </th>
            )}
            {frozenColumns.map((col) => (
              <th
                key={col}
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 3,
                  background: '#fafafa',
                  borderBottom: '1px solid #f0f0f0',
                  width: columnWidths[col] || 150,
                  minWidth: columnWidths[col] || 150,
                  left: editing ? 40 + frozenColumns.indexOf(col) * (columnWidths[col] || 150) : frozenColumns.indexOf(col) * (columnWidths[col] || 150),
                  zIndex: 4
                }}
              >
                {renderHeaderCell(col)}
              </th>
            ))}
            {scrollableColumns.map((col) => (
              <th
                key={col}
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  background: '#fafafa',
                  borderBottom: '1px solid #f0f0f0',
                  width: columnWidths[col] || 150,
                  minWidth: columnWidths[col] || 150
                }}
              >
                {renderHeaderCell(col)}
              </th>
            ))}
          </tr>
        </thead>
        {/* Body */}
        <tbody>
          {virtualRows.map((virtualRow) => {
            const rowIndex = virtualRow.index
            const isSelected = selectedRowKeys.includes(rowIndex)
            const change = pendingChanges.get(rowIndex)
            const isInsert = change && 'type' in change && (change as { type: string }).type === 'insert'

            return (
              <tr
                key={virtualRow.key}
                style={{
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  background: isSelected
                    ? '#e6f7ff'
                    : isInsert
                      ? '#f6ffed'
                      : rowIndex % 2 === 0
                        ? undefined
                        : '#fafafa'
                }}
              >
                {editing && (
                  <td
                    style={{
                      width: 40,
                      minWidth: 40,
                      borderBottom: '1px solid #f0f0f0',
                      textAlign: 'center',
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      background: isSelected ? '#e6f7ff' : undefined
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      onClick={(e) => toggleRowSelection(rowIndex, e as unknown as React.MouseEvent)}
                    />
                  </td>
                )}
                {frozenColumns.map((col) => (
                  <td
                    key={col}
                    style={{
                      borderBottom: '1px solid #f0f0f0',
                      padding: '0 8px',
                      height: virtualRow.size,
                      width: columnWidths[col] || 150,
                      minWidth: columnWidths[col] || 150,
                      position: 'sticky',
                      left: editing
                        ? 40 + frozenColumns.indexOf(col) * (columnWidths[col] || 150)
                        : frozenColumns.indexOf(col) * (columnWidths[col] || 150),
                      zIndex: 1,
                      background: isSelected ? '#e6f7ff' : undefined,
                      overflow: 'hidden'
                    }}
                  >
                    {renderCell(col, rowIndex)}
                  </td>
                ))}
                {scrollableColumns.map((col) => (
                  <td
                    key={col}
                    style={{
                      borderBottom: '1px solid #f0f0f0',
                      padding: '0 8px',
                      height: virtualRow.size,
                      width: columnWidths[col] || 150,
                      minWidth: columnWidths[col] || 150,
                      overflow: 'hidden',
                      background: isSelected ? '#e6f7ff' : undefined
                    }}
                  >
                    {renderCell(col, rowIndex)}
                  </td>
                ))}
              </tr>
            )
          })}
          {/* Placeholder row to enable scrolling */}
          {virtualRows.length > 0 && (
            <tr style={{ height: totalHeight - (virtualRows[virtualRows.length - 1]?.end || 0) }} />
          )}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
          No data
        </div>
      )}
    </div>
  )
}

export default VirtualTable
