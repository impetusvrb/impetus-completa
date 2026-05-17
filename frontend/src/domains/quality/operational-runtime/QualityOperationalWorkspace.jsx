import React, { lazy, Suspense } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { QualityInspectionRuntime } from './QualityInspectionRuntime.jsx';
import { QualityOfflineRuntime } from './QualityOfflineRuntime.jsx';
import { isQualityKioskRuntimeEnabled } from './qualityOperationalFeatureFlags.js';
import { QualityOperationalDiagnostics } from './QualityOperationalDiagnostics.jsx';
import { isQualityGovernanceRuntimeEnabled } from '../governance/qualityGovernanceFeatureFlags.js';
import { isQualityTelemetryRuntimeEnabled } from '../telemetry/qualityTelemetryFeatureFlags.js';
import { isQualityCognitiveRuntimeEnabled } from '../cognitive/qualityCognitiveFeatureFlags.js';
import { isQualityRolloutRuntimeEnabled } from '../rollout/qualityRolloutFeatureFlags.js';
import { resolveQualityAudienceBand, resolveQualityUxDensity } from '../navigation/qualityAudienceNavigation.js';

const QualityGovernanceHub = lazy(() => import('../governance/QualityGovernanceHub.jsx'));
const QualityTelemetryHub = lazy(() => import('../telemetry/QualityTelemetryHub.jsx'));
const CognitiveQualityHub = lazy(() => import('../cognitive/CognitiveQualityHub.jsx'));
const QualityRolloutHub = lazy(() => import('../rollout/QualityRolloutHub.jsx'));

/**
 * Workspace mínimo — composição lazy-friendly.
 */
