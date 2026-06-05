import React from 'react'
import { Tabs, Button, Typography } from 'antd'
import { PlusOutlined, CloseOutlined, DatabaseOutlined } from '@ant-design/icons'
import { useUIStore } from '../stores/uiStore'
import DatabaseTree from '../components/database-tree/DatabaseTree'
import { useConnectionStore } from '../stores/connectionStore'
import ConnectionPage from '../pages/ConnectionPage'
import DataTable from '../components/data-table/DataTable'
import StructurePage from '../pages/StructurePage'
import SqlEditor from '../components/sql-editor/SqlEditor'
import { createNewTab, useEditorStore } from '../stores/editorStore'

const MainLayout: React.FC = () => {
  const {
    sidebarWidth,
    setSidebarWidth,
    tabs,
    activeTabKey,
    closeTab,
    setActiveTab,
    statusText
  } = useUIStore()
  const { connections } = useConnectionStore()
  const { tabs: sqlTabs, addTab, activeTabId } = useEditorStore()

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

  const handleAddQueryTab = () => {
    const tab = createNewTab()
    addTab(tab)
    if (activeConnection) {
      useUIStore.getState().openTab({
        key: `query-${tab.id}`,
        title: tab.title,
        type: 'query',
        connId: activeConnection
      })
    }
  }

  const activeConnection =
    useConnectionStore.getState().activeConnectionId ||
    connections[0]?.id

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
        return <ConnectionPage />
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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left sidebar */}
        <div
          style={{
            width: sidebarWidth,
            minWidth: 200,
            maxWidth: 500,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #e8e8e8',
            background: '#fafafa'
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
              数据库浏览器
            </Typography.Text>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddQueryTab}
              title="新建查询"
            />
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

        {/* Right content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {tabs.length === 0 ? (
            <ConnectionPage />
          ) : (
            <Tabs
              type="editable-card"
              hideAdd
              activeKey={activeTabKey || undefined}
              onChange={setActiveTab}
              onEdit={onTabEdit as any}
              size="small"
              style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              tabBarStyle={{ margin: 0, paddingLeft: 8 }}
              items={tabs.map((tab) => ({
                key: tab.key,
                label: (
                  <span style={{ fontSize: 12 }}>
                    {tab.title}
                    <CloseOutlined
                      style={{ marginLeft: 6, fontSize: 10 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        closeTab(tab.key)
                      }}
                    />
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
          padding: '0 12px',
          fontSize: 11,
          color: '#999'
        }}
      >
        {statusText || '就绪'}
      </div>
    </div>
  )
}

export default MainLayout