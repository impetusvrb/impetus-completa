import React from 'react';
import { Link } from 'react-router-dom';

export default function LicenseExpired() {
  return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <h1>Licença expirada</h1>
      <p>Entre em contato com o suporte para regularizar.</p>
      <Link to="/">Voltar ao login</Link>
    </div>
  );
}
