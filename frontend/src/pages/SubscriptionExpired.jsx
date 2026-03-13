import React from 'react';
import { Link } from 'react-router-dom';

export default function SubscriptionExpired() {
  return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <h1>Assinatura em atraso</h1>
      <p>Regularize o pagamento para continuar usando.</p>
      <Link to="/">Voltar ao login</Link>
    </div>
  );
}
