import React from 'react'
import { Table, Tag, Button, Space, Popconfirm } from 'antd'
import { KeyOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnInfo } from '../../types/database'

interface Props {
  columns: ColumnInfo[]
  loading?: boolean
  editable?: boolean
  onEdit?: (col: ColumnInfo) => void
  onDelete?: (col: ColumnInfo) => void
}

const ColumnList: React.FC<Props> = ({ columns, loading, editable, onEdit, onDelete }) => {
  const dataSource = columns.map((col, i) => ({ ...col, _key: i }))

  return (
    <Table
      dataSource={dataSource}
      rowKey="_key"
      loading={loading}
      size="small"
      pagination={false}
      scroll={{ y: 300 }}
    >
      <Table.Column
        title="字段名"
        dataIndex="name"
        key="name"
        width={180}
        render={(name: string, record: ColumnInfo) => (
          <span>
            {record.key === 'PRI' && (
              <KeyOutlined style={{ color: '#eb2f96', marginRight: 6 }} />
            )}
            {name}
          </span>
        )}
      />
      <Table.Column title="类型" dataIndex="type" key="type" width={180} />
      <Table.Column
        title="可空"
        dataIndex="nullable"
        key="nullable"
        width={60}
        render={(v: boolean) =>
          v ? <Tag color="default">YES</Tag> : <Tag color="red">NO</Tag>
        }
      />
      <Table.Column
        title="默认值"
        dataIndex="defaultValue"
        key="defaultValue"
        width={120}
        render={(v: string | null) => v ?? <span style={{ color: '#999' }}>NULL</span>}
      />
      <Table.Column title="额外" dataIndex="extra" key="extra" width={120} />
      <Table.Column title="注释" dataIndex="comment" key="comment" ellipsis />
      {editable && (
        <Table.Column
          title="操作"
          key="actions"
          width={120}
          render={(_: unknown, record: ColumnInfo) => (
            <Space size={4}>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit?.(record)}
              >
                编辑
              </Button>
              <Popconfirm
                title={`确认删除列 "${record.name}"？`}
                description="此操作不可逆"
                onConfirm={() => onDelete?.(record)}
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                >
                  删除
                </Button>
              </Popconfirm>
            </Space>
          )}
        />
      )}
    </Table>
  )
}

export default ColumnList
