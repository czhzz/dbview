import React from 'react'
import { Table, Tag } from 'antd'
import { KeyOutlined } from '@ant-design/icons'
import type { ColumnInfo } from '../../types/database'

interface Props {
  columns: ColumnInfo[]
  loading?: boolean
}

const ColumnList: React.FC<Props> = ({ columns, loading }) => {
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
    </Table>
  )
}

export default ColumnList