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

  if (!companyId) {
    return <p style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Sessão sem empresa — não é possível abrir o runtime.</p>;
  }

  if (view === 'governance' && isQualityGovernanceRuntimeEnabled()) {
    return (
      <Suspense fallback={<div className="impetus-card" style={{ padding: 16, borderRadius: 4 }}>Carregando governança…</div>}>
        <QualityGovernanceHub companyId={companyId} />
      </Suspense>
    );
  }

  if (view === 'telemetry' && isQualityTelemetryRuntimeEnabled()) {
    return (
      <Suspense fallback={<div className="impetus-card" style={{ padding: 16, borderRadius: 4 }}>Carregando telemetria…</div>}>
        <QualityTelemetryHub companyId={companyId} />
      </Suspense>
    );
  }

  if (view === 'cognitive' && isQualityCognitiveRuntimeEnabled()) {
    return (
      <Suspense fallback={<div className="impetus-card" style={{ padding: 16, borderRadius: 4 }}>Carregando cognitive…</div>}>
        <CognitiveQualityHub companyId={companyId} />
      </Suspense>
    );
  }

  if (view === 'rollout' && isQualityRolloutRuntimeEnabled()) {
    return (
      <Suspense fallback={<div className="impetus-card" style={{ padding: 16, borderRadius: 4 }}>Carregando rollout…</div>}>
        <QualityRolloutHub companyId={companyId} />
      </Suspense>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
