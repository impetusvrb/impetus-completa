/**
 * Resolução canónica view → workspace (publication-safe, sem App.jsx).
 */
import {
  isQualityGovernanceEffectiveEnabled,
  isQualityTelemetryEffectiveEnabled,
  isQualityCognitiveEffectiveEnabled,
  isQualityRolloutEffectiveEnabled,
  normalizeQualityWorkspaceView
} from '../navigation/qualityRuntimeModuleBridge.js';
import { isQualityOperationalRuntimeEnabled } from './qualityOperationalFeatureFlags.js';
import { isQualityOperationalDiagnosticsEnabled } from './qualityOperationalFeatureFlags.js';
import { isQualityKioskRuntimeEnabled } from './qualityOperationalFeatureFlags.js';

/** @typedef {'hub'|'workspace'|'route_child'|'disabled'|'diagnostics'} QualityResolveKind */

/**
 * @param {string|null|undefined} rawView
 * @returns {{
 *   kind: QualityResolveKind,
 *   view: string|null,
 *   label: string,
 *   enabled: boolean,
 *   env?: string|null,
 *   workspaceId?: string
 * }}
 */
export function resolveQualityWorkspaceView(rawView) {
  const view = normalizeQualityWorkspaceView(rawView);

  if (!view) {
    return {
      kind: 'hub',
      view: null,
      label: 'Quality — Centro Operacional',
      enabled: isQualityOperationalRuntimeEnabled(),
      workspaceId: 'quality_operational_hub'
    };
  }

  if (view === 'diagnostics') {
    return {
      kind: 'diagnostics',
      view: 'diagnostics',
      label: 'Diagnósticos runtime',
      enabled: isQualityOperationalDiagnosticsEnabled(),
      env: 'VITE_IMPETUS_QUALITY_OPERATIONAL_DIAGNOSTICS',
      workspaceId: 'quality_diagnostics'
    };
  }

  if (view === 'inspection') {
    return {
      kind: 'workspace',
      view: 'inspection',
      label: 'Inspeções',
      enabled: isQualityOperationalRuntimeEnabled(),
      workspaceId: 'quality_inspection_inline'
    };
  }

  if (view === 'kiosk') {
    return {
      kind: 'workspace',
      view: 'kiosk',
      label: 'Kiosk',
      enabled: isQualityKioskRuntimeEnabled(),
      env: 'VITE_IMPETUS_QUALITY_KIOSK_ENABLED',
      workspaceId: 'quality_kiosk_inline'
    };
  }

  const registry = {
    governance: {
      label: 'NCR & CAPA / Governança',
      enabled: isQualityGovernanceEffectiveEnabled(),
      env: 'VITE_IMPETUS_QUALITY_GOVERNANCE_RUNTIME_ENABLED',
      workspaceId: 'quality_governance_hub'
    },
    telemetry: {
      label: 'Telemetria industrial',
      enabled: isQualityTelemetryEffectiveEnabled(),
      env: 'VITE_IMPETUS_QUALITY_TELEMETRY_RUNTIME_ENABLED',
      workspaceId: 'quality_telemetry_hub'
    },
    cognitive: {
      label: 'Inteligência contextual',
      enabled: isQualityCognitiveEffectiveEnabled(),
      env: 'VITE_IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED',
      workspaceId: 'quality_cognitive_hub'
    },
    rollout: {
      label: 'Rollout enterprise',
      enabled: isQualityRolloutEffectiveEnabled(),
      env: 'VITE_IMPETUS_QUALITY_ROLLOUT_RUNTIME_ENABLED',
      workspaceId: 'quality_rollout_hub'
    }
  };

  const entry = registry[view];
  if (!entry) {
    return {
      kind: 'hub',
      view,
      label: `Vista «${view}»`,
      enabled: true,
      workspaceId: 'quality_unknown_view_fallback_hub'
    };
  }

  return {
    kind: entry.enabled ? 'workspace' : 'disabled',
    view,
    label: entry.label,
    enabled: entry.enabled,
    env: entry.env,
    workspaceId: entry.workspaceId
  };
}
