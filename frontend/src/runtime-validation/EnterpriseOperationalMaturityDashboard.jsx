import React, { useEffect, useState } from 'react';
import { fetchEnterpriseValidationPack } from './enterpriseRuntimeValidationApi.js';
import { validateEnterpriseContextualUx } from './enterpriseContextualUxValidator.js';
import { analyzeEnterpriseCognitiveMaturity } from './enterpriseCognitiveMaturityEngine.js';

export default function EnterpriseOperationalMaturityDashboard({ compact = false }) {
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await fetchEnterpriseValidationPack({
        menu_extra_count: 4,
        view_count: 2,
        dashboard_widget_count: 5
      });
      if (alive) {
        setPack(data);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase' }}>
          Validação enterprise em curso…
        </p>
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <p style={{ color: 'var(--amber)', fontSize: 13 }}>Pacote enterprise indisponível — verifique sessão.</p>
      </div>
    );
  }

  const rt = pack.runtime_validation || {};
  const cog = pack.cognitive_maturity || analyzeEnterpriseCognitiveMaturity({});
  const rollout = pack.controlled_rollout || {};
  const dec = pack.enterprise_decision || {};
  const uxWorst = pack.ux_validation?.worst_pressure_class || validateEnterpriseContextualUx({ band: 'coordinator' }).ux_pressure_class;

  return (
    <div className="impetus-card" style={{ padding: compact ? '0.75rem' : '1rem', borderRadius: 4 }}>
      <h3
        style={{
          margin: '0 0 10px',
          fontSize: compact ? 12 : 14,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-accent)'
        }}
      >
        Maturidade operacional enterprise
      </h3>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <Metric label="Runtime" value={rt.stable ? 'ESTÁVEL' : 'REVISAR'} tone={rt.stable ? 'var(--green)' : 'var(--amber)'} />
        <Metric label="UX pressão" value={uxWorst} tone="var(--cyan)" />
        <Metric label="Cognitivo" value={`${cog.cognitive_maturity_score ?? '—'}/100`} tone="var(--text-primary)" />
        <Metric label="Rollout" value={rollout.current_stage || 'SHADOW'} tone="var(--text-secondary)" />
        <Metric label="Readiness" value={`${cog.rollout_readiness_score ?? '—'}`} tone="var(--green)" />
        <Metric label="Decisão" value={dec.action || '—'} tone="var(--amber)" />
      </div>
      {pack.executive_insights?.narrative ? (
        <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {pack.executive_insights.narrative}
        </p>
      ) : null}
      <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
        Assistivo · sem auto-promoção
      </p>
    </div>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div style={{ padding: 8, borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: tone, marginTop: 4 }}>{value}</div>
    </div>
  );
}