export function QualityOperationalWorkspace({ companyId: companyIdProp, stationId: stationIdProp }) {
  const ctx = useOutletContext() || {};
  const companyId = companyIdProp ?? ctx.companyId;
  const stationId = stationIdProp ?? ctx.stationId;
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');

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
    'data-quality-audience': userBand
  };

  if (!companyId) {
    return <p style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Sessão sem empresa — não é possível abrir o runtime.</p>;
  }

  const viewRuntimeGate = {
    governance: {
      label: 'NCR & CAPA / Governança',
      enabled: isQualityGovernanceRuntimeEnabled(),
      env: 'VITE_IMPETUS_QUALITY_GOVERNANCE_RUNTIME_ENABLED'
    },
    telemetry: {
      label: 'Telemetria industrial',
      enabled: isQualityTelemetryRuntimeEnabled(),
      env: 'VITE_IMPETUS_QUALITY_TELEMETRY_RUNTIME_ENABLED'
    },
    cognitive: {
      label: 'Inteligência contextual',
      enabled: isQualityCognitiveRuntimeEnabled(),
      env: 'VITE_IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED'
    },
    rollout: {
      label: 'Rollout enterprise',
      enabled: isQualityRolloutRuntimeEnabled(),
      env: 'VITE_IMPETUS_QUALITY_ROLLOUT_RUNTIME_ENABLED'
    }
  };
  const gated = view && viewRuntimeGate[view];
  if (gated && !gated.enabled) {
    return (
      <div className="impetus-card" style={{ padding: 16, borderRadius: 4, borderColor: 'var(--border-active)' }} {...uxShell}>
        <p style={{ margin: 0, color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Módulo {gated.label} — runtime desligado
        </p>
        <p style={{ margin: '10px 0 0', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>
          O item aparece no menu (publicação), mas o runtime deste módulo não está activo no build. Peça ao administrador para activar{' '}
          <code style={{ color: 'var(--cyan)' }}>{gated.env}=true</code> e voltar a fazer deploy do frontend.
        </p>
        <Link to="/app/quality/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', minHeight: 44, alignItems: 'center', borderRadius: 4 }}>
          Voltar ao operacional
        </Link>
      </div>
    );
  }

  if (view === 'governance' && isQualityGovernanceRuntimeEnabled()) {
    return (
      <div {...uxShell} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Suspense fallback={<div className="impetus-card" style={{ padding: 16, borderRadius: 4 }}>Carregando governança…</div>}>
          <QualityGovernanceHub companyId={companyId} />
        </Suspense>
      </div>
    );
  }

  if (view === 'telemetry' && isQualityTelemetryRuntimeEnabled()) {
    return (
      <div {...uxShell} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Suspense fallback={<div className="impetus-card" style={{ padding: 16, borderRadius: 4 }}>Carregando telemetria…</div>}>
          <QualityTelemetryHub companyId={companyId} />
        </Suspense>
      </div>
    );
  }

  if (view === 'cognitive' && isQualityCognitiveRuntimeEnabled()) {
    return (
      <div {...uxShell} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Suspense fallback={<div className="impetus-card" style={{ padding: 16, borderRadius: 4 }}>Carregando cognitive…</div>}>
          <CognitiveQualityHub companyId={companyId} />
        </Suspense>
      </div>
    );
  }

  if (view === 'rollout' && isQualityRolloutRuntimeEnabled()) {
    return (
      <div {...uxShell} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Suspense fallback={<div className="impetus-card" style={{ padding: 16, borderRadius: 4 }}>Carregando rollout…</div>}>
          <QualityRolloutHub companyId={companyId} />
        </Suspense>
      </div>
    );
  }

  return (
    <div {...uxShell} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {isQualityGovernanceRuntimeEnabled() ? (
          <Link
            to={{ pathname: '/app/quality/operational', search: '?view=governance' }}
            className="btn-ghost"
            style={{ minHeight: 48, padding: '0 14px', display: 'inline-flex', alignItems: 'center', borderRadius: 4 }}
          >
            Governança / inteligência
          </Link>
        ) : null}
        {isQualityRolloutRuntimeEnabled() ? (
          <Link
            to={{ pathname: '/app/quality/operational', search: '?view=rollout' }}
            className="btn-ghost"
            style={{ minHeight: 48, padding: '0 14px', display: 'inline-flex', alignItems: 'center', borderRadius: 4 }}
          >
            Rollout enterprise
          </Link>
        ) : null}
        {isQualityCognitiveRuntimeEnabled() ? (
          <Link
            to={{ pathname: '/app/quality/operational', search: '?view=cognitive' }}
            className="btn-ghost"
            style={{ minHeight: 48, padding: '0 14px', display: 'inline-flex', alignItems: 'center', borderRadius: 4 }}
          >
            Inteligência cognitiva
          </Link>
        ) : null}
        {isQualityTelemetryRuntimeEnabled() ? (
          <Link
            to={{ pathname: '/app/quality/operational', search: '?view=telemetry' }}
            className="btn-ghost"
            style={{ minHeight: 48, padding: '0 14px', display: 'inline-flex', alignItems: 'center', borderRadius: 4 }}
          >
            Telemetria industrial
          </Link>
        ) : null}
        <Link
          to="/app/quality/operational/inspection"
          className="btn-ghost"
          style={{ minHeight: 48, padding: '0 14px', display: 'inline-flex', alignItems: 'center', borderRadius: 4 }}
        >
          Inspeção dedicada
        </Link>
        {isQualityKioskRuntimeEnabled() ? (
          <Link
            to="/app/quality/operational/kiosk"
            className="btn-ghost"
            style={{ minHeight: 48, padding: '0 14px', display: 'inline-flex', alignItems: 'center', borderRadius: 4 }}
          >
            Kiosk
          </Link>
        ) : null}
      </div>
      <QualityOperationalDiagnostics companyId={companyId} />
      <QualityOfflineRuntime companyId={companyId} />
      <QualityInspectionRuntime companyId={companyId} stationId={stationId} />
    </div>
  );
}

export default QualityOperationalWorkspace;
