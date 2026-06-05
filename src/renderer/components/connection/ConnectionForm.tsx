import React from 'react'
import { Modal, Form, Input, InputNumber, Select } from 'antd'
import { DatabaseOutlined } from '@ant-design/icons'
import type { ConnectionConfig, ConnectionConfigInput } from '../../types/connection'

interface Props {
  open: boolean
  editConfig?: ConnectionConfig | null
  onOk: (values: ConnectionConfigInput) => void
  onCancel: () => void
  loading?: boolean
}

const DB_TYPES = [
  { value: 'mysql', label: 'MySQL' },
  { value: 'oracle', label: 'Oracle (预留)' }
]

const ConnectionForm: React.FC<Props> = ({ open, editConfig, onOk, onCancel, loading }) => {
  const [form] = Form.useForm<ConnectionConfigInput>()

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
          ssl: editConfig.ssl
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

  return (
    <Modal
      title={
        <span>
          <DatabaseOutlined style={{ marginRight: 8 }} />
          {editConfig ? '编辑连接' : '新建连接'}
        </span>
      }
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      width={520}
      destroyOnClose
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

        <Form.Item
          name="type"
          label="数据库类型"
          rules={[{ required: true }]}
        >
          <Select options={DB_TYPES} />
        </Form.Item>

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

        <Form.Item
          name="database"
          label="默认数据库"
          tooltip="可选，连接后默认选中的数据库"
        >
          <Input placeholder="留空则连接后选择" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ConnectionForm