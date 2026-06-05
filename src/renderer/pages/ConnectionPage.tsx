import React, { useEffect, useState } from 'react'
import {
  Card,
  Button,
  Row,
  Col,
  message,
  Popconfirm,
  Tag,
  Typography,
  Space
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ApiOutlined,
  DisconnectOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { connectionApi } from '../services/api'
import { useConnectionStore } from '../stores/connectionStore'
import ConnectionForm from '../components/connection/ConnectionForm'
import type { ConnectionConfig, ConnectionConfigInput } from '../types/connection'

const ConnectionPage: React.FC = () => {
  const { connections, setConnections, connectedIds, addConnected, removeConnected } =
    useConnectionStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editConfig, setEditConfig] = useState<ConnectionConfig | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    loadConnections()
  }, [])

  const loadConnections = async () => {
    try {
      const list = await connectionApi.list()
      setConnections(list)
    } catch {
      message.error('加载连接列表失败')
    }
  }

  const handleCreate = async (values: ConnectionConfigInput) => {
    setFormLoading(true)
    try {
      await connectionApi.create(values)
      message.success('连接已创建')
      setFormOpen(false)
      loadConnections()
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
      await connectionApi.update({
        ...editConfig,
        ...values,
        password: values.password || editConfig.password,
        updatedAt: Date.now()
      })
      message.success('连接已更新')
      setFormOpen(false)
      setEditConfig(null)
      loadConnections()
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
      loadConnections()
    } catch (err) {
      message.error(`删除失败: ${err instanceof Error ? err.message : '未知错误'}`)
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
    } catch (err) {
      message.error(`断开失败: ${err instanceof Error ? err.message : '未知错误'}`)
    }
  }

  const openEdit = (config: ConnectionConfig) => {
    setEditConfig(config)
    setFormOpen(true)
  }

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}
      >
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            <DatabaseOutlined style={{ marginRight: 8 }} />
            数据库连接
          </Typography.Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditConfig(null); setFormOpen(true) }}>
          新建连接
        </Button>
      </div>

      {connections.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 80,
            color: '#999',
            background: '#fafafa',
            borderRadius: 8
          }}
        >
          <DatabaseOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
          <div style={{ marginTop: 16, fontSize: 15 }}>暂无保存的连接</div>
          <div style={{ marginTop: 8, fontSize: 13 }}>点击"新建连接"开始添加数据库连接</div>
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {connections.map((conn) => {
            const isConnected = connectedIds.has(conn.id)
            return (
              <Col key={conn.id} xs={24} sm={12} lg={8} xl={6}>
                <Card
                  className="connection-card"
                  size="small"
                  title={
                    <Space>
                      <DatabaseOutlined style={{ color: '#1677ff' }} />
                      <span style={{ fontSize: 14 }}>{conn.name}</span>
                      <Tag color={conn.type === 'mysql' ? 'blue' : 'orange'} style={{ fontSize: 10 }}>
                        {conn.type.toUpperCase()}
                      </Tag>
                    </Space>
                  }
                  extra={
                    <Space size={0}>
                      {isConnected ? (
                        <Button
                          type="text"
                          size="small"
                          icon={<DisconnectOutlined />}
                          onClick={() => handleDisconnect(conn.id)}
                        />
                      ) : (
                        <Button
                          type="text"
                          size="small"
                          icon={<ApiOutlined />}
                          onClick={() => handleConnect(conn.id)}
                        />
                      )}
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(conn)}
                      />
                      <Popconfirm
                        title="确认删除此连接？"
                        onConfirm={() => handleDelete(conn.id)}
                      >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  }
                  style={{ height: '100%' }}
                >
                  <div style={{ fontSize: 12, color: '#666' }}>
                    <div style={{ marginBottom: 4 }}>
                      {conn.host}:{conn.port}
                    </div>
                    <div style={{ marginBottom: 4 }}>用户: {conn.username}</div>
                    {conn.database && <div>数据库: {conn.database}</div>}
                    <div style={{ marginTop: 8 }}>
                      {isConnected ? (
                        <Tag icon={<CheckCircleOutlined />} color="success">
                          已连接
                        </Tag>
                      ) : (
                        <Tag icon={<ClockCircleOutlined />}>未连接</Tag>
                      )}
                    </div>
                  </div>
                </Card>
              </Col>
            )
          })}
        </Row>
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

export default ConnectionPage