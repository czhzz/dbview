import React from 'react'
import { Table, Tag } from 'antd'
import type { IndexInfo } from '../../types/database'

interface Props {
  indexes: IndexInfo[]
  loading?: boolean
}

const IndexList: React.FC<Props> = ({ indexes, loading }) => {
  const dataSource = indexes.map((idx, i) => ({ ...idx, _key: i }))

  return (
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
    </Table>
  )
}

export default IndexList