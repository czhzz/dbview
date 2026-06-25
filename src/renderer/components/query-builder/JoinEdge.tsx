import React, { memo, useCallback } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps, type Edge } from '@xyflow/react'

export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS'

export interface JoinEdgeData {
  joinType: JoinType
  onJoinTypeChange: (edgeId: string, newType: JoinType) => void
  label?: string
}

const JOIN_COLORS: Record<JoinType, string> = {
  INNER: '#1677ff',
  LEFT: '#52c41a',
  RIGHT: '#fa8c16',
  FULL: '#722ed1',
  CROSS: '#ff4d4f'
}

const JOIN_LABELS: Record<JoinType, string> = {
  INNER: 'INNER',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  FULL: 'FULL',
  CROSS: 'CROSS'
}

const NEXT_TYPE: Record<JoinType, JoinType> = {
  INNER: 'LEFT',
  LEFT: 'RIGHT',
  RIGHT: 'FULL',
  FULL: 'CROSS',
  CROSS: 'INNER'
}

const JoinEdge: React.FC<EdgeProps<JoinEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  })

  const joinType = data?.joinType || 'INNER'
  const color = JOIN_COLORS[joinType]

  const handleClick = useCallback(() => {
    const nextType = NEXT_TYPE[joinType]
    data?.onJoinTypeChange(id, nextType)
  }, [id, joinType, data])

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: 2,
          cursor: 'pointer'
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            background: color,
            color: '#fff',
            padding: '2px 8px',
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            zIndex: 10
          }}
          onClick={handleClick}
        >
          {JOIN_LABELS[joinType]}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export default memo(JoinEdge)
