import React from 'react';
import Layout from '../components/Layout';

export default function SetupEmpresa() {
  return (
    <Layout>
      <div style={{ padding: 48, maxWidth: 600, margin: '0 auto' }}>
        <h1>Configuração da Empresa</h1>
        <p>Complete as informações da sua empresa para continuar.</p>
        <p style={{ color: '#64748b' }}>Use o menu para acessar outras áreas.</p>
      </div>
    </Layout>
  );
}
