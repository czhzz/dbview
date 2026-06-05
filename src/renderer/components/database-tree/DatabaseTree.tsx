import React, { useCallback } from 'react'
import { Tree, Dropdown, message } from 'antd'
import type { MenuProps } from 'antd'
import {
  DatabaseOutlined,
  TableOutlined,
  FieldStringOutlined,
  KeyOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  EyeOutlined
} from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import { databaseApi, connectionApi } from '../../services/api'
import { useConnectionStore } from '../../stores/connectionStore'
import { useUIStore } from '../../stores/uiStore'

const iconMap: Record<string, React.ReactNode> = {
  database: <DatabaseOutlined style={{ color: '#1677ff' }} />,
  table: <TableOutlined style={{ color: '#52c41a' }} />,
  view: <EyeOutlined style={{ color: '#722ed1' }} />,
  column: <FieldStringOutlined style={{ color: '#fa8c16' }} />,
  index: <KeyOutlined style={{ color: '#eb2f96' }} />,
  folder: <FolderOutlined />,
  folderOpen: <FolderOpenOutlined />
}

const DatabaseTree: React.FC = () => {
  const { connections, connectedIds, addConnected } = useConnectionStore()
  const { openTab } = useUIStore()
  const [treeData, setTreeData] = React.useState<DataNode[]>([])
  const [expandedKeys, setExpandedKeys] = React.useState<React.Key[]>([])

  // Build root nodes from connections
  React.useEffect(() => {
    const roots: DataNode[] = connections.map((conn) => ({
      key: `conn:${conn.id}`,
      title: conn.name,
      icon: iconMap.database,
      isLeaf: false,
      connId: conn.id,
      itemType: 'connection' as const
    }))
    setTreeData(roots)
  }, [connections])

  const loadChildren = useCallback(
    async (nodeKey: string): Promise<DataNode[]> => {
      const parts = nodeKey.split(':')
      const type = parts[0]
      const connId = parts[1]

      if (type === 'conn') {
        // Connect and load databases
        try {
          if (!connectedIds.has(connId)) {
            await connectionApi.connect(connId)
            addConnected(connId)
          }
          const dbs = await databaseApi.getDatabases(connId)
          return dbs.map((db: string) => ({
            key: `db:${connId}:${db}`,
            title: db,
            icon: iconMap.database,
            isLeaf: false,
            connId,
            itemType: 'database' as const,
            schema: db
          }))
        } catch (err) {
          message.error(`连接失败: ${err instanceof Error ? err.message : '未知错误'}`)
          return []
        }
      }

      if (type === 'db') {
        const schema = parts[2]
        const tables = await databaseApi.getTables(connId, schema)
        const views = await databaseApi.getViews(connId, schema)
        const children: DataNode[] = []

        if (tables.length > 0) {
          children.push({
            key: `folder:tables:${connId}:${schema}`,
            title: `表 (${tables.length})`,
            icon: iconMap.folder,
            isLeaf: false,
            connId,
            itemType: 'folder',
            selectable: false
          })
        }
        if (views.length > 0) {
          children.push({
            key: `folder:views:${connId}:${schema}`,
            title: `视图 (${views.length})`,
            icon: iconMap.folder,
            isLeaf: false,
            connId,
            itemType: 'folder',
            selectable: false
          })
        }
        return children
      }

      if (type.startsWith('folder')) {
        const folderType = parts[1]
        const schema = parts[3]
        const children: DataNode[] = []

        if (folderType === 'tables') {
          const tables = await databaseApi.getTables(connId, schema)
          for (const t of tables) {
            children.push({
              key: `table:${connId}:${schema}:${t.name}`,
              title: t.name,
              icon: iconMap.table,
              isLeaf: false,
              connId,
              itemType: 'table' as const,
              schema,
              tableName: t.name
            })
          }
        } else if (folderType === 'views') {
          const views = await databaseApi.getViews(connId, schema)
          for (const v of views) {
            children.push({
              key: `view:${connId}:${schema}:${v.name}`,
              title: v.name,
              icon: iconMap.view,
              isLeaf: true,
              connId,
              itemType: 'view' as const,
              schema,
              tableName: v.name
            })
          }
        }
        return children
      }

      if (type === 'table') {
        const schema = parts[2]
        const tableName = parts.slice(3).join(':')

        const [columns, indexes] = await Promise.all([
          databaseApi.getColumns(connId, tableName, schema),
          databaseApi.getIndexes(connId, tableName, schema)
        ])

        const children: DataNode[] = []

        children.push({
          key: `folder:columns:${connId}:${schema}:${tableName}`,
          title: `列 (${columns.length})`,
          icon: iconMap.folder,
          isLeaf: false,
          connId,
          itemType: 'folder',
          selectable: false
        })

        if (indexes.length > 0) {
          children.push({
            key: `folder:indexes:${connId}:${schema}:${tableName}`,
            title: `索引 (${indexes.length})`,
            icon: iconMap.folder,
            isLeaf: false,
            connId,
            itemType: 'folder',
            selectable: false
          })
        }

        return children
      }

      if (type === 'folder' && parts[1] === 'columns') {
        const schema = parts[2]
        const tableName = parts.slice(3).join(':')
        const columns = await databaseApi.getColumns(connId, tableName, schema)
        return columns.map((col) => ({
          key: `col:${connId}:${schema}:${tableName}:${col.name}`,
          title: `${col.name}  ${col.type}`,
          icon: col.key === 'PRI' ? <KeyOutlined style={{ color: '#eb2f96' }} /> : iconMap.column,
          isLeaf: true,
          connId,
          itemType: 'column' as const
        }))
      }

      if (type === 'folder' && parts[1] === 'indexes') {
        const schema = parts[2]
        const tableName = parts.slice(3).join(':')
        const indexes = await databaseApi.getIndexes(connId, tableName, schema)
        return indexes.map((idx) => ({
          key: `idx:${connId}:${schema}:${tableName}:${idx.name}`,
          title: idx.name,
          icon: iconMap.index,
          isLeaf: true,
          connId,
          itemType: 'index' as const
        }))
      }

      return []
    },
    [connectedIds, addConnected]
  )

  const onLoadData = async (node: DataNode): Promise<void> => {
    const key = String(node.key)
    const children = await loadChildren(key)
    setTreeData((prev) => updateTreeNode(prev, key, children))
  }

  // Context menu for table nodes
  const getContextMenu = (node: DataNode): MenuProps['items'] => {
    if (node.itemType !== 'table' && node.itemType !== 'view') return undefined

    const connId = node.connId
    const tableName = node.tableName
    const schema = node.schema

    const items: MenuProps['items'] = [
      {
        key: 'view-data',
        label: '查看数据',
        icon: <TableOutlined />,
        onClick: () =>
          openTab({
            key: `data:${connId}:${schema}:${tableName}`,
            title: tableName || '',
            type: 'data',
            connId: connId || '',
            table: tableName,
            schema
          })
      },
      {
        key: 'view-structure',
        label: '查看结构',
        icon: <FieldStringOutlined />,
        onClick: () =>
          openTab({
            key: `struct:${connId}:${schema}:${tableName}`,
            title: `${tableName} (结构)`,
            type: 'structure',
            connId: connId || '',
            table: tableName,
            schema
          })
      },
      { type: 'divider' },
      {
        key: 'copy-name',
        label: '复制表名',
        onClick: () => {
          navigator.clipboard.writeText(tableName || '')
          message.success('已复制表名')
        }
      },
      {
        key: 'new-query',
        label: '在新查询中打开',
        onClick: () => {
          const parts = node.key.toString().split(':')
          openTab({
            key: `query:${connId}:${Date.now()}`,
            title: `查询 - ${tableName}`,
            type: 'query',
            connId: connId || '',
            table: tableName
          })
        }
      }
    ]
    return items
  }

  const onDoubleClick = (_event: React.MouseEvent, node: DataNode) => {
    if (node.itemType === 'table' || node.itemType === 'view') {
      const connId = node.connId
      const tableName = node.tableName
      const schema = node.schema
      openTab({
        key: `data:${connId}:${schema}:${tableName}`,
        title: tableName || '',
        type: 'data',
        connId: connId || '',
        table: tableName,
        schema
      })
    }
  }

  const renderTitle = (node: DataNode): React.ReactNode => {
    const menuItems = getContextMenu(node)

    if (menuItems) {
      return (
        <Dropdown menu={{ items: menuItems }} trigger={['contextMenu']}>
          <span>{node.title as string}</span>
        </Dropdown>
      )
    }
    return <span>{node.title as string}</span>
  }

  return (
    <div className="database-tree" style={{ padding: '8px 0', overflow: 'auto', flex: 1 }}>
      {treeData.length === 0 ? (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: '#999',
            fontSize: 13
          }}
        >
          暂无连接，请先添加数据库连接
        </div>
      ) : (
        <Tree
          treeData={treeData.map((n) => ({ ...n, title: renderTitle(n) }))}
          loadData={onLoadData}
          onDoubleClick={onDoubleClick}
          expandedKeys={expandedKeys}
          onExpand={(keys) => setExpandedKeys(keys)}
          showIcon
          blockNode
          defaultExpandParent={false}
          className="database-tree"
        />
      )}
    </div>
  )
}

// Helper: recursively update tree node children
function updateTreeNode(
  nodes: DataNode[],
  key: string,
  children: DataNode[]
): DataNode[] {
  return nodes.map((node) => {
    if (node.key === key) {
      return { ...node, children }
    }
    if (node.children) {
      return { ...node, children: updateTreeNode(node.children, key, children) }
    }
    return node
  })
}

export default DatabaseTree