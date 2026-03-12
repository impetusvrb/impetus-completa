/**
 * PÁGINA 500 - ERRO DO SERVIDOR
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Home } from 'lucide-react';
import './ErrorPage.css';

export default function Error500() {
  const handleRetry = () => window.location.reload();
  return (
    <div className="error-page">
      <div className="error-content">
        <h1 className="error-code">500</h1>
        <h2 className="error-title">Erro interno do servidor</h2>
        <p className="error-desc">Algo deu errado. Tente novamente em instantes.</p>
        <div className="error-actions">
          <button className="btn btn-primary" onClick={handleRetry}><RefreshCw size={18} /> Tentar novamente</button>
          <Link to="/app" className="btn btn-secondary"><Home size={18} /> Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
