import React, { lazy, Suspense } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { QualityInspectionRuntime } from './QualityInspectionRuntime.jsx';
import { QualityOfflineRuntime } from './QualityOfflineRuntime.jsx';
import { QualityOperationalDiagnostics } from './QualityOperationalDiagnostics.jsx';
import { QualityOperationalHub } from './QualityOperationalHub.jsx';
import { resolveQualityWorkspaceView } from './qualityWorkspaceViewResolver.js';
import { resolveQualityAudienceBand, resolveQualityUxDensity } from '../navigation/qualityAudienceNavigation.js';

const QualityGovernanceHub = lazy(() => import('../governance/QualityGovernanceHub.jsx'));
const QualityTelemetryHub = lazy(() => import('../telemetry/QualityTelemetryHub.jsx'));
const CognitiveQualityHub = lazy(() => import('../cognitive/CognitiveQualityHub.jsx'));
const QualityRolloutHub = lazy(() => import('../rollout/QualityRolloutHub.jsx'));
const QualityKioskRuntime = lazy(() => import('./QualityKioskRuntime.jsx'));

const WORKSPACE_BY_VIEW = {
  governance: QualityGovernanceHub,
  telemetry: QualityTelemetryHub,
  cognitive: CognitiveQualityHub,
  rollout: QualityRolloutHub
};

function DisabledRuntimeCard({ resolution, uxShell }) {
  return (
    <div className="impetus-card" style={{ padding: 16, borderRadius: 4, borderColor: 'var(--border-active)' }} {...uxShell}>
      <p style={{ margin: 0, color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Módulo {resolution.label} — runtime desligado
      </p>
      {resolution.env ? (
        <p style={{ margin: '10px 0 0', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>
          O item aparece no menu (publicação), mas o runtime deste módulo não está activo no build. Activar{' '}
          <code style={{ color: 'var(--cyan)' }}>{resolution.env}=true</code> e rebuild do frontend.
        </p>
      ) : null}
      <Link to="/app/quality/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', minHeight: 44, alignItems: 'center', borderRadius: 4 }}>
        Voltar ao centro operacional
      </Link>
    </div>
  );
}

/**
 * Workspace operacional — resolução centralizada de vistas (?view=) e hub enterprise por defeito.
 */
export function QualityOperationalWorkspace({ companyId: companyIdProp, stationId: stationIdProp }) {
  const ctx = useOutletContext() || {};
  const companyId = companyIdProp ?? ctx.companyId;
  const stationId = stationIdProp ?? ctx.stationId;
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');
  const resolution = resolveQualityWorkspaceView(view);

  let userBand = 'operator';
  try {
    const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    userBand = resolveQualityAudienceBand(u);
  } catch {
    userBand = 'operator';
  }
  const uxDensity = resolveQualityUxDensity(userBand);
  const uxShell = {
    'data-quality-ux': uxDensity,
    'data-quality-audience': userBand,
    'data-quality-workspace': resolution.workspaceId || 'quality_operational'
  };

  if (!companyId) {
    return <p style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Sessão sem empresa — não é possível abrir o runtime.</p>;
  }

  if (resolution.kind === 'disabled') {
    return <DisabledRuntimeCard resolution={resolution} uxShell={uxShell} />;
  }

  if (resolution.kind === 'diagnostics') {
    if (!resolution.enabled) {
      return <DisabledRuntimeCard resolution={resolution} uxShell={uxShell} />;
    }
    return (
      <div {...uxShell} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <QualityOperationalDiagnostics companyId={companyId} />
        <QualityOfflineRuntime companyId={companyId} />
        <Link to="/app/quality/operational" className="btn-ghost" style={{ alignSelf: 'flex-start', borderRadius: 4 }}>
          Voltar ao hub
        </Link>
      </div>
    );
  }

  if (resolution.kind === 'hub') {
    return (
      <div {...uxShell}>
        <QualityOperationalHub />
      </div>
    );
  }

  if (resolution.view === 'inspection') {
    return (
      <div {...uxShell} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <QualityOfflineRuntime companyId={companyId} />
        <QualityInspectionRuntime companyId={companyId} stationId={stationId} />
        <Link to="/app/quality/operational" className="btn-ghost" style={{ alignSelf: 'flex-start', borderRadius: 4 }}>
          Voltar ao hub
        </Link>
      </div>
    );
  }

  if (resolution.view === 'kiosk') {
    return (
      <div {...uxShell}>
        <Suspense fallback={<div className="impetus-card" style={{ padding: 16, borderRadius: 4 }}>Carregando kiosk…</div>}>
          <QualityKioskRuntime companyId={companyId} />
        </Suspense>
        <Link to="/app/quality/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
          Voltar ao hub
        </Link>
      </div>
    );
  }

  const HubComponent = resolution.view ? WORKSPACE_BY_VIEW[resolution.view] : null;
  if (HubComponent) {
    return (
      <div {...uxShell} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Suspense fallback={<div className="impetus-card" style={{ padding: 16, borderRadius: 4 }}>Carregando {resolution.label}…</div>}>
          <HubComponent companyId={companyId} />
        </Suspense>
        <Link to="/app/quality/operational" className="btn-ghost" style={{ alignSelf: 'flex-start', borderRadius: 4 }}>
          Voltar ao centro operacional
        </Link>
      </div>
    );
  }

  return (
    <div {...uxShell}>
      <QualityOperationalHub />
    </div>
  );
}

export default QualityOperationalWorkspace;
