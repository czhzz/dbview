import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Table, Button, Space, Typography, Spin, Input, Popconfirm, message } from 'antd'
import {
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons'
import { dataApi, databaseApi, sqlApi } from '../../services/api'
import { useDbType } from '../../hooks/useDbType'
import { quoteId, quoteTable } from '../../utils/sql-quote'
import { useUIStore } from '../../stores/uiStore'
import DataExport from './DataExport'
import type { PaginationResult, ColumnInfo } from '../../types/database'

interface Props {
  connId: string
  table: string
  schema?: string
}

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500]

/** Change types tracked for pending edits */
type ChangeType = 'update' | 'insert' | 'delete'

interface PendingChange {
  type: ChangeType
  rowIndex: number
  originalRow?: Record<string, unknown>
  modifiedValues?: Record<string, unknown>
}

const DataTable: React.FC<Props> = ({ connId, table, schema }) => {
  const dbType = useDbType(connId)
  const [data, setData] = useState<PaginationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [sortColumn, setSortColumn] = useState<string | undefined>()
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC')
  const { setStatusText } = useUIStore()

  // -- Edit mode state --
  const [editing, setEditing] = useState(false)
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [pendingChanges, setPendingChanges] = useState<Map<number, PendingChange>>(new Map())
  const [modifiedCells, setModifiedCells] = useState<Set<string>>(new Set())
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [columnMeta, setColumnMeta] = useState<ColumnInfo[]>([])
  const [newRows, setNewRows] = useState<Record<string, unknown>[]>([])
  const editInputRef = useRef<Input>(null)

  // Primary key columns (for generating UPDATE/DELETE)
  const pkColumns = columnMeta.filter((c) => c.key === 'PRI').map((c) => c.name)

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

  // Load column metadata for edit mode (primary keys, types)
  const loadColumnMeta = useCallback(async () => {
    try {
      const cols = await databaseApi.getColumns(connId, table, schema)
      setColumnMeta(cols)
    } catch {
      // Non-critical for viewing
    }
  }, [connId, table, schema])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (editing) {
      loadColumnMeta()
    }
  }, [editing, loadColumnMeta])

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

  // -- Edit mode handlers --

  const enterEditMode = () => {
    setEditing(true)
    setPendingChanges(new Map())
    setModifiedCells(new Set())
    setSelectedRowKeys([])
    setNewRows([])
  }

  const exitEditMode = () => {
    setEditing(false)
    setEditingCell(null)
    setPendingChanges(new Map())
    setModifiedCells(new Set())
    setSelectedRowKeys([])
    setNewRows([])
  }

  const handleCellDoubleClick = (rowIndex: number, col: string) => {
    if (!editing) return
    setEditingCell({ row: rowIndex, col })
    const row = getRowData(rowIndex)
    const val = row[col]
    setEditValue(val === null || val === undefined ? '' : String(val))
    setTimeout(() => editInputRef.current?.focus(), 50)
  }

  const handleCellSave = () => {
    if (!editingCell) return
    const { row, col } = editingCell
    const rowData = getRowData(row)
    const originalVal = rowData[col]
    const newVal = editValue === '' ? null : editValue

    // Track the change
    setPendingChanges((prev) => {
      const next = new Map(prev)
      const existing = next.get(row)
      if (existing && existing.type === 'update') {
        next.set(row, {
          ...existing,
          modifiedValues: { ...existing.modifiedValues, [col]: newVal }
        })
      } else if (!existing || existing.type !== 'insert') {
        next.set(row, {
          type: 'update',
          rowIndex: row,
          originalRow: { ...rowData },
          modifiedValues: { [col]: newVal }
        })
      }
      return next
    })

    setModifiedCells((prev) => {
      const next = new Set(prev)
      next.add(`${row}:${col}`)
      return next
    })

    setEditingCell(null)
  }

  const handleCellCancel = () => {
    setEditingCell(null)
  }

  const handleAddRow = () => {
    const newRow: Record<string, unknown> = {}
    for (const col of data?.columns || []) {
      newRow[col] = null
    }
    const newIndex = (data?.rows.length || 0) + newRows.length
    setNewRows((prev) => [...prev, newRow])
    setPendingChanges((prev) => {
      const next = new Map(prev)
      next.set(newIndex, {
        type: 'insert',
        rowIndex: newIndex,
        modifiedValues: newRow
      })
      return next
    })
  }

  const handleDeleteRows = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的行')
      return
    }

    setPendingChanges((prev) => {
      const next = new Map(prev)
      for (const key of selectedRowKeys) {
        const rowData = getRowData(key)
        if (prev.get(key)?.type === 'insert') {
          // If it's a newly added row, just remove the insert change
          next.delete(key)
        } else {
          next.set(key, {
            type: 'delete',
            rowIndex: key,
            originalRow: { ...rowData }
          })
        }
      }
      return next
    })
    setSelectedRowKeys([])
  }

  const handleSaveChanges = async () => {
    if (pendingChanges.size === 0) {
      message.info('没有待保存的更改')
      return
    }

    const statements: string[] = []

    for (const [, change] of pendingChanges) {
      switch (change.type) {
        case 'update': {
          if (!change.modifiedValues || !change.originalRow) break
          const setClauses = Object.entries(change.modifiedValues)
            .map(([col, val]) => `${quoteId(col, dbType)} = ${formatSqlValue(val)}`)
            .join(', ')
          const whereClause = buildWhereClause(change.originalRow)
          statements.push(`UPDATE ${quoteTable(table, schema, dbType)} SET ${setClauses} WHERE ${whereClause};`)
          break
        }
        case 'insert': {
          if (!change.modifiedValues) break
          const cols = Object.keys(change.modifiedValues)
          const vals = Object.values(change.modifiedValues).map(formatSqlValue)
          statements.push(`INSERT INTO ${quoteTable(table, schema, dbType)} (${cols.map((c) => quoteId(c, dbType)).join(', ')}) VALUES (${vals.join(', ')});`)
          break
        }
        case 'delete': {
          if (!change.originalRow) break
          const whereClause = buildWhereClause(change.originalRow)
          statements.push(`DELETE FROM ${quoteTable(table, schema, dbType)} WHERE ${whereClause};`)
          break
        }
      }
    }

    try {
      // Execute all statements sequentially
      for (const stmt of statements) {
        await sqlApi.execute(connId, stmt)
      }
      message.success(`成功执行 ${statements.length} 条语句`)
      exitEditMode()
      loadData()
    } catch (err) {
      message.error(`保存失败: ${err instanceof Error ? err.message : '未知错误'}`)
    }
  }

  const handleCancelChanges = () => {
    exitEditMode()
  }

  // -- Helpers --

  /** Get row data including new rows */
  const getRowData = (index: number): Record<string, unknown> => {
    const existingRows = data?.rows || []
    if (index < existingRows.length) {
      const change = pendingChanges.get(index)
      if (change?.type === 'update' && change.modifiedValues) {
        return { ...existingRows[index], ...change.modifiedValues }
      }
      return existingRows[index]
    }
    // New row
    const newRowIndex = index - existingRows.length
    return newRows[newRowIndex] || {}
  }

  const buildWhereClause = (row: Record<string, unknown>): string => {
    // Use primary key columns if available; otherwise use all columns
    const keyCols = pkColumns.length > 0 ? pkColumns : Object.keys(row)
    return keyCols
      .map((col) => `${quoteId(col, dbType)} = ${formatSqlValue(row[col])}`)
      .join(' AND ')
  }

  const formatSqlValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'NULL'
    if (typeof value === 'number') return String(value)
    if (typeof value === 'boolean') return value ? '1' : '0'
    const str = String(value)
    return "'" + str.replace(/'/g, "''") + "'"
  }

  // -- Column definitions --

  const allRows = [...(data?.rows || []), ...newRows]

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
    render: (val: unknown, _record: Record<string, unknown>, index: number) => {
      const isEditingThisCell =
        editingCell?.row === index && editingCell?.col === col
      const isModified = modifiedCells.has(`${index}:${col}`)
      const isDeleted = pendingChanges.get(index)?.type === 'delete'

      if (isDeleted) {
        return (
          <Typography.Text
            type="secondary"
            delete
            style={{ opacity: 0.5 }}
          >
            {val === null ? 'NULL' : String(val)}
          </Typography.Text>
        )
      }

      if (isEditingThisCell) {
        return (
          <Input
            ref={editInputRef}
            size="small"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onPressEnter={handleCellSave}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleCellCancel()
            }}
            onBlur={handleCellSave}
            style={{ padding: '0 4px' }}
          />
        )
      }

      return (
        <div
          onDoubleClick={() => handleCellDoubleClick(index, col)}
          style={{
            cursor: editing ? 'text' : undefined,
            border: isModified ? '1px solid #1890ff' : undefined,
            borderRadius: isModified ? 2 : undefined,
            padding: isModified ? '0 2px' : undefined,
            background: isModified ? '#e6f7ff' : undefined
          }}
        >
          {val === null ? (
            <Typography.Text type="secondary">NULL</Typography.Text>
          ) : val instanceof Date ? (
            val.toLocaleString()
          ) : (
            String(val)
          )}
        </div>
      )
    }
  }))

  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  const hasChanges = pendingChanges.size > 0

  return (
    <div className="tab-content" style={{ padding: '0' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData} size="small">
            刷新
          </Button>
          {!editing ? (
            <Button icon={<EditOutlined />} onClick={enterEditMode} size="small">
              编辑
            </Button>
          ) : (
            <>
              <Button
                icon={<PlusOutlined />}
                onClick={handleAddRow}
                size="small"
              >
                添加行
              </Button>
              <Popconfirm
                title={`确认删除选中的 ${selectedRowKeys.length} 条记录？`}
                onConfirm={handleDeleteRows}
                disabled={selectedRowKeys.length === 0}
              >
                <Button
                  icon={<DeleteOutlined />}
                  danger
                  disabled={selectedRowKeys.length === 0}
                  size="small"
                >
                  删除行
                </Button>
              </Popconfirm>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSaveChanges}
                disabled={!hasChanges}
                size="small"
              >
                保存更改
              </Button>
              <Button
                icon={<CloseOutlined />}
                onClick={handleCancelChanges}
                size="small"
              >
                取消编辑
              </Button>
            </>
          )}
          <DataExport
            currentData={{
              columns: data?.columns || [],
              rows: data?.rows || [],
              tableName: table,
              dbType
            }}
            connId={connId}
            tableName={table}
            schema={schema}
            dbType={dbType}
            baseQueryParams={{
              table,
              schema,
              orderBy: sortColumn ? { column: sortColumn, direction: sortDirection } : undefined
            }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            共 {data.total} 行 | {data.executionTime}ms
            {editing && hasChanges && (
              <Typography.Text type="warning" style={{ marginLeft: 8 }}>
                ({pendingChanges.size} 项待保存)
              </Typography.Text>
            )}
          </Typography.Text>
        </Space>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Table
          className="result-table"
          columns={columns}
          dataSource={allRows.map((row, i) => ({ ...row, _key: i }))}
          rowKey="_key"
          loading={loading}
          size="small"
          scroll={{ x: 'max-content', y: 'calc(100vh - 240px)' }}
          rowSelection={
            editing
              ? {
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys as number[])
                }
              : undefined
          }
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
