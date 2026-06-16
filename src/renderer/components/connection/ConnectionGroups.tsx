import React, { useState, useCallback } from 'react'
import { Button, Input, List, Popconfirm, Space, Typography, message } from 'antd'
import { FolderAddOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { connectionApi } from '../../services/api'
import type { ConnectionGroup } from '../../types/connection'

interface Props {
  groups: ConnectionGroup[]
  onRefresh: () => void
}

const ConnectionGroups: React.FC<Props> = ({ groups, onRefresh }) => {
  const { t } = useTranslation()
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
      message.error(t('connectionGroups.createFailed'))
    }
  }, [newName, onRefresh, t])

  const handleRename = useCallback(async (id: string) => {
    if (!editName.trim()) return
    try {
      await connectionApi.renameGroup(id, editName.trim())
      setEditingId(null)
      onRefresh()
    } catch {
      message.error(t('connectionGroups.renameFailed'))
    }
  }, [editName, onRefresh, t])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await connectionApi.deleteGroup(id)
      onRefresh()
    } catch {
      message.error(t('connectionGroups.deleteFailed'))
    }
  }, [onRefresh, t])

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text strong style={{ fontSize: 13 }}>{t('connectionGroups.title')}</Typography.Text>
        <Button
          size="small"
          icon={<FolderAddOutlined />}
          onClick={() => setCreating(true)}
        >
          {t('connectionGroups.newGroup')}
        </Button>
      </div>

      {creating && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Input
            size="small"
            placeholder={t('connectionGroups.groupNamePlaceholder')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onPressEnter={handleCreate}
            autoFocus
          />
          <Button size="small" type="primary" onClick={handleCreate}>{t('common.confirm')}</Button>
          <Button size="small" onClick={() => { setCreating(false); setNewName('') }}>{t('common.cancel')}</Button>
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
                    <Button key="ok" size="small" type="primary" onClick={() => handleRename(group.id)}>{t('common.confirm')}</Button>,
                    <Button key="cancel" size="small" onClick={() => setEditingId(null)}>{t('common.cancel')}</Button>
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
                      title={t('connectionGroups.deleteConfirm')}
                      onConfirm={() => handleDelete(group.id)}
                      okText={t('common.delete')}
                      cancelText={t('common.cancel')}
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
        locale={{ emptyText: t('connectionGroups.noGroups') }}
      />
    </div>
  )
}

export default ConnectionGroups
