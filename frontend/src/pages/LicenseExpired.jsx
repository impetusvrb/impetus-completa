/**
 * Página exibida quando a licença está inválida ou expirada
 */

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import './ErrorPage.css';

export default function LicenseExpired() {
  return (
    <div className="error-page">
      <div className="error-content">
        <ShieldAlert size={64} className="error-icon" />
        <h1>Licença Inválida ou Expirada</h1>
        <p>O acesso ao sistema foi bloqueado. Entre em contato com o suporte para renovar sua licença.</p>
        <div className="error-actions">
          <Link to="/" className="btn btn-primary">Voltar ao Login</Link>
        </div>
      </div>
    </div>
  );
}
