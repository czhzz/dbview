import React, { useState, useCallback } from 'react'
import { Button, Input, List, Popconfirm, Space, Typography, message } from 'antd'
import { FolderAddOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { connectionApi } from '../../services/api'
import type { ConnectionGroup } from '../../types/connection'

interface Props {
  groups: ConnectionGroup[]
  onRefresh: () => void
}

const ConnectionGroups: React.FC<Props> = ({ groups, onRefresh }) => {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return
    try {
      await connectionApi.createGroup(newName.trim())
      setNewName('')
      setCreating(false)
      onRefresh()
    } catch {
      message.error('创建分组失败')
    }
  }, [newName, onRefresh])

  const handleRename = useCallback(async (id: string) => {
    if (!editName.trim()) return
    try {
      await connectionApi.renameGroup(id, editName.trim())
      setEditingId(null)
      onRefresh()
    } catch {
      message.error('重命名失败')
    }
  }, [editName, onRefresh])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await connectionApi.deleteGroup(id)
      onRefresh()
    } catch {
      message.error('删除分组失败')
    }
  }, [onRefresh])

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text strong style={{ fontSize: 13 }}>分组管理</Typography.Text>
        <Button
          size="small"
          icon={<FolderAddOutlined />}
          onClick={() => setCreating(true)}
        >
          新建分组
        </Button>
      </div>

      {creating && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Input
            size="small"
            placeholder="分组名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onPressEnter={handleCreate}
            autoFocus
          />
          <Button size="small" type="primary" onClick={handleCreate}>确定</Button>
          <Button size="small" onClick={() => { setCreating(false); setNewName('') }}>取消</Button>
        </div>
      )}

      <List
        size="small"
        dataSource={groups}
        renderItem={(group) => (
          <List.Item
            style={{ padding: '4px 0' }}
            actions={
              editingId === group.id
                ? [
                    <Button key="ok" size="small" type="primary" onClick={() => handleRename(group.id)}>确定</Button>,
                    <Button key="cancel" size="small" onClick={() => setEditingId(null)}>取消</Button>
                  ]
                : [
                    <Button
                      key="edit"
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => { setEditingId(group.id); setEditName(group.name) }}
                    />,
                    <Popconfirm
                      key="delete"
                      title="删除此分组？分组内的连接将变为无分组状态"
                      onConfirm={() => handleDelete(group.id)}
                      okText="删除"
                      cancelText="取消"
                    >
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  ]
            }
          >
            {editingId === group.id ? (
              <Input
                size="small"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onPressEnter={() => handleRename(group.id)}
              />
            ) : (
              <span>📁 {group.name}</span>
            )}
          </List.Item>
        )}
        locale={{ emptyText: '暂无分组' }}
      />
    </div>
  )
}

export default ConnectionGroups
