/**
 * IMPETUS - ErrorBoundary Granular por Módulo
 * Falha em um módulo não derruba toda a aplicação
 */
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import './ModuleErrorBoundary.css';

export default function ModuleErrorBoundary({ children, moduleName = 'Módulo' }) {
  return (
    <ErrorBoundaryInner moduleName={moduleName}>
      {children}
    </ErrorBoundaryInner>
  );
}

class ErrorBoundaryInner extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[ModuleErrorBoundary:${this.props.moduleName}]`, error, errorInfo?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="module-error-boundary">
          <AlertTriangle size={32} />
          <h3>Erro em {this.props.moduleName}</h3>
          <p>Não foi possível carregar este conteúdo.</p>
          <button type="button" className="module-error-boundary__btn" onClick={this.handleRetry}>
            <RefreshCw size={16} /> Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
