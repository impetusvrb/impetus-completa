import React from 'react';
import { Link } from 'react-router-dom';
import {
  isQualityGovernanceEffectiveEnabled,
  isQualityTelemetryEffectiveEnabled,
  isQualityCognitiveEffectiveEnabled,
  isQualityRolloutEffectiveEnabled
} from '../navigation/qualityRuntimeModuleBridge.js';
import { isQualityKioskRuntimeEnabled } from './qualityOperationalFeatureFlags.js';
import { isQualityOperationalDiagnosticsEnabled } from './qualityOperationalFeatureFlags.js';

/**
 * Hub enterprise — vista por defeito do centro operacional (sem empilhar debug/inspeção).
 */
export function QualityOperationalHub() {
  return (
    <div>
      <header style={{ marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: 20, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
          Qualidade — Centro Operacional
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
          Inspeções · NCR/CAPA · SPC · Telemetria · Inteligência contextual · Rollout
        </p>
      </header>
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
          Selecione um módulo no menu lateral ou use os atalhos abaixo. Workspaces reais montam por vista contextual (?view=).
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <Link to="/app/quality/operational/inspection" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4 }}>
            Inspeções
          </Link>
          {isQualityGovernanceEffectiveEnabled() ? (
            <Link to="/app/quality/operational?view=governance" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4 }}>
              NCR & CAPA
            </Link>
          ) : null}
          {isQualityGovernanceEffectiveEnabled() ? (
            <Link to="/app/quality/operational?view=governance" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4 }}>
              SPC / Governança
            </Link>
          ) : null}
          {isQualityTelemetryEffectiveEnabled() ? (
            <Link to="/app/quality/operational?view=telemetry" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4 }}>
              Telemetria
            </Link>
          ) : null}
          {isQualityCognitiveEffectiveEnabled() ? (
            <Link to="/app/quality/operational?view=cognitive" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4 }}>
              Inteligência contextual
            </Link>
          ) : null}
          {isQualityRolloutEffectiveEnabled() ? (
            <Link to="/app/quality/operational?view=rollout" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4 }}>
              Rollout
            </Link>
          ) : null}
          {isQualityKioskRuntimeEnabled() ? (
            <Link to="/app/quality/operational/kiosk" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4 }}>
              Kiosk
            </Link>
          ) : null}
          {isQualityOperationalDiagnosticsEnabled() ? (
            <Link to="/app/quality/operational?view=diagnostics" className="btn-ghost" style={{ minHeight: 44, borderRadius: 4 }}>
              Diagnósticos (pilot)
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default QualityOperationalHub;
