import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchEnterpriseHardeningPack } from './enterpriseHardeningApi.js';
import { EnterpriseResilienceWorkspace } from './EnterpriseResilienceWorkspace.jsx';
import { EnterpriseTelemetryPressureWorkspace } from './EnterpriseTelemetryPressureWorkspace.jsx';
import { EnterpriseOperationalMaturityWorkspace } from './EnterpriseOperationalMaturityWorkspace.jsx';
import { EnterpriseContinuityWorkspace } from './EnterpriseContinuityWorkspace.jsx';

export default function EnterpriseHardeningHub() {
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await fetchEnterpriseHardeningPack({
        event_rate_per_min: 80,
        queue_depth: 200,
        menu_count: 6,
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
      <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Consolidando maturidade enterprise…
      </p>
    );
  }

  if (!pack) {
    return (
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <p style={{ color: 'var(--amber)' }}>Pack de hardening indisponível.</p>
        <Link to="/app/environment/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 20, textTransform: 'uppercase', color: 'var(--text-accent)' }}>
          Enterprise Maturity — Hardening
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
          Telemetria · edge · tenant · cognitivo · observabilidade · shadow-first
        </p>
      </header>

      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--cyan)' }}>
          Validação: {pack.validation?.ok ? 'OK' : 'REVISAR'} · auto_promotion: false · {(pack.enterprise_hardening_runtime_ms || 0)}ms
        </p>
      </div>

      <EnterpriseResilienceWorkspace resilience={pack.runtime_resilience} />
      <EnterpriseTelemetryPressureWorkspace telemetry={pack.telemetry} />
      <EnterpriseOperationalMaturityWorkspace maturity={pack.maturity} />
      <EnterpriseContinuityWorkspace continuity={pack.continuity} />

      <Link to="/app/environment/operational" className="btn-ghost" style={{ alignSelf: 'flex-start', borderRadius: 4 }}>
        Voltar ao hub
      </Link>
    </div>
  );
}
