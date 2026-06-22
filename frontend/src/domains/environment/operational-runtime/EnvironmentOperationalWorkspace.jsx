import React, { lazy, Suspense } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { resolveEnvironmentAudienceBand, resolveEnvironmentUxDensity } from '../navigation/environmentAudienceNavigation.js';
import { isEnvironmentOperationalRuntimeEnabled } from './environmentOperationalFeatureFlags.js';
import {
  isEnvironmentGovernanceVisibilityEnabled,
  isEnvironmentExecutiveVisibilityEnabled
} from '../navigation/environmentPublicationFeatureFlags.js';
import { EnvironmentOperationalViewRouter } from './EnvironmentOperationalViewRouter.jsx';
import { EnvironmentGovernanceViewRouter } from '../governance/EnvironmentGovernanceViewRouter.jsx';
import { EnvironmentTelemetryViewRouter } from '../telemetry-runtime/EnvironmentTelemetryViewRouter.jsx';
import { isEnvironmentTelemetryRuntimeEnabled } from '../telemetry-runtime/environmentTelemetryFeatureFlags.js';
import { EnvironmentCognitiveViewRouter } from '../cognitive-runtime/EnvironmentCognitiveViewRouter.jsx';
import { isEnvironmentCognitiveRuntimeEnabled } from '../cognitive-runtime/environmentCognitiveFeatureFlags.js';
import { EnvironmentExecutiveViewRouter } from '../executive-runtime/EnvironmentExecutiveViewRouter.jsx';
import { isEnvironmentExecutiveRuntimeEnabled } from '../executive-runtime/environmentExecutiveFeatureFlags.js';

const EnterpriseOperationalMaturityDashboard = lazy(() =>
  import('../../../runtime-validation/EnterpriseOperationalMaturityDashboard.jsx')
);
const EnvironmentPilotRolloutHub = lazy(() =>
  import('../pilot-runtime/EnvironmentPilotRolloutHub.jsx')
);
const EcosystemCorrelationHub = lazy(() =>
  import('../../../ecosystem-correlation/EcosystemCorrelationHub.jsx')
);
const EnterpriseHardeningHub = lazy(() =>
  import('../../../enterprise-hardening/EnterpriseHardeningHub.jsx')
);
const EnvironmentOperationalEventsPanel = lazy(() =>
  import('./EnvironmentOperationalEventsPanel.jsx')
);

const OPERATIONAL_VIEWS = new Set(['water', 'effluent', 'emissions', 'waste', 'field', 'effluent-nc', 'events']);
const GOVERNANCE_VIEWS = new Set([
  'esg',
  'compliance',
  'carbon',
  'energy',
  'sustainability',
  'governance',
  'intelligence',
  'rollout'
]);

const TELEMETRY_VIEWS = new Set(['telemetry']);
const COGNITIVE_VIEWS = new Set(['cognitive']);
const EXECUTIVE_VIEWS = new Set(['executive']);
const PILOT_VIEWS = new Set(['pilot', 'rollout']);
const ECOSYSTEM_VIEWS = new Set(['ecosystem', 'correlation']);
const HARDENING_VIEWS = new Set(['hardening', 'resilience', 'maturity-hardening']);

