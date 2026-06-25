import React, { useState, useEffect } from 'react'
import { Modal, Table, Button, Space, Input, message, Typography, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { useShortcutStore } from '../stores/shortcutStore'
import type { ShortcutEntry } from '../types/database'

interface Props {
  open: boolean
  onClose: () => void
}

const ShortcutSettings: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation()
  const { shortcuts, setShortcut, resetToDefault, importFromJson, exportAsJson } = useShortcutStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (!listening || !editingId) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const parts: string[] = []
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
      if (e.shiftKey) parts.push('Shift')
      if (e.altKey) parts.push('Alt')

      const key = e.key
      if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') return

      const keyMap: Record<string, string> = {
        '`': '`', ',': ',', 'Tab': 'Tab', 'Enter': 'Enter',
        'Escape': 'Escape', 'Delete': 'Delete', 'Backspace': 'Backspace'
      }
      const mappedKey = keyMap[key] || (key.length === 1 ? key.toUpperCase() : key)
      parts.push(mappedKey)
      const combo = parts.join('+')

      if (editingId) {
        const result = setShortcut(editingId, combo)
        if (result.conflict) {
          message.warning(t('shortcuts.conflict', { name: result.conflictWith }))
        } else {
          message.success(t('shortcuts.updated'))
        }
      }

      setEditingId(null)
      setListening(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [listening, editingId, setShortcut, t])

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      if (importFromJson(text)) {
        message.success(t('shortcuts.importSuccess'))
      } else {
        message.error(t('shortcuts.importFailed'))
      }
    }
    input.click()
  }

  const handleExport = () => {
    const json = exportAsJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dbview-shortcuts.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredShortcuts = shortcuts.filter((s) =>
    s.label.toLowerCase().includes(filter.toLowerCase()) ||
    s.category.toLowerCase().includes(filter.toLowerCase())
  )

  const categories = [...new Set(shortcuts.map((s) => s.category))]

  const columns = [
    {
      title: t('shortcuts.category'),
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (cat: string) => {
        const colorMap: Record<string, string> = {
          editor: 'blue',
          navigation: 'green',
          data: 'orange',
          general: 'default'
        }
        return <Tag color={colorMap[cat] || 'default'}>{t(`shortcuts.category_${cat}`)}</Tag>
      }
    },
    {
      title: t('shortcuts.action'),
      dataIndex: 'label',
      key: 'label',
      width: 200
    },
    {
      title: t('shortcuts.keys'),
      dataIndex: 'keys',
      key: 'keys',
      width: 200,
      render: (keys: string, record: ShortcutEntry) => (
        <Space>
          {editingId === record.id ? (
            <Typography.Text keyboard style={{ background: '#e6f7ff', padding: '2px 8px' }}>
              {t('shortcuts.pressKeys')}
            </Typography.Text>
          ) : (
            <Typography.Text
              keyboard
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setEditingId(record.id)
                setListening(true)
              }}
            >
              {keys}
            </Typography.Text>
          )}
          {record.keys !== record.defaultKeys && (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              ({t('shortcuts.default')}: {record.defaultKeys})
            </Typography.Text>
          )}
        </Space>
      )
    }
  ]

  return (
    <Modal
      title={t('shortcuts.title')}
      open={open}
      onCancel={onClose}
      width={700}
      footer={
        <Space>
          <Button onClick={handleImport}>{t('shortcuts.import')}</Button>
          <Button onClick={handleExport}>{t('shortcuts.export')}</Button>
          <Button onClick={resetToDefault}>{t('shortcuts.resetToDefault')}</Button>
          <Button type="primary" onClick={onClose}>{t('common.close')}</Button>
        </Space>
      }
    >
      <Input.Search
        placeholder={t('shortcuts.searchPlaceholder')}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ marginBottom: 16 }}
        allowClear
      />
      <Table
        columns={columns}
        dataSource={filteredShortcuts}
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ y: 400 }}
      />
    </Modal>
  )
}

export default ShortcutSettings
