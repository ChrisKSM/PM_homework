import React from 'react'

type Props = { children: React.ReactNode; title?: string }
type State = { error: Error | null }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="pt-20 px-6 max-w-2xl text-sm text-gray-800">
          <p className="font-semibold text-gray-900 mb-2">
            {this.props.title ?? '화면을 불러오지 못했습니다'}
          </p>
          <p className="text-gray-600 mb-3">
            새 배포 직후 JS와 build-version이 어긋나면 발생할 수 있습니다. 강력 새로고침(Ctrl+Shift+R) 후
            다시 시도해 주세요.
          </p>
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto whitespace-pre-wrap">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="mt-4 text-blue-600 underline"
            onClick={() => window.location.reload()}
          >
            페이지 새로고침
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
