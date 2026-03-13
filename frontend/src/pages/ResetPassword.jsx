import React from 'react';
import { Link } from 'react-router-dom';

export default function ResetPassword() {
  return (
    <div style={{ padding: 48, maxWidth: 400, margin: '0 auto' }}>
      <h1>Redefinir senha</h1>
      <input type="password" placeholder="Nova senha" style={{ width: '100%', padding: 12, marginBottom: 12 }} />
      <input type="password" placeholder="Confirmar" style={{ width: '100%', padding: 12, marginBottom: 16 }} />
      <button type="button">Salvar</button>
      <p><Link to="/">Voltar ao login</Link></p>
    </div>
  );
}
