import React, { useEffect, useState } from 'react'
import { Modal, Form, Input, InputNumber, Select, Switch, Button } from 'antd'
import { DatabaseOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
          readOnly: editConfig.readOnly,
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
          {editConfig ? t('connection.edit') : t('connection.create')}
        </span>
      }
      open={open}
      onCancel={onCancel}
      confirmLoading={loading}
      width={520}
      destroyOnClose
      styles={{ body: { maxHeight: 'calc(80vh - 120px)', overflowY: 'auto', paddingRight: 4 } }}
      footer={[
        <ConnectionTestBtn key="test" getValues={getValues} />,
        <Button key="cancel" onClick={onCancel}>
          {t('common.cancel')}
        </Button>,
        <Button key="ok" type="primary" loading={loading} onClick={handleOk}>
          {t('common.confirm')}
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        size="small"
        initialValues={{ type: 'mysql', host: '127.0.0.1', port: 3306, ssl: false }}
      >
        <Form.Item
          name="name"
          label={t('connection.name')}
          rules={[{ required: true, message: t('connection.nameRequired') }]}
        >
          <Input placeholder={t('connection.namePlaceholder')} />
        </Form.Item>

        <Form.Item name="groupId" label={t('connection.group')}>
          <Select
            allowClear
            placeholder={t('connection.noGroup')}
            options={groups.map((g) => ({ value: g.id, label: g.name }))}
          />
        </Form.Item>

        <Form.Item
          name="type"
          label={t('connection.type')}
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
              label={t('connection.sqliteFile')}
              rules={[{ required: true, message: t('connection.sqliteFileRequired') }]}
            >
              <Input placeholder="/path/to/database.db" />
            </Form.Item>
            <Form.Item name="readOnly" label={t('connection.readOnly')} valuePropName="checked">
              <Switch />
            </Form.Item>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12 }}>
              <Form.Item
                name="host"
                label={t('connection.host')}
                rules={[{ required: true, message: t('connection.hostRequired') }]}
                style={{ flex: 1 }}
              >
                <Input placeholder="127.0.0.1" />
              </Form.Item>

              <Form.Item
                name="port"
                label={t('connection.port')}
                rules={[{ required: true }]}
                style={{ width: 120 }}
              >
                <InputNumber min={1} max={65535} style={{ width: '100%' }} />
              </Form.Item>
            </div>

            <Form.Item
              name="username"
              label={t('connection.username')}
              rules={[{ required: true, message: t('connection.usernameRequired') }]}
            >
              <Input placeholder="root" />
            </Form.Item>

            <Form.Item
              name="password"
              label={t('connection.password')}
              rules={[{ required: !editConfig, message: t('connection.passwordRequired') }]}
            >
              <Input.Password placeholder={editConfig ? t('connection.passwordPlaceholder') : ''} />
            </Form.Item>

            {dbType === 'oracle' && (
              <Form.Item
                name="oracleServiceName"
                label={t('connection.oracleServiceName')}
                tooltip={t('connection.oracleServiceNameTooltip')}
              >
                <Input placeholder="xe" />
              </Form.Item>
            )}

            <Form.Item
              name="database"
              label={t('connection.database')}
              tooltip={t('connection.databaseTooltip')}
            >
              <Input placeholder={dbType === 'postgresql' ? 'postgres' : t('connection.databasePlaceholder')} />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  )
}

export default ConnectionForm
