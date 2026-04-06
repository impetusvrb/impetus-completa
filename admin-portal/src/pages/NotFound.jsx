import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ padding: '3rem', textAlign: 'center' }}>
      <h1>404</h1>
      <p className="muted">Página não encontrada.</p>
      <Link to="/">Ir ao dashboard</Link>
    </div>
  );
}
