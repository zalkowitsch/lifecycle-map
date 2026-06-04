// ErrorBoundary — class component that catches render-time crashes from its
// subtree (the Canvas in particular) and shows a recoverable fallback UI
// instead of leaving the user staring at a blank page.

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] render crash:', error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    const message = this.state.error.message || String(this.state.error);
    const isEdgeRouterCrash = /edge-router|routeEdges|stableHash/.test(message + this.state.error.stack);

    return (
      <div role="alert" style={fallbackStyle}>
        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>
            Couldn't render this map
          </h2>
          <p style={{ margin: '0 0 12px', color: '#666', fontSize: 14 }}>
            {isEdgeRouterCrash
              ? 'The map references edges or nodes the renderer couldn\'t resolve. This usually means the JSON uses an older schema (from/to instead of source/target) or references a node id that doesn\'t exist.'
              : 'Something went wrong while rendering the map.'}
          </p>
          <details style={{ marginBottom: 12 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13 }}>Error details</summary>
            <pre style={preStyle}>{message}</pre>
          </details>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={this.reset} style={btnPrimaryStyle}>Try again</button>
            <button
              onClick={() => { window.location.hash = ''; window.location.reload(); }}
              style={btnStyle}
            >
              Back to splash
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const fallbackStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: '#1a1a1a',
  color: '#eee',
  padding: '24px',
} as const;

const cardStyle = {
  maxWidth: 520,
  background: '#2a2a2a',
  border: '1px solid #444',
  borderRadius: 8,
  padding: 24,
} as const;

const preStyle = {
  background: '#111',
  color: '#eee',
  padding: 12,
  borderRadius: 4,
  fontSize: 12,
  overflow: 'auto',
  marginTop: 8,
} as const;

const btnStyle = {
  padding: '8px 16px',
  background: '#444',
  color: '#eee',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 14,
} as const;

const btnPrimaryStyle = {
  ...btnStyle,
  background: '#2563eb',
} as const;
