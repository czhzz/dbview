import React, { useMemo } from 'react'
import { Tree, Tag, Typography, Empty, Spin } from 'antd'
import { BugOutlined } from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import type { UnifiedExplainPlan } from '../../types/database'
import { useTranslation } from 'react-i18next'

interface Props {
  plan: UnifiedExplainPlan | null
  loading: boolean
  error?: string
}

function getCostColor(cost: number): string {
  if (cost <= 10) return '#52c41a'
  if (cost <= 100) return '#fa8c16'
  return '#ff4d4f'
}

function flattenPlan(node: UnifiedExplainPlan, depth = 0, index = 0): DataNode[] {
  const color = getCostColor(node.estimatedCost)
  const nodes: DataNode[] = [
    {
      key: `${depth}-${index}-${node.operation}`,
      title: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ fontWeight: depth === 0 ? 600 : 400 }}>{node.operation}</span>
          <Tag color={color} style={{ fontSize: 10 }}>
            cost: {node.estimatedCost}
          </Tag>
          <Typography.Text type="secondary" style={{ fontSize: 10 }}>
            rows: {node.estimatedRows}
          </Typography.Text>
          {node.actualTime !== undefined && (
            <Typography.Text type="secondary" style={{ fontSize: 10 }}>
              | actual: {node.actualTime}ms
            </Typography.Text>
          )}
          {node.actualRows !== undefined && (
            <Typography.Text type="secondary" style={{ fontSize: 10 }}>
              ({node.actualRows} rows)
            </Typography.Text>
          )}
        </span>
      ),
      children: node.children.length > 0 ? node.children.map((child, i) => flattenPlan(child, depth + 1, i)[0]) : undefined
    }
  ]
  return nodes
}

const ExplainTree: React.FC<Props> = ({ plan, loading, error }) => {
  const { t } = useTranslation()

  const treeData = useMemo(() => {
    if (!plan) return []
    return flattenPlan(plan)
  }, [plan])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
  }

  if (error) {
    return <Empty description={error} />
  }

  if (!plan) {
    return <Empty description={t('profiling.runExplainHint')} />
  }

  return (
    <div style={{ padding: 8, overflow: 'auto', height: '100%' }}>
      <Tree
        treeData={treeData}
        defaultExpandAll
        showLine
        style={{ fontSize: 12 }}
      />
    </div>
  )
}

export default ExplainTree
