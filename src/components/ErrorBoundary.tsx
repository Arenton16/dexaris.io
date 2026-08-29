import { Component, type ErrorInfo, type ReactNode } from 'react';
import DexarisIcon from './DexarisIcon';

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
          background: '#050505',
          color: '#F2F2F2',
          fontFamily: "'Inter', sans-serif",
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <DexarisIcon size={36} />
          <p style={{ fontSize: '18px', fontWeight: 500, margin: 0 }}>
            Something went wrong
          </p>
          <p style={{
            fontSize: '13px',
            color: 'rgba(242,242,242,0.45)',
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
              background: '#0E7C7C',
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
