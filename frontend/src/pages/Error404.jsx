/**
 * PÁGINA 404 - NÃO ENCONTRADO
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import './ErrorPage.css';

export default function Error404() {
  return (
    <div className="error-page">
      <div className="error-content">
        <h1 className="error-code">404</h1>
        <h2 className="error-title">Página não encontrada</h2>
        <p className="error-desc">A página que você busca não existe ou foi movida.</p>
        <div className="error-actions">
          <Link to="/app" className="btn btn-primary">
            <Home size={18} />
            Ir para Dashboard
          </Link>
          <Link to="/" className="btn btn-secondary">
            <Search size={18} />
            Voltar ao Login
          </Link>
        </div>
      </div>
    </div>
  );
}
