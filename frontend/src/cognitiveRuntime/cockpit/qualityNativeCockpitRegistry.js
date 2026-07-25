/**
 * INC-024 — Mapeamento center_id Z.23 → hubs existentes (sem novos componentes de domínio).
 */
import { lazy } from 'react';

/** @typedef {'governance'|'telemetry'|'cognitive'|'inspection'|'rollout'} QualityHubKey */

/** @type {Record<string, QualityHubKey>} */
export const CENTER_ID_TO_HUB = Object.freeze({
  quality_operational_nc: 'governance',
  quality_governance: 'governance',
  quality_action_capa: 'governance',
  quality_telemetry_spc: 'telemetry',
  quality_narrative: 'cognitive',
  quality_decision_support: 'cognitive'
});

export const QUALITY_HUB_COMPONENTS = Object.freeze({
  governance: lazy(() => import('../../domains/quality/governance/QualityGovernanceHub.jsx')),
  telemetry: lazy(() => import('../../domains/quality/telemetry/QualityTelemetryHub.jsx')),
  cognitive: lazy(() => import('../../domains/quality/cognitive/CognitiveQualityHub.jsx')),
  inspection: lazy(() => import('../../domains/quality/operational-runtime/QualityInspectionRuntime.jsx')),
  rollout: lazy(() => import('../../domains/quality/rollout/QualityRolloutHub.jsx'))
});

export const QUALITY_HUB_LABELS = Object.freeze({
  governance: 'Governança · NCR/CAPA · SPC',
  telemetry: 'Telemetria industrial',
  cognitive: 'Inteligência contextual',
  inspection: 'Inspeções',
  rollout: 'Rollout enterprise'
});

/** IDs de widgets genéricos substituídos pela promoção quality_native. */
export const QUALITY_PLACEHOLDER_WIDGET_IDS = Object.freeze([
  'qualidade',
  'kpi_cards',
  'rastreabilidade',
  'receitas',
  'grafico_tendencia',
  'operacoes',
  'manutencao'
]);

/**
 * @param {Array<{ center_id?: string, label?: string }>} centers
 * @returns {Array<{ hubKey: QualityHubKey, label: string, centerIds: string[] }>}
 */
export function resolvePromotedQualityHubs(centers = []) {
  const order = ['governance', 'telemetry', 'cognitive', 'inspection', 'rollout'];
  const bucket = new Map();

  for (const c of centers) {
    const hubKey = CENTER_ID_TO_HUB[c?.center_id];
    if (!hubKey) continue;
    if (!bucket.has(hubKey)) {
      bucket.set(hubKey, {
        hubKey,
        label: c.label || QUALITY_HUB_LABELS[hubKey],
        centerIds: []
      });
    }
    bucket.get(hubKey).centerIds.push(c.center_id);
  }

  return order.filter((k) => bucket.has(k)).map((k) => bucket.get(k));
}

export function shouldSuppressPlaceholderWidgets(specializedRuntime) {
  return (
    specializedRuntime?.consolidation_applied === true &&
    specializedRuntime?.cockpit_mode === 'quality_native'
  );
}
