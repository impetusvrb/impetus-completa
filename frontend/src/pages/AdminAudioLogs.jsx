// ⚠️ STUB_TEMPORARIO
// created_at: 2026-03-27
// owner: (opcional)
// expected_replacement: Listagem, filtros e reprodução de registos de áudio do sistema
// Este componente foi criado para evitar erro de build.
// Deve ser implementado ou removido futuramente.

/**
 * CLASSIFICAÇÃO: STUB_TEMPORARIO — logs de áudio (admin).
 */

import React from 'react';
import { Mic } from 'lucide-react';
import StubPage from '../components/StubPage';

export default function AdminAudioLogs() {
  return (
    <div style={{ padding: '40px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Mic size={28} color="#1E90FF" />
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2eaff', margin: 0 }}>Logs de Áudio</h1>
      </div>
      <StubPage
        componentName="AdminAudioLogs"
        title="Módulo em desenvolvimento"
        description="Este módulo ainda não está conectado ao backend."
        variant="dark"
      />
    </div>
  );
}
