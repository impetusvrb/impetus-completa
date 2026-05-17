import React, { lazy, Suspense } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { resolveLogisticsAudienceBand, resolveLogisticsUxDensity } from '../navigation/logisticsAudienceNavigation.js';
import { isLogisticsOperationalRuntimeEnabled } from './logisticsOperationalFeatureFlags.js';
import {
  isLogisticsGovernanceVisibilityEnabled,
  isLogisticsExecutiveVisibilityEnabled
} from '../navigation/logisticsPublicationFeatureFlags.js';

const EnterpriseOperationalMaturityDashboard = lazy(() =>
  import('../../../runtime-validation/EnterpriseOperationalMaturityDashboard.jsx')
);

export function LogisticsOperationalWorkspace() {
  const ctx = useOutletContext() || {};
  const companyId = ctx.companyId;
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');

  let userBand = 'operator';
  try {
    const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    userBand = resolveLogisticsAudienceBand(u);
  } catch {
    userBand = 'operator';
  }
  const uxDensity = resolveLogisticsUxDensity(userBand);
  const uxShell = { 'data-logistics-ux': uxDensity, 'data-logistics-audience': userBand };

  if (!companyId) {
    return <p style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Sessão sem empresa.</p>;
  }

  const viewGate = {
    receiving: { label: 'Recebimento', enabled: isLogisticsOperationalRuntimeEnabled() },
    storage: { label: 'Armazenagem LPN', enabled: isLogisticsOperationalRuntimeEnabled() },
    picking: { label: 'Picking', enabled: isLogisticsOperationalRuntimeEnabled() },
    shipping: { label: 'Expedição', enabled: isLogisticsOperationalRuntimeEnabled() },
    dock: { label: 'Docas', enabled: isLogisticsGovernanceVisibilityEnabled() },
    telemetry: { label: 'Telemetria', enabled: isLogisticsGovernanceVisibilityEnabled() },
    governance: { label: 'Governança', enabled: isLogisticsGovernanceVisibilityEnabled() },
    rollout: { label: 'Rollout', enabled: isLogisticsExecutiveVisibilityEnabled() },
    maturity: { label: 'Maturidade', enabled: isLogisticsExecutiveVisibilityEnabled() }
  };

  const gated = view && viewGate[view];
  if (gated && !gated.enabled) {
    return (
      <div className="impetus-card" style={{ padding: 16, borderRadius: 4 }} {...uxShell}>
        <p style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase' }}>
          {gated.label} — runtime desligado
        </p>
        <Link to="/app/logistics/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
          Voltar
        </Link>
      </div>
    );
  }

  if (view === 'maturity') {
    return (
      <Suspense fallback={<p style={{ color: 'var(--text-secondary)' }}>Carregando maturidade…</p>}>
        <EnterpriseOperationalMaturityDashboard compact />
      </Suspense>
    );
  }

  if (view) {
    return (
      <div {...uxShell} className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <h2 style={{ margin: 0, fontSize: 18, textTransform: 'uppercase', color: 'var(--text-accent)' }}>{gated?.label || view}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 8 }}>
          Camada WMS/TMS — scaffold enterprise-safe. RF · LPN · OTIF integrados em fases posteriores sem alterar runtime core.
        </p>
        <Link to="/app/logistics/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
          Voltar ao hub
        </Link>
      </div>
    );
  }

  return (
    <div {...uxShell}>
      <header style={{ marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: 20, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
          Logística — Centro Operacional
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
          WMS · TMS · Recebimento · Picking · Expedição · OTIF · Supply chain
        </p>
      </header>
      {hubCard()}
    </div>
  );
}

function hubCard() {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
        Operação touch/RF-first · publication bounded · shadow rollout
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <Link to="/app/logistics/operational?view=receiving" className="btn-ghost" style={{ borderRadius: 4 }}>Recebimento</Link>
        <Link to="/app/logistics/operational?view=picking" className="btn-ghost" style={{ borderRadius: 4 }}>Picking</Link>
        <Link to="/app/logistics/operational?view=shipping" className="btn-ghost" style={{ borderRadius: 4 }}>Expedição</Link>
        <Link to="/app/logistics/operational?view=maturity" className="btn-ghost" style={{ borderRadius: 4 }}>Maturidade</Link>
      </div>
    </div>
  );
}

export default LogisticsOperationalWorkspace;
