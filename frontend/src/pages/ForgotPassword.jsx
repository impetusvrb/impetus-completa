import React from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  return (
    <div style={{ padding: 48, maxWidth: 400, margin: '0 auto' }}>
      <h1>Esqueci a senha</h1>
      <p>Informe seu e-mail para recuperar.</p>
      <input type="email" placeholder="E-mail" style={{ width: '100%', padding: 12, marginBottom: 16 }} />
      <button type="button">Enviar</button>
      <p><Link to="/">Voltar ao login</Link></p>
    </div>
  );
}
