import React, { useState, useEffect, useCallback } from 'react';
import { environmentCognitive as ecApi } from '../../../services/api.js';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

function ReasoningStep({ step, index }) {
  const cause = step?.cause || step?.trigger || step?.observation || step;
  const impact = step?.impact || step?.consequence;
  const action = step?.action || step?.recommendation;
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)', fontSize: 12, minWidth: 20 }}>{index + 1}.</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{typeof cause === 'string' ? cause : JSON.stringify(cause)}</div>
          {impact && <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 4 }}>→ {impact}</div>}
          {action && <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>✓ {action}</div>}
        </div>
      </div>
    </div>
  );
}

export function EnvironmentReasoningWorkspace() {
  const [reasoning, setReasoning] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await ecApi.runInsights({
        signals: { effluent_ph: [7, 6.9, 6.8, 6.7, 6.6, 6.5, 6.4, 6.3], safety_chemical_exposure: 0.55 },
        emit_events: false
      });
      setReasoning(data.pack?.reasoning);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const steps = reasoning?.causal_chain || reasoning?.steps || (Array.isArray(reasoning) ? reasoning : null);
  const summary = reasoning?.summary || reasoning?.conclusion;

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ ...mono, color: 'var(--cyan)' }}>Raciocínio ambiental</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '4px 0 0' }}>Cadeia causal assistiva — origem, contexto e impacto.</p>
        </div>
        <button type="button" className="btn-ghost" style={{ minHeight: 36, borderRadius: 4, fontSize: 12 }} onClick={load} disabled={loading}>
          {loading ? '…' : 'Atualizar'}
        </button>
      </div>

      {reasoning ? (
        <div style={{ marginTop: 8 }}>
          {summary && (
            <div style={{ padding: '8px 10px', background: 'rgba(0,212,255,0.06)', borderRadius: 4, borderLeft: '3px solid var(--cyan)', marginBottom: 10 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{summary}</p>
            </div>
          )}
          {steps?.length > 0 ? (
            <div>
              <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 6 }}>Cadeia causal</div>
              {steps.map((s, i) => <ReasoningStep key={i} step={s} index={i} />)}
            </div>
          ) : null}
        </div>
      ) : (
        loading ? <p style={{ ...mono, color: 'var(--text-secondary)', marginTop: 8 }}>Processando raciocínio…</p> : null
      )}
    </div>
  );
}

export default EnvironmentReasoningWorkspace;
