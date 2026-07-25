import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

const WORKFLOW_SLOTS = Object.freeze([
  { id: 'approval', label: 'Aprovação', status: 'reservado' },
  { id: 'block', label: 'Bloqueio', status: 'reservado' },
  { id: 'release', label: 'Liberação', status: 'reservado' }
]);

/** OPM-001C — Shell visual de workflow (sem regras de negócio). */
export default function WarehouseWorkflowShell() {
  return (
    <section className="warehouse-workflow-shell impetus-card" data-warehouse-workflow="shell">
      <h4 style={{ ...mono, color: 'var(--text-tertiary)', margin: '0 0 8px', fontSize: 11 }}>Workflow · arquitectura reservada</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {WORKFLOW_SLOTS.map((s) => (
          <div
            key={s.id}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px dashed var(--border-subtle)',
              minWidth: 100
            }}
          >
            <div style={{ ...mono, color: 'var(--cyan)', fontSize: 10 }}>{s.label}</div>
            <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9, marginTop: 4 }}>{s.status}</div>
          </div>
        ))}
      </div>
      <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9, margin: '8px 0 0' }}>
        OPM-001D+ · sem alteração a runtime certificado
      </p>
    </section>
  );
}
