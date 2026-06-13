import React, { useCallback, useRef, useState } from 'react'
import { Tree, Dropdown, message, Popconfirm, Input } from 'antd'
import type { MenuProps } from 'antd'
import {
  DatabaseOutlined,
  TableOutlined,
  FieldStringOutlined,
  KeyOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  EyeOutlined,
  CodeOutlined,
  ThunderboltOutlined,
  UserOutlined,
  FileTextOutlined,
  ApiOutlined,
  DisconnectOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined,
  PlaySquareOutlined
} from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import { databaseApi, connectionApi, historyApi } from '../../services/api'
import { useConnectionStore } from '../../stores/connectionStore'
import { useUIStore } from '../../stores/uiStore'
import { createNewTab, useEditorStore } from '../../stores/editorStore'
import ConnectionForm from '../connection/ConnectionForm'
import type { ConnectionConfig, ConnectionConfigInput, ConnectionGroup } from '../../types/connection'
import { useTranslation } from 'react-i18next'

const iconMap: Record<string, React.ReactNode> = {
  database: <DatabaseOutlined style={{ color: '#1677ff' }} />,
  table: <TableOutlined style={{ color: '#52c41a' }} />,
  view: <EyeOutlined style={{ color: '#722ed1' }} />,
  column: <FieldStringOutlined style={{ color: '#fa8c16' }} />,
  index: <KeyOutlined style={{ color: '#eb2f96' }} />,
  folder: <FolderOutlined />,
  folderOpen: <FolderOpenOutlined />,
  procedure: <CodeOutlined style={{ color: '#13c2c2' }} />,
  function: <ThunderboltOutlined style={{ color: '#faad14' }} />,
  user: <UserOutlined style={{ color: '#1677ff' }} />,
  query: <FileTextOutlined style={{ color: '#eb2f96' }} />
}

const DB_TYPE_LABELS: Record<string, string> = {
  mysql: 'MySQL',
  postgresql: 'PostgreSQL',
  sqlite: 'SQLite',
  oracle: 'Oracle'
}

const DB_TYPE_COLORS: Record<string, string> = {
  mysql: '#1677ff',
  postgresql: '#52c41a',
  sqlite: '#fa8c16',
  oracle: '#eb2f96'
}

