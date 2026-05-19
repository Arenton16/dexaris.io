import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Dexaris] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#0C0B1A',
          color: '#E8E6FF',
          fontFamily: "'Inter', sans-serif",
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <svg width="36" height="36" viewBox="0 0 44 44" fill="none">
            <polygon points="4,42 10,26 16,26 10,42" fill="rgba(107,79,255,0.3)" />
            <polygon points="16,42 22,16 28,16 22,42" fill="rgba(107,79,255,0.6)" />
            <polygon points="28,42 34,5 40,5 34,42"  fill="#6B4FFF" />
          </svg>
          <p style={{ fontSize: '18px', fontWeight: 500, margin: 0 }}>
            Something went wrong
          </p>
          <p style={{
            fontSize: '13px',
            color: 'rgba(232,230,255,0.45)',
            margin: 0,
            maxWidth: '360px',
            lineHeight: 1.6,
          }}>
            An unexpected error occurred. Reloading the page will usually fix this.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '8px',
              padding: '10px 28px',
              background: '#6B4FFF',
              border: 'none',
              borderRadius: '20px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              transition: 'background 0.15s ease',
            }}
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
