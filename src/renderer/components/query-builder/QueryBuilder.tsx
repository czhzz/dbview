import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type OnDragOver,
  type OnDrop
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button, Space, Typography, Segmented, Select, Input, Tag, Tooltip, message, Tabs, Empty } from 'antd'
import { PlayCircleOutlined, SendOutlined, DeleteOutlined, PlusOutlined, ClearOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { v4 as uuidv4 } from 'uuid'
import TableNode from './TableNode'
import JoinEdge, { type JoinEdgeData, type JoinType } from './JoinEdge'
import { createEmptyQueryGraph, addTable, autoDetectJoin, type QueryGraph, type QueryTable } from './queryGraph'
import { buildSql } from './sqlBuilder'
import { databaseApi, sqlApi } from '../../services/api'

const nodeTypes = { tableNode: TableNode }
const edgeTypes = { joinEdge: JoinEdge }

interface Props {
  connId: string
  schema?: string
  dbType: string
  onExecute: (sql: string) => void
  onSendToEditor: (sql: string) => void
}

const QueryBuilder: React.FC<Props> = ({ connId, schema, dbType, onExecute, onSendToEditor }) => {
  const { t } = useTranslation()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [queryGraph, setQueryGraph] = useState<QueryGraph>(createEmptyQueryGraph())
  const [availableTables, setAvailableTables] = useState<{ name: string; columns: { name: string; type: string; key: string }[] }[]>([])
  const [selectedColumns, setSelectedColumns] = useState<Map<string, Set<string>>>(new Map())
  const [whereConditions, setWhereConditions] = useState<{ id: string; column: string; operator: string; value: string; connector: 'AND' | 'OR' }[]>([])
  const [orderByFields, setOrderByFields] = useState<{ tableId: string; column: string; direction: 'ASC' | 'DESC' }[]>([])
  const [groupByFields, setGroupByFields] = useState<string[]>([])
  const [limit, setLimit] = useState(1000)
  const [activePanel, setActivePanel] = useState<string>('filter')
  const [previewSql, setPreviewSql] = useState('')

  // Load available tables from database
  useEffect(() => {
    const loadTables = async () => {
      try {
        const tables = await databaseApi.getTables(connId, schema)
        const tablesWithCols = await Promise.all(
          tables.map(async (t) => {
            const cols = await databaseApi.getColumns(connId, t.name, schema)
            return {
              name: t.name,
              columns: cols.map((c) => ({ name: c.name, type: c.type, key: c.key }))
            }
          })
        )
        setAvailableTables(tablesWithCols)
      } catch {
        // Silently fail
      }
    }
    loadTables()
  }, [connId, schema])

  // Handle drag & drop from table list to canvas
  const onDragOver: OnDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop: OnDrop = useCallback(
    (event) => {
      event.preventDefault()
      const tableName = event.dataTransfer.getData('application/tableName')
      if (!tableName) return

      const tableMeta = availableTables.find((t) => t.name === tableName)
      if (!tableMeta) return

      const position = reactFlowWrapper.current
        ? reactFlowWrapper.current.getBoundingClientRect()
        : { left: 0, top: 0 }

      // Deduplicate: append _2, _3 if table already on canvas
      const existingIds = new Set(nodes.map((n) => n.id))
      let newId = tableName
      let suffix = 2
      while (existingIds.has(newId)) {
        newId = `${tableName}_${suffix++}`
      }
      const newNode: Node = {
        id: newId,
        type: 'tableNode',
        position: {
          x: event.clientX - position.left - 90,
          y: event.clientY - position.top - 20
        },
        data: {
          label: tableName,
          columns: tableMeta.columns,
          selectedColumns: selectedColumns.get(newId) || new Set(),
          onToggleColumn: (column: string) => {
            setSelectedColumns((prev) => {
              const next = new Map(prev)
              const cols = new Set(next.get(newId) || [])
              if (cols.has(column)) cols.delete(column)
              else cols.add(column)
              next.set(newId, cols)
              return next
            })
          },
          dbType
        }
      }

      setNodes((nds) => [...nds, newNode])

      // Auto-detect join with existing nodes
      const existingNodes = nodes
      if (existingNodes.length > 0) {
        const existingTable = existingNodes[0]
        const existingMeta = availableTables.find((t) => t.name === existingTable.id)
        if (existingMeta) {
          const allCols = new Map<string, string[]>()
          allCols.set(existingTable.id, existingMeta.columns.map((c) => c.name))
          allCols.set(newId, tableMeta.columns.map((c) => c.name))

          const condition = autoDetectJoin(
            { id: existingTable.id, name: existingTable.id },
            { id: newId, name: newId },
            allCols
          )

          if (condition) {
            const edgeId = `e-${existingTable.id}-${newId}`
            const newEdge: Edge<JoinEdgeData> = {
              id: edgeId,
              source: existingTable.id,
              target: newId,
              type: 'joinEdge',
              data: {
                joinType: 'INNER',
                onJoinTypeChange: (eid, newType) => {
                  setEdges((eds) =>
                    eds.map((e) =>
                      e.id === eid ? { ...e, data: { ...e.data, joinType: newType } } : e
                    )
                  )
                }
              }
            }
            setEdges((eds) => [...eds, newEdge])
          }
        }
      }

      // Add to query graph
      setQueryGraph((g) => addTable(g, { id: newId, name: tableName, schema }))
    },
    [nodes, availableTables, selectedColumns, dbType, schema, setEdges]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      const edgeId = `e-${connection.source}-${connection.target}`
      const newEdge: Edge<JoinEdgeData> = {
        id: edgeId,
        ...connection,
        type: 'joinEdge',
        data: {
          joinType: 'INNER',
          onJoinTypeChange: (eid, newType) => {
            setEdges((eds) =>
              eds.map((e) =>
                e.id === eid ? { ...e, data: { ...e.data, joinType: newType } } : e
              )
            )
          }
        }
      }
      setEdges((eds) => [...eds, newEdge])
    },
    [setEdges]
  )

  // Update SQL preview whenever graph state changes
  useEffect(() => {
    const graph: QueryGraph = {
      tables: nodes.map((n) => ({ id: n.id, name: n.id, schema })),
      joins: edges.map((e) => ({
        id: e.id,
        leftTableId: e.source,
        rightTableId: e.target,
        type: (e.data as JoinEdgeData)?.joinType || 'INNER',
        conditions: [{ leftTable: e.source, leftColumn: 'id', rightTable: e.target, rightColumn: 'id' }]
      })),
      selectFields: nodes.flatMap((n) => {
        const cols = selectedColumns.get(n.id)
        if (!cols || cols.size === 0) return []
        return Array.from(cols).map((col) => ({ tableId: n.id, column: col }))
      }),
      whereConditions: whereConditions.map((w) => ({
        id: w.id,
        tableId: nodes[0]?.id || '',
        column: w.column,
        operator: w.operator as any,
        value: w.value,
        connector: w.connector
      })),
      orderByFields,
      groupByFields: groupByFields.map((col) => ({ tableId: nodes[0]?.id || '', column: col })),
      havingConditions: [],
      limit,
      offset: 0
    }
    setPreviewSql(buildSql(graph, dbType))
  }, [nodes, edges, selectedColumns, whereConditions, orderByFields, groupByFields, limit, dbType, schema])

  const handleAddWhereCondition = () => {
    setWhereConditions((prev) => [
      ...prev,
      { id: uuidv4(), column: '', operator: '=', value: '', connector: 'AND' }
    ])
  }

  const handleRemoveWhereCondition = (id: string) => {
    setWhereConditions((prev) => prev.filter((w) => w.id !== id))
  }

  const handleUpdateWhereCondition = (id: string, field: string, value: string) => {
    setWhereConditions((prev) =>
      prev.map((w) => (w.id === id ? { ...w, [field]: value } : w))
    )
  }

  const handleAddOrderBy = () => {
    setOrderByFields((prev) => [...prev, { tableId: nodes[0]?.id || '', column: '', direction: 'ASC' }])
  }

  const handleRemoveOrderBy = (idx: number) => {
    setOrderByFields((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleUpdateOrderBy = (idx: number, field: string, value: string) => {
    setOrderByFields((prev) => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)))
  }

  const handleClearCanvas = () => {
    setNodes([])
    setEdges([])
    setSelectedColumns(new Map())
    setWhereConditions([])
    setOrderByFields([])
    setGroupByFields([])
    setQueryGraph(createEmptyQueryGraph())
    setPreviewSql('')
  }

  const allColumns = useMemo(() => {
    const cols: { table: string; name: string }[] = []
    for (const node of nodes) {
      const meta = availableTables.find((t) => t.name === node.id)
      if (meta) {
        for (const c of meta.columns) {
          cols.push({ table: node.id, name: c.name })
        }
      }
    }
    return cols
  }, [nodes, availableTables])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Typography.Text strong style={{ fontSize: 13 }}>
          {t('queryBuilder.title')}
        </Typography.Text>
        <div style={{ flex: 1 }} />
        <Button size="small" icon={<ClearOutlined />} onClick={handleClearCanvas}>
          {t('queryBuilder.clear')}
        </Button>
        <Button size="small" icon={<SendOutlined />} onClick={() => onSendToEditor(previewSql)}>
          {t('queryBuilder.sendToEditor')}
        </Button>
        <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => onExecute(previewSql)}>
          {t('queryBuilder.execute')}
        </Button>
      </div>

      {/* Main area: Canvas + Side panels */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Available tables sidebar */}
        <div style={{ width: 180, minWidth: 180, borderRight: '1px solid #f0f0f0', overflow: 'auto', padding: 8 }}>
          <Typography.Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            {t('queryBuilder.tables')}
          </Typography.Text>
          {availableTables.length === 0 ? (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {t('queryBuilder.loading')}
            </Typography.Text>
          ) : (
            availableTables.map((t) => (
              <div
                key={t.name}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/tableName', t.name)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                style={{
                  padding: '4px 8px',
                  marginBottom: 4,
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  borderRadius: 4,
                  cursor: 'grab',
                  fontSize: 12,
                  userSelect: 'none'
                }}
              >
                {t.name}
              </div>
            ))
          )}
        </div>

        {/* React Flow canvas */}
        <div ref={reactFlowWrapper} style={{ flex: 1, position: 'relative' }}>
          {nodes.length === 0 ? (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#bbb',
              fontSize: 14,
              zIndex: 1,
              pointerEvents: 'none'
            }}>
              {t('queryBuilder.dragTablesHint')}
            </div>
          ) : null}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            style={{ background: '#f9f9f9' }}
          >
            <Background />
            <Controls />
            <MiniMap style={{ width: 120, height: 80 }} />
          </ReactFlow>
        </div>

        {/* Right config panels */}
        <div style={{ width: 280, minWidth: 280, borderLeft: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
          <Tabs
            size="small"
            activeKey={activePanel}
            onChange={setActivePanel}
            tabBarStyle={{ margin: 0, paddingLeft: 8 }}
            items={[
              {
                key: 'filter',
                label: t('queryBuilder.filter'),
                children: (
                  <div style={{ padding: 8, overflow: 'auto', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Typography.Text strong style={{ fontSize: 12 }}>
                        {t('queryBuilder.whereConditions')}
                      </Typography.Text>
                      <Button size="small" icon={<PlusOutlined />} onClick={handleAddWhereCondition}>
                        {t('common.add')}
                      </Button>
                    </div>
                    {whereConditions.length === 0 ? (
                      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                        {t('queryBuilder.noConditions')}
                      </Typography.Text>
                    ) : (
                      whereConditions.map((w, i) => (
                        <div key={w.id} style={{ marginBottom: 6, padding: 6, background: '#fafafa', borderRadius: 4 }}>
                          {i > 0 && (
                            <Segmented
                              size="small"
                              value={w.connector}
                              onChange={(v) => handleUpdateWhereCondition(w.id, 'connector', v as string)}
                              options={['AND', 'OR']}
                              style={{ marginBottom: 4, fontSize: 11 }}
                            />
                          )}
                          <Space style={{ width: '100%' }} size={4}>
                            <Select
                              size="small"
                              style={{ width: 90 }}
                              value={w.column}
                              onChange={(v) => handleUpdateWhereCondition(w.id, 'column', v)}
                              placeholder="Column"
                              options={allColumns.filter((c) => c.table === (nodes[0]?.id || '')).map((c) => ({ label: c.name, value: c.name }))}
                            />
                            <Select
                              size="small"
                              style={{ width: 70 }}
                              value={w.operator}
                              onChange={(v) => handleUpdateWhereCondition(w.id, 'operator', v)}
                              options={['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN', 'IS NULL', 'IS NOT NULL', 'BETWEEN'].map((o) => ({ label: o, value: o }))}
                            />
                            {!['IS NULL', 'IS NOT NULL'].includes(w.operator) && (
                              <Input
                                size="small"
                                style={{ width: 60 }}
                                value={w.value}
                                onChange={(e) => handleUpdateWhereCondition(w.id, 'value', e.target.value)}
                                placeholder="val"
                              />
                            )}
                            <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => handleRemoveWhereCondition(w.id)} />
                          </Space>
                        </div>
                      ))
                    )}
                  </div>
                )
              },
              {
                key: 'sort',
                label: t('queryBuilder.sort'),
                children: (
                  <div style={{ padding: 8, overflow: 'auto', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Typography.Text strong style={{ fontSize: 12 }}>
                        {t('queryBuilder.orderBy')}
                      </Typography.Text>
                      <Button size="small" icon={<PlusOutlined />} onClick={handleAddOrderBy}>
                        {t('common.add')}
                      </Button>
                    </div>
                    {orderByFields.length === 0 ? (
                      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                        {t('queryBuilder.noSort')}
                      </Typography.Text>
                    ) : (
                      orderByFields.map((o, i) => (
                        <div key={i} style={{ marginBottom: 6, padding: 6, background: '#fafafa', borderRadius: 4 }}>
                          <Space size={4}>
                            <Select
                              size="small"
                              style={{ width: 120 }}
                              value={o.column}
                              onChange={(v) => handleUpdateOrderBy(i, 'column', v)}
                              placeholder="Column"
                              options={allColumns.map((c) => ({ label: `${c.table}.${c.name}`, value: c.name }))}
                            />
                            <Segmented
                              size="small"
                              value={o.direction}
                              onChange={(v) => handleUpdateOrderBy(i, 'direction', v as string)}
                              options={['ASC', 'DESC']}
                            />
                            <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => handleRemoveOrderBy(i)} />
                          </Space>
                        </div>
                      ))
                    )}
                  </div>
                )
              },
              {
                key: 'options',
                label: t('queryBuilder.options'),
                children: (
                  <div style={{ padding: 8, overflow: 'auto', flex: 1 }}>
                    <div style={{ marginBottom: 12 }}>
                      <Typography.Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                        {t('queryBuilder.limit')}
                      </Typography.Text>
                      <Input
                        size="small"
                        type="number"
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value) || 0)}
                        style={{ width: 100 }}
                      />
                    </div>
                    <div>
                      <Typography.Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                        {t('queryBuilder.groupBy')}
                      </Typography.Text>
                      <Select
                        mode="multiple"
                        size="small"
                        style={{ width: '100%' }}
                        value={groupByFields}
                        onChange={setGroupByFields}
                        options={allColumns.map((c) => ({ label: `${c.table}.${c.name}`, value: c.name }))}
                        placeholder={t('queryBuilder.selectGroupBy')}
                      />
                    </div>
                  </div>
                )
              }
            ]}
          />
        </div>
      </div>

      {/* SQL preview at bottom */}
      <div style={{ borderTop: '1px solid #f0f0f0', padding: '6px 12px', background: '#fafafa' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Typography.Text strong style={{ fontSize: 11 }}>
            {t('queryBuilder.sqlPreview')}
          </Typography.Text>
          {previewSql && (
            <Space size={4}>
              <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => onExecute(previewSql)}>
                {t('queryBuilder.execute')}
              </Button>
            </Space>
          )}
        </div>
        <pre
          style={{
            margin: 0,
            padding: '6px 10px',
            background: '#1e1e1e',
            color: '#d4d4d4',
            borderRadius: 4,
            fontSize: 12,
            maxHeight: 120,
            overflow: 'auto',
            fontFamily: 'Consolas, "Courier New", monospace'
          }}
        >
          {previewSql || t('queryBuilder.addTablesHint')}
        </pre>
      </div>
    </div>
  )
}

export default QueryBuilder
