/* ============================================
   纸条 PaperNote — React 错误边界
   捕获子树渲染错误，显示回退 UI
   ============================================ */

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100vh',
              backgroundColor: 'var(--bg-primary)',
              gap: 'var(--space-md)',
              fontFamily: 'var(--font-family)',
            }}
          >
            <p
              style={{
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-lg)',
              }}
            >
              出现了一些问题
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: 'var(--space-sm) var(--space-lg)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--white)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--font-size-md)',
              }}
            >
              重新加载
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
