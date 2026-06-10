import React from 'react'
import { Tabs, Button, Typography, Dropdown, Tooltip, Modal } from 'antd'
import {
  PlusOutlined,
  CloseOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  BulbOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CodeOutlined,
  FolderOutlined
} from '@ant-design/icons'
import { useUIStore } from '../stores/uiStore'
import DatabaseTree from '../components/database-tree/DatabaseTree'
import ConnectionGroups from '../components/connection/ConnectionGroups'
import { useConnectionStore } from '../stores/connectionStore'
import DataTable from '../components/data-table/DataTable'
import StructurePage from '../pages/StructurePage'
import SqlEditor from '../components/sql-editor/SqlEditor'
import { useEditorStore } from '../stores/editorStore'
import { useLogStore } from '../stores/logStore'
import SqlLogPanel from '../components/sql-log/SqlLogPanel'
import { useTheme, type ThemeMode } from '../hooks/useTheme'
import { setLanguage, getCurrentLanguage } from '../i18n'
import { connectionApi } from '../services/api'
import type { ConnectionGroup } from '../types/connection'

const MainLayout: React.FC = () => {
  const {
    sidebarWidth,
    setSidebarWidth,
    sidebarCollapsed,
    toggleSidebar,
    tabs,
    activeTabKey,
    closeTab,
    setActiveTab,
    statusText
  } = useUIStore()
  const { connections } = useConnectionStore()
  const { tabs: sqlTabs } = useEditorStore()
  const { panelVisible, togglePanel } = useLogStore()

  // Connection groups management modal
  const [groupsModalOpen, setGroupsModalOpen] = React.useState(false)
  const [groups, setGroups] = React.useState<ConnectionGroup[]>([])

  const loadGroups = React.useCallback(() => {
    connectionApi.listGroups().then(setGroups).catch(() => {})
  }, [])

  React.useEffect(() => {
    loadGroups()
  }, [loadGroups])

  // When groups change, notify DatabaseTree to reload
  const notifyGroupsChanged = React.useCallback(() => {
    loadGroups()
    window.dispatchEvent(new CustomEvent('dbview:groups-changed'))
  }, [loadGroups])

  const isResizing = React.useRef(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    const startX = e.clientX
    const startWidth = sidebarWidth

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return
      const diff = ev.clientX - startX
      setSidebarWidth(startWidth + diff)
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const renderTabContent = (key: string) => {
    const tab = tabs.find((t) => t.key === key)
    if (!tab) return null

    switch (tab.type) {
      case 'data':
        return <DataTable connId={tab.connId} table={tab.table || ''} schema={tab.schema} />
      case 'structure':
        return <StructurePage connId={tab.connId} table={tab.table || ''} schema={tab.schema} />
      case 'query': {
        const sqlTab = sqlTabs.find((st) => key.includes(st.id))
        return (
          <SqlEditor
            connId={tab.connId}
            initialSql={sqlTab?.sql}
            tabId={sqlTab?.id || key}
          />
        )
      }
      default:
        return null
    }
  }

  const onTabEdit = (
    targetKey: React.MouseEvent | React.KeyboardEvent | string,
    action: 'add' | 'remove'
  ) => {
    if (action === 'remove') {
      closeTab(targetKey as string)
    }
  }

  const { mode: themeMode, setMode: setThemeMode } = useTheme()

  const themeMenuItems = [
    { key: 'light', label: '☀️ 浅色', disabled: themeMode === 'light' },
    { key: 'dark', label: '🌙 深色', disabled: themeMode === 'dark' },
    { key: 'system', label: '💻 跟随系统', disabled: themeMode === 'system' }
  ]

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left sidebar - collapsed mode */}
        {sidebarCollapsed ? (
          <div
            style={{
              width: 36,
              minWidth: 36,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderRight: '1px solid #e8e8e8',
              background: '#fafafa',
              paddingTop: 8,
              gap: 8
            }}
          >
            <Tooltip title="展开侧边栏" placement="right">
              <Button
                type="text"
                size="small"
                icon={<MenuUnfoldOutlined />}
                onClick={toggleSidebar}
              />
            </Tooltip>
            <Tooltip title="新建连接" placement="right">
              <Button
                type="text"
                size="small"
                icon={<DatabaseOutlined />}
                onClick={() => {
                  // Expand sidebar first then open form
                  toggleSidebar()
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('dbview:new-connection'))
                  }, 50)
                }}
              />
            </Tooltip>
          </div>
        ) : (
          <>
            <div
              style={{
                width: sidebarWidth,
                minWidth: 200,
                maxWidth: 500,
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid #e8e8e8',
                background: '#fff',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #e8e8e8',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Typography.Text strong style={{ fontSize: 13 }}>
                  <DatabaseOutlined style={{ marginRight: 6 }} />
                  连接
                </Typography.Text>
                <div style={{ display: 'flex', gap: 2 }}>
                  <Tooltip title="新建连接">
                    <Button
                      type="text"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('dbview:new-connection'))
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="分组管理">
                    <Button
                      type="text"
                      size="small"
                      icon={<FolderOutlined />}
                      onClick={() => setGroupsModalOpen(true)}
                    />
                  </Tooltip>
                  <Tooltip title="折叠侧边栏">
                    <Button
                      type="text"
                      size="small"
                      icon={<MenuFoldOutlined />}
                      onClick={toggleSidebar}
                    />
                  </Tooltip>
                </div>
              </div>
              <DatabaseTree />
            </div>

            {/* Resize handle */}
            <div
              onMouseDown={handleMouseDown}
              style={{
                width: 4,
                cursor: 'col-resize',
                background: 'transparent',
                flexShrink: 0
              }}
            />
          </>
        )}

        {/* Right content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {tabs.length === 0 ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999'
            }}>
              <DatabaseOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
              <div style={{ marginTop: 16, fontSize: 16 }}>欢迎使用 DBView</div>
              <div style={{ marginTop: 8, fontSize: 13 }}>从左侧选择连接开始使用</div>
            </div>
          ) : (
            <Tabs
              type="editable-card"
              hideAdd
              activeKey={activeTabKey || undefined}
              onChange={setActiveTab}
              onEdit={onTabEdit as any}
              size="small"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              tabBarStyle={{ margin: 0, paddingLeft: 8 }}
              items={tabs.map((tab) => ({
                key: tab.key,
                label: (
                  <span style={{ fontSize: 12 }}>
                    {tab.title}
                  </span>
                ),
                children: (
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    {renderTabContent(tab.key)}
                  </div>
                )
              }))}
            />
          )}

          {/* SQL Log Panel */}
          <SqlLogPanel />
        </div>
      </div>

      {/* Status bar */}
      <div
        style={{
          height: 24,
          borderTop: '1px solid #e8e8e8',
          background: '#fafafa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          fontSize: 11,
          color: '#999'
        }}
      >
        <span>{statusText || '就绪'}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <Tooltip title={panelVisible ? '隐藏 SQL 日志' : '显示 SQL 日志'}>
            <Button
              type="text"
              size="small"
              style={{ fontSize: 11, color: panelVisible ? '#1677ff' : '#999', height: 20, padding: '0 4px' }}
              icon={<CodeOutlined />}
              onClick={togglePanel}
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: themeMenuItems,
              onClick: ({ key }) => setThemeMode(key as ThemeMode)
            }}
            trigger={['click']}
          >
            <Button type="text" size="small" style={{ fontSize: 11, color: '#999', height: 20, padding: '0 4px' }}>
              <BulbOutlined /> {themeMode === 'dark' ? '深色' : themeMode === 'light' ? '浅色' : '自动'}
            </Button>
          </Dropdown>
          <Dropdown
            menu={{
              items: [
                { key: 'zh', label: '中文', disabled: getCurrentLanguage() === 'zh' },
                { key: 'en', label: 'English', disabled: getCurrentLanguage() === 'en' }
              ],
              onClick: ({ key }) => setLanguage(key)
            }}
            trigger={['click']}
          >
            <Button type="text" size="small" style={{ fontSize: 11, color: '#999', height: 20, padding: '0 4px' }}>
              <GlobalOutlined /> {getCurrentLanguage() === 'zh' ? '中' : 'EN'}
            </Button>
          </Dropdown>
        </div>
      </div>

      {/* Connection groups management modal */}
      <Modal
        title="分组管理"
        open={groupsModalOpen}
        onCancel={() => setGroupsModalOpen(false)}
        footer={null}
        width={480}
        destroyOnClose
      >
        <ConnectionGroups groups={groups} onRefresh={notifyGroupsChanged} />
      </Modal>
    </div>
  )
}

export default MainLayout
