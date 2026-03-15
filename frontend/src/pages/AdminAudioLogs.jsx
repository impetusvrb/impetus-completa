import React from 'react';
import { Mic } from 'lucide-react';

export default function AdminAudioLogs() {
  return (
    <div style={{ padding: '40px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <Mic size={28} color="#1E90FF" />
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2eaff', margin: 0 }}>Logs de Áudio</h1>
      </div>
      <div style={{ background: 'rgba(8,18,40,0.8)', border: '1px solid rgba(50,120,255,0.2)', borderRadius: 16, padding: 32, color: 'rgba(160,200,255,0.7)', textAlign: 'center' }}>
        <p style={{ fontSize: 16 }}>Módulo de Logs de Áudio em desenvolvimento.</p>
        <p style={{ fontSize: 13, marginTop: 8 }}>Em breve você poderá visualizar todos os registros de áudio do sistema.</p>
      </div>
    </div>
  );
}
