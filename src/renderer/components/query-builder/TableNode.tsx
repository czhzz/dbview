import React, { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Checkbox, Typography } from 'antd'
import { KeyOutlined } from '@ant-design/icons'

export interface TableNodeData {
  label: string
  columns: { name: string; type: string; key: string }[]
  selectedColumns: Set<string>
  onToggleColumn: (column: string) => void
  dbType: string
}

const TableNode: React.FC<NodeProps<TableNodeData>> = ({ data }) => {
  const { label, columns, selectedColumns, onToggleColumn, dbType } = data

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #d9d9d9',
        borderRadius: 6,
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        minWidth: 180,
        fontSize: 12
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#1677ff',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: '5px 5px 0 0',
          fontWeight: 600,
          fontSize: 13
        }}
      >
        {label}
      </div>

      {/* Columns */}
      <div style={{ padding: '2px 0' }}>
        {columns.map((col) => {
          const isSelected = selectedColumns.has(col.name)
          return (
            <div
              key={col.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '3px 12px',
                cursor: 'pointer',
                background: isSelected ? '#e6f4ff' : undefined,
                borderBottom: '1px solid #f0f0f0'
              }}
              onClick={() => onToggleColumn(col.name)}
            >
              <Checkbox checked={isSelected} style={{ marginRight: 6 }} size="small" />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {col.name}
              </span>
              {col.key === 'PRI' && (
                <KeyOutlined style={{ color: '#faad14', fontSize: 11, marginLeft: 4 }} />
              )}
              <Typography.Text
                type="secondary"
                style={{ fontSize: 10, marginLeft: 4, flexShrink: 0 }}
              >
                {col.type}
              </Typography.Text>
            </div>
          )
        })}
      </div>

      {/* Connection handles */}
      <Handle type="source" position={Position.Bottom} style={{ background: '#1677ff' }} />
      <Handle type="target" position={Position.Top} style={{ background: '#1677ff' }} />
    </div>
  )
}

export default memo(TableNode)