const DatabaseTree: React.FC = () => {
  const { t } = useTranslation()
  const {
    connections,
    connectedIds,
    addConnected,
    removeConnected,
    loadConnections,
    addConnection,
    removeConnection,
    updateConnection
  } = useConnectionStore()
  const { openTab } = useUIStore()
  const { addTab } = useEditorStore()
  const [searchText, setSearchText] = useState('')

  const [treeData, setTreeData] = React.useState<DataNode[]>([])
  const treeDataRef = useRef(treeData)
  treeDataRef.current = treeData
  const [expandedKeys, setExpandedKeys] = React.useState<React.Key[]>([])
  const prevConnectedRef = React.useRef<Set<string>>(new Set())

  // Connection form state
  const [formOpen, setFormOpen] = React.useState(false)
  const [editConfig, setEditConfig] = React.useState<ConnectionConfig | null>(null)
  const [formLoading, setFormLoading] = React.useState(false)

  // Groups state
  const [groups, setGroups] = React.useState<ConnectionGroup[]>([])

  // Load connections and groups on mount
  React.useEffect(() => {
    loadConnections()
    connectionApi.listGroups().then(setGroups).catch(() => {})
  }, [])

  // Listen for new-connection event from sidebar header button
  React.useEffect(() => {
    const handler = () => {
      setEditConfig(null)
      setFormOpen(true)
    }
    window.addEventListener('dbview:new-connection', handler)
    return () => window.removeEventListener('dbview:new-connection', handler)
  }, [])

  // Listen for groups-changed event from ConnectionGroups modal
  React.useEffect(() => {
    const handler = () => {
      connectionApi.listGroups().then(setGroups).catch(() => {})
    }
    window.addEventListener('dbview:groups-changed', handler)
    return () => window.removeEventListener('dbview:groups-changed', handler)
  }, [])

  // Build root nodes from connections + groups.
  // IMPORTANT: do NOT depend on connectedIds here. Rebuilding the tree while
  // antd's loadData is in-flight (which happens because loadChildren calls
  // addConnected → connectedIds changes mid-await) can leave nodes stuck in a
  // "loaded but empty" state inside rc-tree's internal loadedKeys cache.
  // Connection-icon color updates are handled in a separate effect below.
  React.useEffect(() => {
    setTreeData((prev) => {
      // Index previously-loaded children by node key for fast lookup
      const prevChildrenByKey = new Map<React.Key, DataNode[] | undefined>()
      const collect = (nodes: DataNode[]) => {
        for (const n of nodes) {
          if (n.children !== undefined) prevChildrenByKey.set(n.key, n.children)
          if (n.children) collect(n.children)
        }
      }
      collect(prev)

      const filteredConns = searchText
        ? connections.filter((c) => c.name.toLowerCase().includes(searchText.toLowerCase()))
        : connections

      const groupedConns = new Map<string, ConnectionConfig[]>()
      const ungroupedConns: ConnectionConfig[] = []
      for (const conn of filteredConns) {
        if (conn.groupId) {
          const list = groupedConns.get(conn.groupId) || []
          list.push(conn)
          groupedConns.set(conn.groupId, list)
        } else {
          ungroupedConns.push(conn)
        }
      }

      const roots: DataNode[] = []

      for (const group of groups) {
        const groupConns = groupedConns.get(group.id) || []
        const key = `group:${group.id}`
        roots.push({
          key,
          title: group.name,
          icon: iconMap.folder,
          isLeaf: false,
          itemType: 'group' as const,
          groupId: group.id,
          children: groupConns.map((conn) => {
            const node = buildConnectionNode(conn)
            const cached = prevChildrenByKey.get(node.key)
            return cached !== undefined ? { ...node, children: cached } : node
          })
        })
      }

      for (const conn of ungroupedConns) {
        const node = buildConnectionNode(conn)
        const cached = prevChildrenByKey.get(node.key)
        roots.push(cached !== undefined ? { ...node, children: cached } : node)
      }

      return roots
    })
  }, [connections, groups, searchText])

  // (Optional) Update connection-node icon color when connectedIds changes.
  // Kept conservative: only re-create the node object when the connected flag
  // actually flipped — never touch its children. This avoids invalidating
  // antd's loadedKeys cache when we don't need to.
  React.useEffect(() => {
    setTreeData((prev) => {
      let changed = false
      const patch = (nodes: DataNode[]): DataNode[] => {
        const next = nodes.map((n) => {
          const k = String(n.key)
          if (k.startsWith('conn:')) {
            const id = k.slice(5)
            const isConnected = connectedIds.has(id)
            const prevConnected = (n as any).__connected
            if (prevConnected === isConnected) return n
            changed = true
            return {
              ...n,
              __connected: isConnected,
              icon: <DatabaseOutlined style={{ color: isConnected ? '#52c41a' : '#999' }} />
            }
          }
          if (n.children) {
            const newChildren = patch(n.children)
            if (newChildren !== n.children) {
              return { ...n, children: newChildren }
            }
          }
          return n
        })
        return next
      }
      const out = patch(prev)
      return changed ? out : prev
    })
  }, [connectedIds])

  const buildConnectionNode = (conn: ConnectionConfig): DataNode => {
    const isConnected = connectedIds.has(conn.id)
    return {
      key: `conn:${conn.id}`,
      title: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100%' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conn.name}</span>
          <span style={{
            fontSize: 10,
            color: DB_TYPE_COLORS[conn.type] || '#999',
            background: `${DB_TYPE_COLORS[conn.type] || '#999'}15`,
            padding: '0 4px',
            borderRadius: 3,
            lineHeight: '16px',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}>
            {DB_TYPE_LABELS[conn.type] || conn.type}
          </span>
        </span>
      ),
      icon: <DatabaseOutlined style={{ color: isConnected ? '#52c41a' : '#999' }} />,
      isLeaf: false,
      connId: conn.id,
      connConfig: conn,
      itemType: 'connection' as const
    }
  }

  const loadChildren = useCallback(
    async (nodeKey: string): Promise<DataNode[]> => {
      const parts = nodeKey.split(':')
      const type = parts[0]
      let connId = parts[1]

      if (type === 'conn') {
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
        const [tables, views, routines] = await Promise.all([
          databaseApi.getTables(connId, schema),
          databaseApi.getViews(connId, schema),
          databaseApi.getRoutines(connId, schema).catch(() => [])
        ])
        const children: DataNode[] = []

        // Always show Tables, Views, Queries, Users (Navicat style)
        children.push({
          key: `folder:tables:${connId}:${schema}`,
          title: `表 (${tables.length})`,
          icon: iconMap.folder,
          isLeaf: false,
          connId,
          itemType: 'folder',
          selectable: false
        })
        children.push({
          key: `folder:views:${connId}:${schema}`,
          title: `视图 (${views.length})`,
          icon: iconMap.folder,
          isLeaf: false,
          connId,
          itemType: 'folder',
          selectable: false
        })
        children.push({
          key: `folder:queries:${connId}:${schema}`,
          title: `查询`,
          icon: iconMap.folder,
          isLeaf: false,
          connId,
          itemType: 'folder',
          selectable: false
        })
        children.push({
          key: `folder:users:${connId}:${schema}`,
          title: `用户`,
          icon: iconMap.folder,
          isLeaf: false,
          connId,
          itemType: 'folder',
          selectable: false
        })

        // Procedures and Functions only if they exist
        const procedures = routines.filter((r) => r.type === 'PROCEDURE')
        const functions = routines.filter((r) => r.type === 'FUNCTION')
        if (procedures.length > 0) {
          children.push({
            key: `folder:procedures:${connId}:${schema}`,
            title: `存储过程 (${procedures.length})`,
            icon: iconMap.folder,
            isLeaf: false,
            connId,
            itemType: 'folder',
            selectable: false
          })
        }
        if (functions.length > 0) {
          children.push({
            key: `folder:functions:${connId}:${schema}`,
            title: `函数 (${functions.length})`,
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
        // key format: folder:FOLDERTYPE:CONNID:SCHEMA[:TABLE]
        const folderType = parts[1]
        connId = parts[2]
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
        } else if (folderType === 'queries') {
          const result = await historyApi.list(connId, undefined, 50)
          const histories = result.items
          for (const h of histories) {
            const shortSql = h.sql.length > 60 ? h.sql.substring(0, 60) + '...' : h.sql
            children.push({
              key: `query:${connId}:${schema}:${h.id}`,
              title: shortSql,
              icon: iconMap.query,
              isLeaf: true,
              connId,
              itemType: 'query' as const,
              schema,
              sql: h.sql
            })
          }
        } else if (folderType === 'users') {
          const users = await databaseApi.getUsers(connId, schema).catch(() => [])
          for (const u of users) {
            const displayText = u.host ? `${u.name}@${u.host}` : u.name
            children.push({
              key: `user:${connId}:${schema}:${u.name}`,
              title: displayText,
              icon: iconMap.user,
              isLeaf: true,
              connId,
              itemType: 'user' as const,
              schema
            })
          }
        } else if (folderType === 'procedures' || folderType === 'functions') {
          const routines = await databaseApi.getRoutines(connId, schema).catch(() => [])
          const filtered = routines.filter((r) =>
            folderType === 'procedures' ? r.type === 'PROCEDURE' : r.type === 'FUNCTION'
          )
          for (const r of filtered) {
            children.push({
              key: `routine:${connId}:${schema}:${r.type}:${r.name}`,
              title: r.name,
              icon: r.type === 'PROCEDURE' ? iconMap.procedure : iconMap.function,
              isLeaf: true,
              connId,
              itemType: 'routine' as const,
              schema,
              routineName: r.name,
              routineType: r.type
            })
          }
        } else if (folderType === 'columns') {
          // key format: folder:columns:CONNID:SCHEMA:TABLE
          const tableName = parts.slice(4).join(':')
          const columns = await databaseApi.getColumns(connId, tableName, schema)
          return columns.map((col) => ({
            key: `col:${connId}:${schema}:${tableName}:${col.name}`,
            title: `${col.name}  ${col.type}`,
            icon: col.key === 'PRI' ? <KeyOutlined style={{ color: '#eb2f96' }} /> : iconMap.column,
            isLeaf: true,
            connId,
            itemType: 'column' as const
          }))
        } else if (folderType === 'indexes') {
          // key format: folder:indexes:CONNID:SCHEMA:TABLE
          const tableName = parts.slice(4).join(':')
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

      return []
    },
    [connectedIds, addConnected]
  )

  // Store latest loadChildren in a ref to avoid effect-dependency cycles
  // (loadChildren depends on connectedIds; the effect below also depends on connectedIds.
  // Including loadChildren in the effect deps risks TDZ during HMR / strict-mode init.)
  const loadChildrenRef = useRef(loadChildren)
  loadChildrenRef.current = loadChildren

  // Auto-expand newly connected connections and load their children.
  // Only load if the node doesn't already have children (avoid racing with onLoadData,
  // which is fired by antd Tree itself when the user clicks the expand caret).
  React.useEffect(() => {
    const prev = prevConnectedRef.current
    const newlyConnected: string[] = []
    connectedIds.forEach((id) => {
      if (!prev.has(id)) newlyConnected.push(`conn:${id}`)
    })

    if (newlyConnected.length === 0) {
      prevConnectedRef.current = new Set(connectedIds)
      return
    }

    setExpandedKeys((p) => Array.from(new Set([...p, ...newlyConnected])))

    let cancelled = false
    ;(async () => {
      for (const key of newlyConnected) {
        // Skip if node already has children (loaded via onLoadData).
        // Read latest treeData via ref to avoid stale closure.
        if (findNodeChildren(treeDataRef.current, key) !== undefined) continue
        const children = await loadChildrenRef.current(key)
        if (cancelled) return
        setTreeData((p) => updateTreeNode(p, key, children))
      }
      if (!cancelled) prevConnectedRef.current = new Set(connectedIds)
    })()

    return () => { cancelled = true }
  }, [connectedIds])

  // Connection CRUD handlers
  const handleCreate = async (values: ConnectionConfigInput) => {
    setFormLoading(true)
    try {
      const config = await connectionApi.create(values)
      message.success('连接已创建')
      setFormOpen(false)
      addConnection(config)
    } catch (err) {
      message.error(`创建失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdate = async (values: ConnectionConfigInput) => {
    if (!editConfig) return
    setFormLoading(true)
    try {
      const updated = {
        ...editConfig,
        ...values,
        password: values.password || editConfig.password,
        updatedAt: Date.now()
      }
      await connectionApi.update(updated)
      message.success('连接已更新')
      setFormOpen(false)
      setEditConfig(null)
      updateConnection(updated)
    } catch (err) {
      message.error(`更新失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await connectionApi.delete(id)
      message.success('连接已删除')
      removeConnection(id)
      if (connectedIds.has(id)) {
        removeConnected(id)
      }
    } catch (err) {
      message.error(`删除失败: ${err instanceof Error ? err.message : '未知错误'}`)
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      const config = await connectionApi.getById(id)
      if (!config) return
      const { id: _id, createdAt: _c, updatedAt: _u, ...input } = config
      const cloned = await connectionApi.create({
        ...input,
        name: `${config.name} (副本)`
      })
      message.success('连接已复制')
      addConnection(cloned)
    } catch (err) {
      message.error(`复制失败: ${err instanceof Error ? err.message : '未知错误'}`)
    }
  }

  const handleConnect = async (id: string) => {
    try {
      await connectionApi.connect(id)
      addConnected(id)
      message.success('连接成功')
    } catch (err) {
      message.error(`连接失败: ${err instanceof Error ? err.message : '未知错误'}`)
    }
  }

  const handleDisconnect = async (id: string) => {
    try {
      await connectionApi.disconnect(id)
      removeConnected(id)
      message.success('已断开连接')
      const connKey = `conn:${id}`
      // Remove children of this connection node and collapse it
      setTreeData((prev) => {
        return prev.map((node) => {
          if (node.key === connKey) {
            return { ...node, children: undefined }
          }
          return node
        })
      })
      // Remove this node and all its descendants from expandedKeys
      setExpandedKeys((prev) => prev.filter((k) => !String(k).startsWith(`conn:${id}:`) && k !== connKey))
    } catch (err) {
      message.error(`断开失败: ${err instanceof Error ? err.message : '未知错误'}`)
    }
  }

  const onLoadData = async (node: DataNode): Promise<void> => {
    const key = String(node.key)
    const children = await loadChildren(key)
    setTreeData((prev) => updateTreeNode(prev, key, children))
  }

  // Handle expand: auto-connect when expanding an unconnected connection node
  const handleExpand = (keys: React.Key[], info: { node: DataNode; expanded: boolean }) => {
    setExpandedKeys(keys)
    if (info.expanded) {
      const key = String(info.node.key)
      if (key.startsWith('conn:')) {
        const connId = key.slice(5)
        if (!connectedIds.has(connId)) {
          handleConnect(connId)
        }
      }
    }
  }

  // Context menus
  const getContextMenu = (node: DataNode): MenuProps['items'] | undefined => {
    const itemType = node.itemType as string

    // Connection node context menu
    if (itemType === 'connection') {
      const connId = node.connId as string
      const isConnected = connectedIds.has(connId)
      const items: MenuProps['items'] = [
        isConnected
          ? {
              key: 'disconnect',
              label: '断开连接',
              icon: <DisconnectOutlined />,
              onClick: () => handleDisconnect(connId)
            }
          : {
              key: 'connect',
              label: '连接',
              icon: <ApiOutlined />,
              onClick: () => handleConnect(connId)
            },
        { type: 'divider' },
        {
          key: 'edit',
          label: '编辑连接',
          icon: <EditOutlined />,
          onClick: () => {
            const conn = connections.find((c) => c.id === connId)
            if (conn) {
              setEditConfig(conn)
              setFormOpen(true)
            }
          }
        },
        {
          key: 'duplicate',
          label: '复制连接',
          icon: <CopyOutlined />,
          onClick: () => handleDuplicate(connId)
        },
        { type: 'divider' },
        {
          key: 'delete',
          label: '删除连接',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete(connId)
        }
      ]
      return items
    }

    // Group node context menu
    if (itemType === 'group') {
      const groupId = node.groupId as string
      const items: MenuProps['items'] = [
        {
          key: 'add-connection',
          label: '新建连接',
          icon: <PlusOutlined />,
          onClick: () => {
            setEditConfig(null)
            setFormOpen(true)
          }
        },
        {
          key: 'delete-group',
          label: '删除分组',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: async () => {
            try {
              await connectionApi.deleteGroup(groupId)
              setGroups((prev) => prev.filter((g) => g.id !== groupId))
              // Reload connections that were in this group (they become ungrouped)
              loadConnections()
              message.success('分组已删除')
            } catch (err) {
              message.error(`删除分组失败: ${err instanceof Error ? err.message : '未知错误'}`)
            }
          }
        }
      ]
      return items
    }

    // Database node context menu
    if (itemType === 'database') {
      const connId = node.connId as string
      const schema = node.schema as string
      const items: MenuProps['items'] = [
        {
          key: 'new-query',
          label: '新建查询',
          icon: <FileTextOutlined />,
          onClick: () => {
            const tab = createNewTab()
            addTab(tab)
            openTab({
              key: `query-${tab.id}`,
              title: `查询 - ${schema}`,
              type: 'query',
              connId,
              schema
            })
          }
        },
        {
          key: 'refresh',
          label: '刷新',
          onClick: async () => {
            const key = String(node.key)
            // Load children and eagerly pre-load sub-folders so antd doesn't
            // block on its internal loadedKeys cache
            const children = await loadChildren(key)
            for (const child of children) {
              if (!child.isLeaf) {
                child.children = await loadChildren(String(child.key))
              }
            }
            setTreeData((prev) => updateTreeNode(prev, key, children))
          }
        },
        {
          key: 'copy-name',
          label: '复制数据库名',
          onClick: () => {
            navigator.clipboard.writeText(schema)
            message.success('已复制数据库名')
          }
        }
      ]
      return items
    }

    // Table / View / Routine context menus
    if (itemType !== 'table' && itemType !== 'view' && itemType !== 'routine') return undefined

    const connId = node.connId
    const tableName = node.tableName
    const schema = node.schema

    const items: MenuProps['items'] = []

    if (itemType === 'routine') {
      items.push({
        key: 'view-definition',
        label: '查看定义',
        icon: <CodeOutlined />,
        onClick: async () => {
          try {
            const definition = await databaseApi.getRoutineDefinition(
              connId || '',
              node.routineName as string,
              node.routineType as 'PROCEDURE' | 'FUNCTION',
              schema
            )
            const header = `-- ${node.routineType === 'PROCEDURE' ? '存储过程' : '函数'}: ${node.routineName}\n`
            const sql = definition ? header + definition : `${header}-- 无定义或无查看权限`
            const tab = createNewTab(sql)
            tab.title = `${node.routineName} (${node.routineType === 'PROCEDURE' ? '存储过程' : '函数'})`
            addTab(tab)
            openTab({
              key: `query-${tab.id}`,
              title: tab.title,
              type: 'query',
              connId: connId || '',
              schema
            })
          } catch (err) {
            message.error(`获取定义失败: ${err instanceof Error ? err.message : '未知错误'}`)
          }
        }
      })

      // Execute routine: generate CALL/SELECT and open in SQL editor
      const conn = connections.find((c) => c.id === connId)
      const routineDbType = conn?.type || 'mysql'
      let callSql: string
      if (node.routineType === 'FUNCTION') {
        callSql = routineDbType === 'oracle'
          ? `SELECT ${node.routineName}() FROM dual;`
          : `SELECT ${node.routineName}();`
      } else {
        callSql = routineDbType === 'oracle'
          ? `BEGIN ${node.routineName}(); END;`
          : `CALL ${node.routineName}();`
      }
      items.push({
        key: 'execute-routine',
        label: '执行',
        icon: <PlaySquareOutlined />,
        onClick: () => {
          const tab = createNewTab(callSql)
          tab.title = `${node.routineName} (${node.routineType === 'PROCEDURE' ? '存储过程' : '函数'})`
          addTab(tab)
          openTab({
            key: `query-${tab.id}`,
            title: tab.title,
            type: 'query',
            connId: connId || '',
            schema
          })
        }
      })

      return items
    }

    items.push(
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
          openTab({
            key: `query:${connId}:${Date.now()}`,
            title: `查询 - ${tableName}`,
            type: 'query',
            connId: connId || '',
            table: tableName
          })
        }
      }
    )
    return items
  }

  const onDoubleClick = (_event: React.MouseEvent, node: DataNode) => {
    const key = String(node.key)
    if (node.itemType === 'connection') {
      const connId = node.connId as string
      if (!connectedIds.has(connId)) {
        handleConnect(connId)
      } else {
        // Already connected: toggle expand/collapse
        setExpandedKeys((prev) =>
          prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        )
      }
      return
    }
    // Toggle expand/collapse for non-leaf nodes (database, folder, table, group)
    if (!node.isLeaf) {
      setExpandedKeys((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      )
      return
    }
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
    } else if (node.itemType === 'query') {
      // Open query history in SQL editor
      const connId = node.connId
      const sql = (node as any).sql as string
      const tab = createNewTab(sql)
      addTab(tab)
      openTab({
        key: `query-${tab.id}`,
        title: tab.title,
        type: 'query',
        connId: connId || '',
        schema: node.schema
      })
    }
  }

  const renderTitle = (node: DataNode): React.ReactNode => {
    const menuItems = getContextMenu(node)

    if (menuItems) {
      return (
        <Dropdown menu={{ items: menuItems }} trigger={['contextMenu']}>
          <span>{node.title as React.ReactNode}</span>
        </Dropdown>
      )
    }
    return <span>{node.title as React.ReactNode}</span>
  }

  return (
    <div className="database-tree" style={{ overflow: 'auto', flex: 1 }}>
      {/* Search input */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Input.Search
          size="small"
          placeholder={t('databaseTree.searchPlaceholder') || '搜索连接...'}
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={(value) => setSearchText(value)}
          style={{ width: '100%' }}
        />
      </div>

      {treeData.length === 0 ? (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: '#999',
            fontSize: 13
          }}
        >
          {searchText ? '未找到匹配的连接' : (t('databaseTree.noConnections') || '暂无连接，请先添加数据库连接')}
        </div>
      ) : (
        <Tree
          treeData={applyRenderTitle(treeData, renderTitle)}
          loadData={onLoadData}
          onDoubleClick={onDoubleClick}
          expandedKeys={expandedKeys}
          onExpand={handleExpand as any}
          showIcon
          blockNode
          defaultExpandParent={false}
          className="database-tree"
        />
      )}

      <ConnectionForm
        open={formOpen}
        editConfig={editConfig}
        onOk={editConfig ? handleUpdate : handleCreate}
        onCancel={() => { setFormOpen(false); setEditConfig(null) }}
        loading={formLoading}
      />
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

// Helper: find a node's children by key (returns undefined if node not found or has no children)
function findNodeChildren(nodes: DataNode[], key: string): DataNode[] | undefined {
  for (const node of nodes) {
    if (node.key === key) return node.children
    if (node.children) {
      const found = findNodeChildren(node.children, key)
      if (found !== undefined) return found
    }
  }
  return undefined
}

// Helper: recursively apply renderTitle to all tree nodes
function applyRenderTitle(nodes: DataNode[], renderTitle: (node: DataNode) => React.ReactNode): DataNode[] {
  return nodes.map((node) => ({
    ...node,
    title: renderTitle(node),
    children: node.children ? applyRenderTitle(node.children, renderTitle) : undefined
  }))
}

export default DatabaseTree
