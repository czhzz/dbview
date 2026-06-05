import React, { Component, type ReactNode } from 'react'
import { Result, Button } from 'antd'
import MainLayout from './layouts/MainLayout'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="应用崩溃了"
          subTitle={this.state.error?.message}
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              重新加载
            </Button>
          }
        />
      )
    }
    return this.props.children
  }
}

const App: React.FC = () => {
  return (
    <AppErrorBoundary>
      <MainLayout />
    </AppErrorBoundary>
  )
}

export default App