import React, { Component, type ReactNode } from 'react'
import { Result, Button } from 'antd'
import { useTranslation } from 'react-i18next'
import MainLayout from './layouts/MainLayout'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class AppErrorBoundaryInner extends Component<{ children: ReactNode; t: (key: string) => string }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.props
      return (
        <Result
          status="error"
          title={t('app.crashed')}
          subTitle={this.state.error?.message}
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              {t('app.reload')}
            </Button>
          }
        />
      )
    }
    return this.props.children
  }
}

const AppErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation()
  return <AppErrorBoundaryInner t={t}>{children}</AppErrorBoundaryInner>
}

const App: React.FC = () => {
  return (
    <AppErrorBoundary>
      <MainLayout />
    </AppErrorBoundary>
  )
}

export default App