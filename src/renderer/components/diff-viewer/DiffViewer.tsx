import React, { useState, useCallback } from 'react'
import { Tree, Button, Space, Typography, Tag, Modal, Empty, Spin } from 'antd'
import { PlayCircleOutlined, FileTextOutlined, BranchesOutlined, ExperimentOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { diffApi } from '../../services/api'
import type { DiffReport, TableDiff, ColumnDiff, IndexDiff } from '../../types/database'
import type { DataNode } from 'antd/es/tree'

interface Props {
  sourceConnId: string
  targetConnId: string
  sourceSchema?: string
  targetSchema?: string
  sourceType: string
  targetType: string
}

const STATUS_TAGS: Record<string, { color: string; label: string }> = {
  added: { color: 'green', label: '新增' },
  removed: { color: 'red', label: '缺失' },
  modified: { color: 'orange', label: '修改' },
  identical: { color: 'default', label: '相同' }
}

const DiffViewer: React.FC<Props> = ({ sourceConnId, targetConnId, sourceSchema, targetSchema, sourceType, targetType }) => {
  const { t } = useTranslation()
  const [report, setReport] = useState<DiffReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [migrationSql, setMigrationSql] = useState('')
  const [sqlModalOpen, setSqlModalOpen] = useState(false)
  const [executing, setExecuting] = useState(false)

  const handleCompare = useCallback(async () => {
    setLoading(true)
    try {
      const result = await diffApi.compare(sourceConnId, targetConnId, sourceSchema, targetSchema)
      setReport(result)
    } catch (err) {
      console.error('Compare failed:', err)
    } finally {
      setLoading(false)
    }
  }, [sourceConnId, targetConnId, sourceSchema, targetSchema])

  const handleGenerateScript = useCallback(async () => {
    if (!report) return
    try {
      const sql = await diffApi.generateScript(report, sourceType, targetType)
      setMigrationSql(sql)
      setSqlModalOpen(true)
    } catch (err) {
      console.error('Generate script failed:', err)
    }
  }, [report, sourceType, targetType])

  const handleExecuteMigration = useCallback(async () => {
    if (!migrationSql) return
    setExecuting(true)
    try {
      const result = await diffApi.executeMigration(targetConnId, migrationSql)
      if (result.success) {
        Modal.success({ title: t('diffViewer.migrationSuccess') })
      } else {
        Modal.error({ title: t('diffViewer.migrationFailed'), content: result.errors.join('\n') })
      }
    } catch (err) {
      Modal.error({ title: t('diffViewer.migrationFailed'), content: String(err) })
    } finally {
      setExecuting(false)
    }
  }, [migrationSql, targetConnId, t])

  const buildTreeData = (): DataNode[] => {
    if (!report) return []
    return report.tables.map((table) => {
      const statusInfo = STATUS_TAGS[table.status]
      return {
        key: table.name,
        title: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>{table.name}</span>
            <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
          </span>
        ),
        children: buildTableChildren(table)
      }
    })
  }

  const buildTableChildren = (table: TableDiff): DataNode[] => {
    const children: DataNode[] = []
    if (table.columns && table.columns.length > 0) {
      children.push({
        key: `${table.name}-columns`,
        title: t('diffViewer.columns'),
        selectable: false,
        children: table.columns.map((col) => ({
          key: `${table.name}-col-${col.name}`,
          title: renderColumnDiff(col)
        }))
      })
    }
    if (table.indexes && table.indexes.length > 0) {
      children.push({
        key: `${table.name}-indexes`,
        title: t('diffViewer.indexes'),
        selectable: false,
        children: table.indexes.map((idx) => ({
          key: `${table.name}-idx-${idx.name}`,
          title: renderIndexDiff(idx)
        }))
      })
    }
    return children
  }

  const renderColumnDiff = (col: ColumnDiff): React.ReactNode => {
    const statusInfo = STATUS_TAGS[col.status]
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
        <span>{col.name}</span>
        <Tag color={statusInfo.color} style={{ fontSize: 10 }}>{statusInfo.label}</Tag>
        {col.status === 'modified' && (
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {col.oldType} → {col.newType}
            {col.oldNullable !== col.newNullable && (
              <span style={{ marginLeft: 4 }}>
                (nullable: {String(col.oldNullable)} → {String(col.newNullable)})
              </span>
            )}
          </Typography.Text>
        )}
        {col.status === 'added' && col.newType && (
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>{col.newType}</Typography.Text>
        )}
      </span>
    )
  }

  const renderIndexDiff = (idx: IndexDiff): React.ReactNode => {
    const statusInfo = STATUS_TAGS[idx.status]
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
        <span>{idx.name}</span>
        <Tag color={statusInfo.color} style={{ fontSize: 10 }}>{statusInfo.label}</Tag>
        {idx.newColumns && (
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            ({idx.newColumns.join(', ')})
            {idx.newUnique ? ' UNIQUE' : ''}
          </Typography.Text>
        )}
      </span>
    )
  }

  const modifiedCount = report?.tables.filter((t) => t.status === 'modified').length || 0
  const addedCount = report?.tables.filter((t) => t.status === 'added').length || 0
  const removedCount = report?.tables.filter((t) => t.status === 'removed').length || 0
  const identicalCount = report?.tables.filter((t) => t.status === 'identical').length || 0

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Typography.Text strong>{t('diffViewer.title')}</Typography.Text>
        <div style={{ flex: 1 }} />
        <Button size="small" icon={<BranchesOutlined />} onClick={handleCompare} loading={loading}>
          {t('diffViewer.compare')}
        </Button>
        {report && (
          <>
            <Button size="small" icon={<FileTextOutlined />} onClick={handleGenerateScript}>
              {t('diffViewer.generateScript')}
            </Button>
            <Button size="small" icon={<ExperimentOutlined />} onClick={() => { setSqlModalOpen(true) }}>
              {t('diffViewer.dryRun')}
            </Button>
          </>
        )}
      </div>

      {report && (
        <div style={{ padding: '4px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 12, fontSize: 12 }}>
          <span>{t('diffViewer.totalTables')}: <strong>{report.tables.length}</strong></span>
          {addedCount > 0 && <span style={{ color: '#52c41a' }}>+{addedCount}</span>}
          {removedCount > 0 && <span style={{ color: '#ff4d4f' }}>-{removedCount}</span>}
          {modifiedCount > 0 && <span style={{ color: '#fa8c16' }}>~{modifiedCount}</span>}
          {identicalCount > 0 && <span style={{ color: '#999' }}>= {identicalCount}</span>}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {!report ? (
          <Empty description={t('diffViewer.clickToCompare')} style={{ marginTop: 60 }} />
        ) : (
          <Tree
            treeData={buildTreeData()}
            defaultExpandAll
            showLine
            style={{ fontSize: 12 }}
          />
        )}
      </div>

      {/* SQL Preview Modal */}
      <Modal
        title={t('diffViewer.migrationScript')}
        open={sqlModalOpen}
        onCancel={() => setSqlModalOpen(false)}
        width={700}
        footer={
          <Space>
            <Button onClick={() => { navigator.clipboard.writeText(migrationSql) }}>
              {t('common.copy')}
            </Button>
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleExecuteMigration} loading={executing}>
              {t('diffViewer.executeMigration')}
            </Button>
          </Space>
        }
      >
        <pre
          style={{
            margin: 0,
            padding: 12,
            background: '#1e1e1e',
            color: '#d4d4d4',
            borderRadius: 4,
            fontSize: 12,
            maxHeight: 400,
            overflow: 'auto',
            fontFamily: 'Consolas, "Courier New", monospace'
          }}
        >
          {migrationSql || t('diffViewer.noScript')}
        </pre>
      </Modal>
    </div>
  )
}

export default DiffViewer
