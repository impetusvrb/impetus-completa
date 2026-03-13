/**
 * IMPETUS - Página 404
 * Página não encontrada
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Home, LogIn } from 'lucide-react';

export default function Error404() {
  return (
    <div className="error-page" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: '#f8fafc'
    }}>
      <h1 style={{ fontSize: 72, margin: 0, fontWeight: 700 }}>404</h1>
      <p style={{ fontSize: 18, margin: '16px 0 24px', opacity: 0.9 }}>
        Página não encontrada
      </p>
      <p style={{ marginBottom: 32, opacity: 0.7 }}>
        A página que você busca não existe ou foi movida.
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          to="/app"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            background: '#3b82f6',
            color: 'white',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 500
          }}
        >
          <Home size={18} /> Ir para Dashboard
        </Link>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            background: 'transparent',
            color: '#94a3b8',
            border: '1px solid #475569',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 500
          }}
        >
          <LogIn size={18} /> Voltar ao Login
        </Link>
      </div>
    </div>
  );
}
