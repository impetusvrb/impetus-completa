import React from 'react';

export default class ModuleErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error(`[${this.props.moduleName}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, background: '#fef2f2', borderRadius: 8, margin: 16 }}>
          <p style={{ color: '#b91c1c' }}>Erro ao carregar {this.props.moduleName}. Tente recarregar a página.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
