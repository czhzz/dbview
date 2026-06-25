import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import { Button, Space, Typography, Input, Spin, Tooltip, Empty } from 'antd'
import { SearchOutlined, ZoomInOutlined, ZoomOutOutlined, ExpandOutlined, TableOutlined, KeyOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { erDiagramApi } from '../../services/api'
import type { ErDiagramData, ErDiagramTable } from '../../types/database'
import { Handle, Position } from '@xyflow/react'

// ---- Custom Table Entity Node ----

interface EntityNodeData {
  label: string
  comment?: string
  columns: { name: string; type: string; isPk: boolean; isFk: boolean }[]
  onNavigate: (tableName: string) => void
}

const EntityNode: React.FC<NodeProps<EntityNodeData>> = ({ data }) => {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #d9d9d9',
        borderRadius: 6,
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        minWidth: 160,
        fontSize: 12
      }}
      onDoubleClick={() => data.onNavigate(data.label)}
    >
      <div
        style={{
          background: '#1677ff',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: '5px 5px 0 0',
          fontWeight: 600,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}
      >
        <TableOutlined style={{ fontSize: 11 }} />
        {data.label}
        {data.comment && (
          <span style={{ fontWeight: 400, fontSize: 10, opacity: 0.8 }}>({data.comment})</span>
        )}
      </div>
      <div style={{ padding: '2px 0' }}>
        {data.columns.map((col) => (
          <div
            key={col.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '3px 12px',
              borderBottom: '1px solid #f0f0f0',
              fontSize: 11
            }}
          >
            {col.isPk && <KeyOutlined style={{ color: '#faad14', fontSize: 10, marginRight: 4 }} />}
            {col.isFk && <span style={{ color: '#1677ff', marginRight: 4, fontSize: 10 }}>🔗</span>}
            {!col.isPk && !col.isFk && <span style={{ width: 14, marginRight: 4 }} />}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {col.name}
            </span>
            <Typography.Text type="secondary" style={{ fontSize: 10, flexShrink: 0 }}>
              {col.type}
            </Typography.Text>
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#1677ff' }} />
      <Handle type="target" position={Position.Top} style={{ background: '#1677ff' }} />
    </div>
  )
}

const nodeTypes = { entityNode: EntityNode }

// ---- Layout helper ----

function layoutElements(
  tables: ErDiagramTable[],
  onNavigate: (name: string) => void
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 100 })

  const nodes: Node[] = tables.map((t) => {
    const id = t.name
    const width = 180
    const colCount = t.columns.length
    const height = Math.max(60, 30 + colCount * 24)
    g.setNode(id, { width, height })
    return {
      id,
      type: 'entityNode',
      position: { x: 0, y: 0 }, // dagre will compute
      data: {
        label: t.name,
        comment: t.comment,
        columns: t.columns.map((c) => ({
          name: c.name,
          type: c.type,
          isPk: t.primaryKey.includes(c.name),
          isFk: t.foreignKeys.some((fk) => fk.column === c.name)
        })),
        onNavigate
      },
      style: { width, height }
    }
  })

  const edges: Edge[] = []
  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      if (fk.refTable && tables.some((t) => t.name === fk.refTable)) {
        edges.push({
          id: `e-${table.name}-${fk.refTable}-${fk.column}`,
          source: table.name,
          target: fk.refTable,
          sourceHandle: null,
          targetHandle: null,
          type: 'smoothstep',
          style: { stroke: '#1677ff', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#1677ff' },
          label: fk.column,
          labelStyle: { fontSize: 9, fill: '#1677ff' }
        })
      }
    }
  }

  dagre.layout(g)

  const positionedNodes = nodes.map((n) => {
    const dagreNode = g.node(n.id)
    return {
      ...n,
      position: {
        x: dagreNode.x - (dagreNode.width || 180) / 2,
        y: dagreNode.y - (dagreNode.height || 60) / 2
      }
    }
  })

  return { nodes: positionedNodes, edges }
}

// ---- Main Component ----

interface Props {
  connId: string
  schema?: string
  onNavigateToTable: (tableName: string) => void
}

const ERDiagram: React.FC<Props> = ({ connId, schema, onNavigateToTable }) => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [erData, setErData] = useState<ErDiagramData | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [searchText, setSearchText] = useState('')
  const [showAll, setShowAll] = useState(true)
  const [relatedOnly, setRelatedOnly] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await erDiagramApi.getData(connId, schema)
      setErData(data)
    } catch (err) {
      console.error('Failed to load ER diagram data:', err)
    } finally {
      setLoading(false)
    }
  }, [connId, schema])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter and layout tables
  const filteredTables = useMemo(() => {
    if (!erData) return []

    let tables = erData.tables

    // Search filter
    if (searchText) {
      const lower = searchText.toLowerCase()
      tables = tables.filter((t) => t.name.toLowerCase().includes(lower))
    }

    // Related only
    if (relatedOnly) {
      const related = new Set<string>()
      related.add(relatedOnly)
      const table = erData.tables.find((t) => t.name === relatedOnly)
      if (table) {
        for (const fk of table.foreignKeys) {
          if (fk.refTable) related.add(fk.refTable)
        }
        // Reverse: find tables that reference this table
        for (const t of erData.tables) {
          if (t.foreignKeys.some((fk) => fk.refTable === relatedOnly)) {
            related.add(t.name)
          }
        }
      }
      tables = tables.filter((t) => related.has(t.name))
    }

    return tables
  }, [erData, searchText, relatedOnly])

  // Layout whenever filtered tables change
  useEffect(() => {
    if (filteredTables.length === 0) {
      setNodes([])
      setEdges([])
      return
    }

    const { nodes: layoutNodes, edges: layoutEdges } = layoutElements(
      filteredTables,
      (name) => onNavigateToTable(name)
    )

    setNodes(layoutNodes)
    setEdges(layoutEdges)
  }, [filteredTables, setNodes, setEdges, onNavigateToTable])

  const handleShowRelated = (tableName: string) => {
    setRelatedOnly(tableName)
    setShowAll(false)
  }

  const handleShowAll = () => {
    setRelatedOnly(null)
    setShowAll(true)
    setSearchText('')
  }

  const handleNodeClick = (_event: React.MouseEvent, node: Node) => {
    setSelectedTable(node.id)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin tip={t('erDiagram.loading')} />
      </div>
    )
  }

  if (!erData || erData.tables.length === 0) {
    return (
      <Empty description={t('erDiagram.noData')} style={{ marginTop: 80 }} />
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ padding: '6px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Typography.Text strong style={{ fontSize: 13 }}>
          {t('erDiagram.title')}
        </Typography.Text>
        <div style={{ flex: 1 }} />
        <Input
          size="small"
          prefix={<SearchOutlined />}
          placeholder={t('erDiagram.searchPlaceholder')}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 200 }}
          allowClear
        />
        <Space size={4}>
          <Tooltip title={t('erDiagram.showAll')}>
            <Button size="small" icon={<ExpandOutlined />} onClick={handleShowAll} disabled={showAll}>
              {t('erDiagram.allTables')}
            </Button>
          </Tooltip>
          {!showAll && relatedOnly && (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {t('erDiagram.showingRelatedTo')}: {relatedOnly}
            </Typography.Text>
          )}
        </Space>
      </div>

      {/* React Flow canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={3}
          style={{ background: '#f9f9f9' }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap style={{ width: 140, height: 100 }} />
        </ReactFlow>
      </div>
    </div>
  )
}

export default ERDiagram
