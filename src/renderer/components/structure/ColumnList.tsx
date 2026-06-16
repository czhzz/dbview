import React from 'react'
import { Table, Tag, Button, Space, Popconfirm } from 'antd'
import { KeyOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { ColumnInfo } from '../../types/database'

interface Props {
  columns: ColumnInfo[]
  loading?: boolean
  editable?: boolean
  onEdit?: (col: ColumnInfo) => void
  onDelete?: (col: ColumnInfo) => void
}

const ColumnList: React.FC<Props> = ({ columns, loading, editable, onEdit, onDelete }) => {
  const { t } = useTranslation()
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
        title={t('structure.columnName')}
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
      <Table.Column title={t('structure.columnType')} dataIndex="type" key="type" width={180} />
      <Table.Column
        title={t('structure.nullable')}
        dataIndex="nullable"
        key="nullable"
        width={60}
        render={(v: boolean) =>
          v ? <Tag color="default">YES</Tag> : <Tag color="red">NO</Tag>
        }
      />
      <Table.Column
        title={t('structure.defaultValue')}
        dataIndex="defaultValue"
        key="defaultValue"
        width={120}
        render={(v: string | null) => v ?? <span style={{ color: '#999' }}>NULL</span>}
      />
      <Table.Column title={t('structure.extra')} dataIndex="extra" key="extra" width={120} />
      <Table.Column title={t('structure.comment')} dataIndex="comment" key="comment" ellipsis />
      {editable && (
        <Table.Column
          title={t('structure.actions')}
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
                {t('structure.edit')}
              </Button>
              <Popconfirm
                title={t('structure.deleteColumnConfirm', { name: record.name })}
                description={t('structure.irreversible')}
                onConfirm={() => onDelete?.(record)}
                okText={t('common.delete')}
                cancelText={t('common.cancel')}
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                >
                  {t('structure.deleteColumn')}
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
