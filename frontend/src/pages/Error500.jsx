import React from 'react';
import { Link } from 'react-router-dom';

export default function Error500() {
  return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <h1>Erro 500</h1>
      <p>Algo deu errado no servidor. Tente novamente mais tarde.</p>
      <Link to="/app">Ir para Dashboard</Link>
    </div>
  );
}
