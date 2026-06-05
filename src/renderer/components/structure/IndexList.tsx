import React from 'react'
import { Table, Tag, Button, Space, Popconfirm } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { IndexInfo } from '../../types/database'

interface Props {
  indexes: IndexInfo[]
  columns: string[]
  loading?: boolean
  editable?: boolean
  onAdd?: () => void
  onDelete?: (idx: IndexInfo) => void
}

const IndexList: React.FC<Props> = ({ indexes, columns, loading, editable, onAdd, onDelete }) => {
  const dataSource = indexes.map((idx, i) => ({ ...idx, _key: i }))

  return (
    <div>
      {editable && (
        <div style={{ marginBottom: 12 }}>
          <Button icon={<PlusOutlined />} size="small" onClick={onAdd}>
            新建索引
          </Button>
        </div>
      )}
      <Table dataSource={dataSource} rowKey="_key" loading={loading} size="small" pagination={false}>
        <Table.Column title="索引名" dataIndex="name" key="name" width={200} />
        <Table.Column
          title="类型"
          dataIndex="type"
          key="type"
          width={100}
          render={(v: string) => <Tag>{v}</Tag>}
        />
        <Table.Column
          title="唯一"
          dataIndex="unique"
          key="unique"
          width={60}
          render={(v: boolean) =>
            v ? <Tag color="blue">是</Tag> : <Tag color="default">否</Tag>
          }
        />
        <Table.Column
          title="主键"
          dataIndex="primary"
          key="primary"
          width={60}
          render={(v: boolean) =>
            v ? <Tag color="red">是</Tag> : <Tag color="default">否</Tag>
          }
        />
        <Table.Column
          title="包含字段"
          dataIndex="columns"
          key="columns"
          render={(cols: string[]) => cols.join(', ')}
        />
        {editable && (
          <Table.Column
            title="操作"
            key="actions"
            width={80}
            render={(_: unknown, record: IndexInfo) =>
              record.primary ? null : (
                <Popconfirm
                  title={`确认删除索引 "${record.name}"？`}
                  description="此操作不可逆"
                  onConfirm={() => onDelete?.(record)}
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              )
            }
          />
        )}
      </Table>
    </div>
  )
}

export default IndexList
