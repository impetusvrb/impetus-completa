import React from 'react';
import { Zap } from 'lucide-react';

export default function AdminIntegrations() {
  return (
    <div style={{ padding: '40px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <Zap size={28} color="#1E90FF" />
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2eaff', margin: 0 }}>Integração e Conectividade</h1>
      </div>
      <div style={{ background: 'rgba(8,18,40,0.8)', border: '1px solid rgba(50,120,255,0.2)', borderRadius: 16, padding: 32, color: 'rgba(160,200,255,0.7)', textAlign: 'center' }}>
        <p style={{ fontSize: 16 }}>Módulo de Integração e Conectividade em desenvolvimento.</p>
        <p style={{ fontSize: 13, marginTop: 8 }}>Gerencie integrações com PLCs, ERPs e sistemas externos.</p>
      </div>
    </div>
  );
}
