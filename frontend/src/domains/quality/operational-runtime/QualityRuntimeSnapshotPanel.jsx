import React, { useState } from 'react';

/**
 * Snapshot runtime colapsável — não intercepta o workspace principal.
 */
export function QualityRuntimeSnapshotPanel({ title = 'Estado runtime', payload, tenantId }) {
  const [open, setOpen] = useState(false);
  if (!payload) return null;
  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
      <button
        type="button"
        className="btn-ghost"
        style={{ minHeight: 36, borderRadius: 4, marginBottom: open ? 8 : 0 }}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Ocultar' : 'Ver'} {title}
      </button>
      {open ? (
        <>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(payload, null, 2)}</pre>
          {tenantId ? <div style={{ marginTop: 8, opacity: 0.85 }}>tenant {String(tenantId).slice(0, 8)}…</div> : null}
        </>
      ) : null}
    </div>
  );
}

export default QualityRuntimeSnapshotPanel;