export function EnvironmentOperationalWorkspace() {
  const ctx = useOutletContext() || {};
  const companyId = ctx.companyId;
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');

  let userBand = 'operator';
  try {
    const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    userBand = resolveEnvironmentAudienceBand(u);
  } catch {
    userBand = 'operator';
  }
  const uxDensity = resolveEnvironmentUxDensity(userBand);
  const uxShell = { 'data-environment-ux': uxDensity, 'data-environment-audience': userBand };

  if (!companyId) {
    return <p style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Sessão sem empresa.</p>;
  }

  const viewGate = {
    water: { label: 'Água & balanço hídrico', enabled: isEnvironmentOperationalRuntimeEnabled() },
    effluent: { label: 'ETA / ETE', enabled: isEnvironmentOperationalRuntimeEnabled() },
    emissions: { label: 'Emissões', enabled: isEnvironmentOperationalRuntimeEnabled() },
    waste: { label: 'Resíduos & MTR', enabled: isEnvironmentOperationalRuntimeEnabled() },
    field: { label: 'Campo', enabled: isEnvironmentOperationalRuntimeEnabled() },
    events: { label: 'Eventos ambientais', enabled: isEnvironmentOperationalRuntimeEnabled() },
    esg: { label: 'ESG', enabled: isEnvironmentGovernanceVisibilityEnabled() },
    compliance: { label: 'Compliance', enabled: isEnvironmentGovernanceVisibilityEnabled() },
    carbon: { label: 'Carbono', enabled: isEnvironmentGovernanceVisibilityEnabled() },
    energy: { label: 'Energia', enabled: isEnvironmentGovernanceVisibilityEnabled() },
    sustainability: { label: 'Sustentabilidade', enabled: isEnvironmentGovernanceVisibilityEnabled() },
    telemetry: { label: 'Telemetria', enabled: isEnvironmentTelemetryRuntimeEnabled() },
    cognitive: { label: 'Inteligência cognitiva', enabled: isEnvironmentCognitiveRuntimeEnabled() },
    executive: { label: 'Cockpit executivo', enabled: isEnvironmentExecutiveRuntimeEnabled() },
    governance: { label: 'Governança', enabled: isEnvironmentGovernanceVisibilityEnabled() },
    intelligence: { label: 'Inteligência', enabled: isEnvironmentGovernanceVisibilityEnabled() },
    rollout: { label: 'Rollout', enabled: isEnvironmentExecutiveVisibilityEnabled() },
    maturity: { label: 'Maturidade', enabled: isEnvironmentExecutiveVisibilityEnabled() },
    pilot: { label: 'Pilot rollout', enabled: isEnvironmentExecutiveVisibilityEnabled() },
    ecosystem: { label: 'Correlação ecossistema', enabled: isEnvironmentExecutiveVisibilityEnabled() },
    hardening: { label: 'Enterprise hardening', enabled: isEnvironmentExecutiveVisibilityEnabled() },
    resilience: { label: 'Resiliência enterprise', enabled: isEnvironmentExecutiveVisibilityEnabled() },
    'maturity-hardening': { label: 'Maturidade hardening', enabled: isEnvironmentExecutiveVisibilityEnabled() }
  };

  const gated = view && viewGate[view];
  if (gated && !gated.enabled) {
    return (
      <div className="impetus-card" style={{ padding: 16, borderRadius: 4 }} {...uxShell}>
        <p style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase' }}>
          {gated.label} — runtime desligado (shadow)
        </p>
        <Link to="/app/environment/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
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

  if (view && PILOT_VIEWS.has(view)) {
    return (
      <Suspense fallback={<p style={{ color: 'var(--text-secondary)' }}>Carregando pilot…</p>}>
        <div {...uxShell}>
          <EnvironmentPilotRolloutHub />
        </div>
      </Suspense>
    );
  }

  if (view && ECOSYSTEM_VIEWS.has(view)) {
    return (
      <Suspense fallback={<p style={{ color: 'var(--text-secondary)' }}>Carregando correlação…</p>}>
        <div {...uxShell}>
          <EcosystemCorrelationHub />
        </div>
      </Suspense>
    );
  }

  if (view && HARDENING_VIEWS.has(view)) {
    return (
      <Suspense fallback={<p style={{ color: 'var(--text-secondary)' }}>Carregando hardening…</p>}>
        <div {...uxShell}>
          <EnterpriseHardeningHub />
        </div>
      </Suspense>
    );
  }

  if (view === 'events') {
    return (
      <Suspense fallback={<p style={{ color: 'var(--text-secondary)' }}>Carregando eventos…</p>}>
        <div {...uxShell}>
          <EnvironmentOperationalEventsPanel companyId={companyId} />
          <Link to="/app/environment/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
            Voltar ao hub
          </Link>
        </div>
      </Suspense>
    );
  }

  if (view && OPERATIONAL_VIEWS.has(view)) {
    return (
      <div {...uxShell}>
        <EnvironmentOperationalViewRouter />
        <Link to="/app/environment/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
          Voltar ao hub
        </Link>
      </div>
    );
  }

  if (view && EXECUTIVE_VIEWS.has(view)) {
    return (
      <div {...uxShell}>
        <EnvironmentExecutiveViewRouter companyId={companyId} />
        <Link to="/app/environment/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
          Voltar ao hub
        </Link>
      </div>
    );
  }

  if (view && COGNITIVE_VIEWS.has(view)) {
    return (
      <div {...uxShell}>
        <EnvironmentCognitiveViewRouter companyId={companyId} />
        <Link to="/app/environment/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
          Voltar ao hub
        </Link>
      </div>
    );
  }

  if (view && TELEMETRY_VIEWS.has(view)) {
    return (
      <div {...uxShell}>
        <EnvironmentTelemetryViewRouter companyId={companyId} />
        <Link to="/app/environment/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
          Voltar ao hub
        </Link>
      </div>
    );
  }

  if (view && GOVERNANCE_VIEWS.has(view)) {
    return (
      <div {...uxShell}>
        <EnvironmentGovernanceViewRouter />
        <Link to="/app/environment/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
          Voltar ao hub
        </Link>
      </div>
    );
  }

  return (
    <div {...uxShell}>
      <header style={{ marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: 20, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
          Ambiental — Centro Operacional
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
          Água · ETA/ETE · Emissões · Resíduos · Campo · mobile · offline · realtime
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
        Coleta operacional rápida · scanner · evidências · fila offline · shadow-first
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <Link to="/app/environment/operational?view=water" className="btn-ghost" style={{ borderRadius: 4 }}>Água / ETA</Link>
        <Link to="/app/environment/operational?view=water" className="btn-ghost" style={{ borderRadius: 4 }}>Água</Link>
        <Link to="/app/environment/operational?view=effluent" className="btn-ghost" style={{ borderRadius: 4 }}>ETE</Link>
        <Link to="/app/environment/operational?view=emissions" className="btn-ghost" style={{ borderRadius: 4 }}>Emissões</Link>
        <Link to="/app/environment/operational?view=waste" className="btn-ghost" style={{ borderRadius: 4 }}>Resíduos</Link>
        <Link to="/app/environment/operational?view=field" className="btn-ghost" style={{ borderRadius: 4 }}>Campo</Link>
        <Link to="/app/environment/operational?view=events" className="btn-ghost" style={{ borderRadius: 4 }}>Eventos</Link>
        <Link to="/app/environment/operational?view=governance" className="btn-ghost" style={{ borderRadius: 4 }}>Governança</Link>
        <Link to="/app/environment/operational?view=telemetry" className="btn-ghost" style={{ borderRadius: 4 }}>Telemetria</Link>
        <Link to="/app/environment/operational?view=cognitive" className="btn-ghost" style={{ borderRadius: 4 }}>Cognitivo</Link>
        <Link to="/app/environment/operational?view=executive" className="btn-ghost" style={{ borderRadius: 4 }}>Executivo</Link>
        <Link to="/app/environment/operational?view=esg" className="btn-ghost" style={{ borderRadius: 4 }}>ESG</Link>
        <Link to="/app/environment/operational?view=pilot" className="btn-ghost" style={{ borderRadius: 4 }}>Pilot</Link>
        <Link to="/app/environment/operational?view=maturity" className="btn-ghost" style={{ borderRadius: 4 }}>Maturidade</Link>
        <Link to="/app/environment/operational?view=ecosystem" className="btn-ghost" style={{ borderRadius: 4 }}>Ecossistema</Link>
        <Link to="/app/environment/operational?view=hardening" className="btn-ghost" style={{ borderRadius: 4 }}>Hardening</Link>
      </div>
    </div>
  );
}

export default EnvironmentOperationalWorkspace;
