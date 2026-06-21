import React, { lazy, Suspense } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { resolveSafetyAudienceBand, resolveSafetyUxDensity } from '../navigation/safetyAudienceNavigation.js';
import { isSafetyGovernanceRuntimeEnabled } from '../governance/safetyGovernanceFeatureFlags.js';
import { isSafetyTelemetryRuntimeEnabled } from '../telemetry/safetyTelemetryFeatureFlags.js';
import { isSafetyCognitiveRuntimeEnabled } from '../cognitive/safetyCognitiveFeatureFlags.js';
import { isSafetyRolloutRuntimeEnabled } from '../rollout/safetyRolloutFeatureFlags.js';
import { isSafetyOperationalRuntimeEnabled } from './safetyOperationalFeatureFlags.js';

const SafetyGovernanceHub = lazy(() => import('../governance/SafetyGovernanceHub.jsx'));
const SafetyPilotOperationalDashboard = lazy(() => import('../pilot/SafetyPilotOperationalDashboard.jsx'));
const SafetyTelemetryHub = lazy(() => import('../telemetry/SafetyTelemetryHub.jsx'));
const SafetyCognitiveHub = lazy(() => import('../cognitive/SafetyCognitiveHub.jsx'));
const SafetyRolloutHub = lazy(() => import('../rollout/SafetyRolloutHub.jsx'));
const SafetyIncidentPanel = lazy(() => import('./SafetyIncidentPanel.jsx'));

export function SafetyOperationalWorkspace() {
  const ctx = useOutletContext() || {};
  const companyId = ctx.companyId;
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');

  let userBand = 'operator';
  try {
    const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    userBand = resolveSafetyAudienceBand(u);
  } catch {
    userBand = 'operator';
  }
  const uxDensity = resolveSafetyUxDensity(userBand);
  const uxShell = { 'data-safety-ux': uxDensity, 'data-safety-audience': userBand };

  if (!companyId) {
    return <p style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Sessão sem empresa.</p>;
  }

  const viewRuntimeGate = {
    governance: { label: 'GHE & Matriz de Risco', enabled: isSafetyGovernanceRuntimeEnabled(), env: 'VITE_IMPETUS_SAFETY_GOVERNANCE_RUNTIME_ENABLED' },
    telemetry: { label: 'Telemetria SST', enabled: isSafetyTelemetryRuntimeEnabled(), env: 'VITE_IMPETUS_SAFETY_TELEMETRY_RUNTIME_ENABLED' },
    cognitive: { label: 'Inteligência SST', enabled: isSafetyCognitiveRuntimeEnabled(), env: 'VITE_IMPETUS_SAFETY_COGNITIVE_RUNTIME_ENABLED' },
    rollout: { label: 'Rollout enterprise', enabled: isSafetyRolloutRuntimeEnabled(), env: 'VITE_IMPETUS_SAFETY_ROLLOUT_RUNTIME_ENABLED' },
    executive: { label: 'Executive SST', enabled: isSafetyCognitiveRuntimeEnabled(), env: 'VITE_IMPETUS_SAFETY_COGNITIVE_RUNTIME_ENABLED' },
    incident: { label: 'Incidentes', enabled: isSafetyOperationalRuntimeEnabled(), env: 'VITE_IMPETUS_SAFETY_OPERATIONAL_RUNTIME_ENABLED' },
    ptw: { label: 'PT / APR / LOTO', enabled: isSafetyGovernanceRuntimeEnabled(), env: 'VITE_IMPETUS_SAFETY_GOVERNANCE_RUNTIME_ENABLED' },
    epi: { label: 'EPI / EPC', enabled: isSafetyGovernanceRuntimeEnabled(), env: 'VITE_IMPETUS_SAFETY_GOVERNANCE_RUNTIME_ENABLED' },
    pilot: { label: 'Validação operacional & pilot', enabled: isSafetyOperationalRuntimeEnabled(), env: 'VITE_IMPETUS_SAFETY_OPERATIONAL_RUNTIME_ENABLED' }
  };

  const gated = view && viewRuntimeGate[view];
  if (gated && !gated.enabled) {
    return (
      <div className="impetus-card" style={{ padding: 16, borderRadius: 4 }} {...uxShell}>
        <p style={{ margin: 0, color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {gated.label} — runtime desligado
        </p>
        {gated.env && (
          <p style={{ margin: '10px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            Activar <code style={{ color: 'var(--cyan)' }}>{gated.env}=true</code> e rebuild frontend.
          </p>
        )}
        <Link to="/app/safety/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', minHeight: 44, alignItems: 'center', borderRadius: 4 }}>
          Voltar ao operacional SST
        </Link>
      </div>
    );
  }

  if (view === 'governance') {
    return (
      <Suspense fallback={<p style={{ color: 'var(--text-secondary)' }}>Carregando governança SST…</p>}>
        <SafetyGovernanceHub />
      </Suspense>
    );
  }
  if (view === 'telemetry') {
    return (
      <Suspense fallback={<p style={{ color: 'var(--text-secondary)' }}>Carregando telemetria…</p>}>
        <SafetyTelemetryHub />
      </Suspense>
    );
  }
  if (view === 'cognitive' || view === 'executive') {
    return (
      <Suspense fallback={<p style={{ color: 'var(--text-secondary)' }}>Carregando inteligência…</p>}>
        <SafetyCognitiveHub />
      </Suspense>
    );
  }
  if (view === 'rollout') {
    return (
      <Suspense fallback={<p style={{ color: 'var(--text-secondary)' }}>Carregando rollout…</p>}>
        <SafetyRolloutHub />
      </Suspense>
    );
  }
  if (view === 'pilot') {
    return (
      <Suspense fallback={<p style={{ color: 'var(--text-secondary)' }}>Carregando validação pilot…</p>}>
        <SafetyPilotOperationalDashboard />
      </Suspense>
    );
  }
  if (view === 'incident') {
    return (
      <Suspense fallback={<p style={{ color: 'var(--text-secondary)' }}>Carregando incidentes…</p>}>
        <SafetyIncidentPanel companyId={companyId} />
      </Suspense>
    );
  }

  return (
    <div {...uxShell}>
      <header style={{ marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: 20, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
          SST — Centro Operacional
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
          GHE · Matriz de risco · PT/APR/LOTO · EPI/EPC · Incidentes · Compliance
        </p>
      </header>
      {motionlessLoadingCard()}
    </div>
  );
}

function motionlessLoadingCard() {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
        Selecione um módulo no menu lateral ou use as vistas: governança, telemetria, cognitivo, rollout.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <Link to="/app/safety/operational?view=governance" className="btn-ghost" style={{ borderRadius: 4 }}>GHE & Risco</Link>
        <Link to="/app/safety/operational?view=incident" className="btn-ghost" style={{ borderRadius: 4 }}>Incidentes</Link>
        <Link to="/app/safety/operational?view=ptw" className="btn-ghost" style={{ borderRadius: 4 }}>PT / LOTO</Link>
        <Link to="/app/safety/operational/inspection" className="btn-ghost" style={{ borderRadius: 4 }}>Inspeção</Link>
        <Link to="/app/safety/operational?view=pilot" className="btn-ghost" style={{ borderRadius: 4 }}>Pilot & validação</Link>
      </div>
    </div>
  );
}

export default SafetyOperationalWorkspace;
