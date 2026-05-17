import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchOperationalValidationPack } from '../analytics/safetyOperationalValidationApi.js';
import { analyzeSafetyUxDensity } from '../analytics/safetyContextualUxValidator.js';

export default function SafetyPilotOperationalDashboard() {
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const uxLocal = useMemo(() => analyzeSafetyUxDensity(), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await fetchOperationalValidationPack({ menu_extra_count: 6, view_count: 2 });
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
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Carregando validação operacional…
        </p>
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <p style={{ color: 'var(--amber)' }}>Pacote indisponível — verifique sessão e API.</p>
        <Link to="/app/safety/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
          Voltar
        </Link>
      </div>
    );
  }

  const pr = pack.pilot_readiness || {};
  const cog = pack.cognitive_pressure || {};
  const beh = pack.behavior_summary?.aggregates || {};
  const dec = pack.operational_decision_hint || {};
  const narrative = pack.executive_insights?.narrative || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h2 style={{ margin: 0, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-accent)' }}>
        Pilot — Validação Operacional SST
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
        Perfil: {uxLocal.band} · densidade {uxLocal.density}
      </p>

      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <p style={{ margin: 0, fontSize: 20, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
          {pr.level} <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>({pr.score}/100)</span>
        </p>
        <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>Estágio: {pr.stage}</p>
        <p style={{ margin: '8px 0 0', color: 'var(--amber)', fontSize: 13 }}>Decisão sugerida: {dec.action}</p>
      </div>

      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>
          Pressão cognitiva
        </h3>
        <p style={{ margin: 0, color: 'var(--text-primary)' }}>
          Risco {cog.cognitive_risk_score} · overload {cog.overload_detected ? 'detectado' : 'ok'}
        </p>
      </div>

      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>
          Comportamento
        </h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
          Amostras {pack.behavior_summary?.sample_count ?? 0}
          {beh.denied_route_rate != null ? ` · denied ${(beh.denied_route_rate * 100).toFixed(1)}%` : ''}
        </p>
      </div>

      {narrative ? (
        <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Insight executivo</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>{narrative}</p>
        </div>
      ) : null}

      <Link to="/app/safety/operational" className="btn-ghost" style={{ display: 'inline-flex', borderRadius: 4, alignSelf: 'flex-start' }}>
        Voltar ao operacional
      </Link>
    </div>
  );
}
