import React, { useState } from 'react'
import { Button, message } from 'antd'
import { ApiOutlined } from '@ant-design/icons'
import { connectionApi } from '../../services/api'
import type { ConnectionConfigInput } from '../../types/connection'

interface Props {
  getValues: () => ConnectionConfigInput
}

const ConnectionTestBtn: React.FC<Props> = ({ getValues }) => {
  const [testing, setTesting] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    try {
      const values = getValues()
      const result = await connectionApi.test(values)
      if (result.success) {
        message.success(`连接成功！${result.serverVersion ? `版本: ${result.serverVersion}` : ''}`)
      } else {
        message.error(`连接失败: ${result.message}`)
      }
    } catch (err: unknown) {
      message.error(`测试异常: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <Button icon={<ApiOutlined />} onClick={handleTest} loading={testing}>
      测试连接
    </Button>
  )
}

export default ConnectionTestBtn