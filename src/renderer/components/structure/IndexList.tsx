import React from 'react'
import { Table, Tag, Button, Space, Popconfirm } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const dataSource = indexes.map((idx, i) => ({ ...idx, _key: i }))

  return (
    <div>
      {editable && (
        <div style={{ marginBottom: 12 }}>
          <Button icon={<PlusOutlined />} size="small" onClick={onAdd}>
            {t('structure.addIndex')}
          </Button>
        </div>
      )}
      <Table dataSource={dataSource} rowKey="_key" loading={loading} size="small" pagination={false}>
        <Table.Column title={t('structure.indexName')} dataIndex="name" key="name" width={200} />
        <Table.Column
          title={t('structure.columnType')}
          dataIndex="type"
          key="type"
          width={100}
          render={(v: string) => <Tag>{v}</Tag>}
        />
        <Table.Column
          title={t('structure.uniqueIndex')}
          dataIndex="unique"
          key="unique"
          width={60}
          render={(v: boolean) =>
            v ? <Tag color="blue">{t('common.yes')}</Tag> : <Tag color="default">{t('common.no')}</Tag>
          }
        />
        <Table.Column
          title={t('structure.primary')}
          dataIndex="primary"
          key="primary"
          width={60}
          render={(v: boolean) =>
            v ? <Tag color="red">{t('common.yes')}</Tag> : <Tag color="default">{t('common.no')}</Tag>
          }
        />
        <Table.Column
          title={t('structure.indexColumns')}
          dataIndex="columns"
          key="columns"
          render={(cols: string[]) => cols.join(', ')}
        />
        {editable && (
          <Table.Column
            title={t('structure.actions')}
            key="actions"
            width={80}
            render={(_: unknown, record: IndexInfo) =>
              record.primary ? null : (
                <Popconfirm
                  title={t('structure.deleteIndexConfirm', { name: record.name })}
                  description={t('structure.irreversible')}
                  onConfirm={() => onDelete?.(record)}
                  okText={t('common.delete')}
                  cancelText={t('common.cancel')}
                  okButtonProps={{ danger: true }}
                >
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                    {t('structure.deleteIndex')}
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
