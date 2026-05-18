import React, { useEffect, useState } from 'react';
import { fetchPilotRolloutPreparation } from './enterprisePilotRolloutApi.js';

function Metric({ label, value, tone = 'var(--text-primary)' }) {
  return (
    <div style={{ padding: 8, borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: tone, marginTop: 4 }}>{value}</div>
    </div>
  );
}

export default function EnterprisePilotExecutiveDashboard({ compact = false }) {
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await fetchPilotRolloutPreparation({});
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
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Preparação pilot…</p>
      </div>
    );
  }

  if (!pack || !pack.ok) {
    return (
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <p style={{ color: 'var(--amber)' }}>Pilot rollout indisponível.</p>
      </div>
    );
  }

  const d = pack.dashboard || {};
  return (
    <div className="impetus-card" style={{ padding: compact ? '0.75rem' : '1rem', borderRadius: 4 }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 14, textTransform: 'uppercase', color: 'var(--text-accent)' }}>
        Pilot Rollout — QUALITY · SAFETY · LOGISTICS
      </h3>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(130px, 1fr))' }}>
        <Metric label="Readiness" value={d.operational_readiness} tone="var(--cyan)" />
        <Metric label="Rollout health" value={d.rollout_health_score} tone="var(--green)" />
        <Metric label="Publication" value={d.publication_health} />
        <Metric label="UX" value={d.ux_health} />
        <Metric label="Cognitive" value={d.cognitive_pressure ?? '—'} />
        <Metric label="Wave" value={d.pilot_wave} tone="var(--amber)" />
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        Manual only · no FULL auto-promotion
      </p>
    </div>
  );
}
