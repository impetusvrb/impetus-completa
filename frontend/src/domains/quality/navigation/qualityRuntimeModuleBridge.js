/**
 * Ponte publication visibility → runtime efectivo (coexistência shadow-safe).
 * Evita menu publicado com workspace bloqueado por flag runtime ausente no build.
 */
import { isQualityOperationalRuntimeEnabled } from '../operational-runtime/qualityOperationalFeatureFlags.js';
import { isQualityGovernanceRuntimeEnabled } from '../governance/qualityGovernanceFeatureFlags.js';
import { isQualityTelemetryRuntimeEnabled } from '../telemetry/qualityTelemetryFeatureFlags.js';
import { isQualityCognitiveRuntimeEnabled } from '../cognitive/qualityCognitiveFeatureFlags.js';
import { isQualityRolloutRuntimeEnabled } from '../rollout/qualityRolloutFeatureFlags.js';
import {
  isQualityPublicationRuntimeEnabled,
  isQualityGovernanceVisibilityEnabled,
  isQualityExecutiveVisibilityEnabled
} from './qualityPublicationFeatureFlags.js';

function publicationCoexistence(baseRuntime, visibilityFlag) {
  if (baseRuntime) return true;
  if (!isQualityOperationalRuntimeEnabled()) return false;
  if (!isQualityPublicationRuntimeEnabled()) return false;
  return visibilityFlag === true;
}

export function isQualityGovernanceEffectiveEnabled() {
  return publicationCoexistence(isQualityGovernanceRuntimeEnabled(), isQualityGovernanceVisibilityEnabled());
}

export function isQualityTelemetryEffectiveEnabled() {
  return publicationCoexistence(isQualityTelemetryRuntimeEnabled(), isQualityGovernanceVisibilityEnabled());
}

export function isQualityCognitiveEffectiveEnabled() {
  return publicationCoexistence(
    isQualityCognitiveRuntimeEnabled(),
    isQualityExecutiveVisibilityEnabled() || isQualityGovernanceVisibilityEnabled()
  );
}

export function isQualityRolloutEffectiveEnabled() {
  return publicationCoexistence(isQualityRolloutRuntimeEnabled(), isQualityExecutiveVisibilityEnabled());
}

/** Alias de views do manifesto / menu lateral */
export function normalizeQualityWorkspaceView(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return null;
  if (v === 'ncr' || v === 'capa' || v === 'spc' || v === 'supplier') return 'governance';
  if (v === 'executive' || v === 'intelligence') return 'cognitive';
  return v;
}
