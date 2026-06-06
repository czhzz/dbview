import React, { useEffect, useState } from 'react'
import { Modal, Form, Input, InputNumber, Select, Button } from 'antd'
import { DatabaseOutlined } from '@ant-design/icons'
import { connectionApi } from '../../services/api'
import ConnectionTestBtn from './ConnectionTestBtn'
import type { ConnectionConfig, ConnectionConfigInput, ConnectionGroup } from '../../types/connection'

interface Props {
  open: boolean
  editConfig?: ConnectionConfig | null
  onOk: (values: ConnectionConfigInput) => void
  onCancel: () => void
  loading?: boolean
}

const DB_TYPES = [
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'oracle', label: 'Oracle' }
]

const ConnectionForm: React.FC<Props> = ({ open, editConfig, onOk, onCancel, loading }) => {
  const [form] = Form.useForm<ConnectionConfigInput>()
  const dbType = Form.useWatch('type', form)
  const [groups, setGroups] = useState<ConnectionGroup[]>([])
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (open) {
      connectionApi.listGroups().then(setGroups)
    }
  }, [open])

  React.useEffect(() => {
    if (open) {
      if (editConfig) {
        form.setFieldsValue({
          name: editConfig.name,
          type: editConfig.type,
          host: editConfig.host,
          port: editConfig.port,
          username: editConfig.username,
          password: editConfig.password,
          database: editConfig.database,
          ssl: editConfig.ssl,
          oracleServiceName: editConfig.oracleServiceName,
          groupId: editConfig.groupId
        })
      } else {
        form.resetFields()
        form.setFieldsValue({ type: 'mysql', host: '127.0.0.1', port: 3306 })
      }
    }
  }, [open, editConfig, form])

  const handleOk = async () => {
    const values = await form.validateFields()
    onOk(values)
  }

  const getValues = (): ConnectionConfigInput => {
    return form.getFieldsValue()
  }

  return (
    <Modal
      title={
        <span>
          <DatabaseOutlined style={{ marginRight: 8 }} />
          {editConfig ? '编辑连接' : '新建连接'}
        </span>
      }
      open={open}
      onCancel={onCancel}
      confirmLoading={loading}
      width={520}
      destroyOnClose
      footer={[
        <ConnectionTestBtn key="test" getValues={getValues} />,
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="ok" type="primary" loading={loading} onClick={handleOk}>
          确定
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ type: 'mysql', host: '127.0.0.1', port: 3306, ssl: false }}
      >
        <Form.Item
          name="name"
          label="连接名称"
          rules={[{ required: true, message: '请输入连接名称' }]}
        >
          <Input placeholder="例如：本地开发库" />
        </Form.Item>

        <Form.Item name="groupId" label="分组">
          <Select
            allowClear
            placeholder="无分组"
            options={groups.map((g) => ({ value: g.id, label: g.name }))}
          />
        </Form.Item>

        <Form.Item
          name="type"
          label="数据库类型"
          rules={[{ required: true }]}
        >
          <Select options={DB_TYPES} onChange={() => {
            // Reset port based on type
            const portMap: Record<string, number> = { mysql: 3306, postgresql: 5432, oracle: 1521 }
            form.setFieldValue('port', portMap[form.getFieldValue('type')] || 3306)
          }} />
        </Form.Item>

        {dbType === 'sqlite' ? (
          <>
            <Form.Item
              name="host"
              label="文件路径"
              rules={[{ required: true, message: '请选择或输入 SQLite 文件路径' }]}
            >
              <Input placeholder="/path/to/database.db" />
            </Form.Item>
            <Form.Item name="ssl" label="打开方式" valuePropName="checked">
              <Input placeholder="只读模式" disabled />
            </Form.Item>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12 }}>
              <Form.Item
                name="host"
                label="主机地址"
                rules={[{ required: true, message: '请输入主机地址' }]}
                style={{ flex: 1 }}
              >
                <Input placeholder="127.0.0.1" />
              </Form.Item>

              <Form.Item
                name="port"
                label="端口"
                rules={[{ required: true }]}
                style={{ width: 120 }}
              >
                <InputNumber min={1} max={65535} style={{ width: '100%' }} />
              </Form.Item>
            </div>

            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="root" />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: !editConfig, message: '请输入密码' }]}
            >
              <Input.Password placeholder={editConfig ? '留空则不修改密码' : ''} />
            </Form.Item>

            {dbType === 'oracle' && (
              <Form.Item
                name="oracleServiceName"
                label="服务名 / SID"
                tooltip="Oracle 连接服务名（如 xe、orcl）"
              >
                <Input placeholder="xe" />
              </Form.Item>
            )}

            <Form.Item
              name="database"
              label={dbType === 'postgresql' ? '默认数据库' : '默认数据库'}
              tooltip="可选，连接后默认选中的数据库"
            >
              <Input placeholder={dbType === 'postgresql' ? 'postgres' : '留空则连接后选择'} />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  )
}

export default ConnectionForm
