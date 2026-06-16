import React, { useState } from 'react'
import { Button, message } from 'antd'
import { ApiOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { connectionApi } from '../../services/api'
import type { ConnectionConfigInput } from '../../types/connection'

interface Props {
  getValues: () => ConnectionConfigInput
}

const ConnectionTestBtn: React.FC<Props> = ({ getValues }) => {
  const { t } = useTranslation()
  const [testing, setTesting] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    try {
      const values = getValues()
      const result = await connectionApi.test(values)
      if (result.success) {
        message.success(result.serverVersion
          ? t('connection.testSuccessWithVersion', { version: result.serverVersion })
          : t('connection.testSuccess'))
      } else {
        message.error(t('connection.testFailedWithMsg', { message: result.message }))
      }
    } catch (err: unknown) {
      message.error(t('connection.testError', { message: err instanceof Error ? err.message : t('common.unknownError') }))
    } finally {
      setTesting(false)
    }
  }

  return (
    <Button icon={<ApiOutlined />} onClick={handleTest} loading={testing}>
      {t('connection.test')}
    </Button>
  )
}

export default ConnectionTestBtn
