/**
 * Saúde do sistema — rota dedicada (acesso alinhado a userCanAccessSystemHealth no Layout + API).
 */
import React from 'react';
import Layout from '../components/Layout';
import SystemHealthPanel from '../components/SystemHealthPanel';
import './SystemHealthPage.css';

export default function SystemHealthPage() {
  return (
    <Layout>
      <div className="system-health-page">
        <SystemHealthPanel />
      </div>
    </Layout>
  );
}
