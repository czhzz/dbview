import React, { useEffect, useRef, useState } from 'react'
import { Skeleton } from 'antd'
import { EditorView, basicSetup } from 'codemirror'
import { sql, MySQL } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'

interface Props {
  ddl: string
  loading?: boolean
}

const DDLViewer: React.FC<Props> = ({ ddl, loading }) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editorRef.current || !ddl || loading) return

    try {
      if (viewRef.current) {
        viewRef.current.destroy()
      }

      viewRef.current = new EditorView({
        doc: ddl,
        extensions: [
          basicSetup,
          sql({ dialect: MySQL }),
          oneDark,
          EditorView.editable.of(false),
          EditorView.theme({
            '&': { height: 'auto' },
            '.cm-scroller': { overflow: 'auto', fontFamily: "'Cascadia Code', 'Fira Code', monospace" },
            '.cm-content': { fontSize: '13px', lineHeight: '1.6' }
          })
        ],
        parent: editorRef.current
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '渲染DDL失败')
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
    }
  }, [ddl, loading])

  if (loading) {
    return <Skeleton active style={{ padding: 16 }} />
  }

  if (error) {
    return (
      <pre style={{ padding: 16, fontSize: 13, color: '#ff4d4f', whiteSpace: 'pre-wrap' }}>
        {error}
      </pre>
    )
  }

  if (!ddl) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>
        无 DDL 信息
      </div>
    )
  }

  return <div ref={editorRef} />
}

export default DDLViewer