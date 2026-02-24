/**
 * ERROR BOUNDARY
 * Captura erros em componentes filhos e exibe UI de fallback
 * Evita tela branca e mantém a aplicação utilizável
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import '../pages/ErrorPage.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('[ErrorBoundary] Erro capturado:', error, errorInfo?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;

      if (typeof fallback === 'function') {
        return fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          retry: this.handleRetry
        });
      }

      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary__content">
            <AlertTriangle size={64} className="error-boundary__icon" aria-hidden />
            <h1 className="error-boundary__title">Algo deu errado</h1>
            <p className="error-boundary__desc">
              Ocorreu um erro inesperado. O problema foi registrado e nossa equipe foi notificada.
            </p>
            <div className="error-boundary__actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={this.handleRetry}
                aria-label="Tentar novamente"
              >
                <RefreshCw size={18} />
                Tentar novamente
              </button>
              <Link to="/app" className="btn btn-secondary" aria-label="Ir para o início">
                <Home size={18} />
                Ir para o início
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
