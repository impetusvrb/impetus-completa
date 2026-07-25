/**
 * CPL-003 — Capability Versioning (independente · sem alterar providers).
 *
 * Versionamento de capacidade corporativa — não de ficheiros domínio.
 */
import { COGNITIVE_PLATFORM_REGISTRY } from '../../registry/cognitivePlatformRegistry.js';

/**
 * Histórico declarativo por capability.
 * current = versão governada; history = evolução metadata-only.
 */
const VERSION_OVERRIDES = Object.freeze({
  recommendation_engine: Object.freeze({
    current: '2.0.0',
    history: Object.freeze([
      Object.freeze({ version: '1.0.0', phase: 'OPM-007', note: 'wiRecommendationUtils advisory' }),
      Object.freeze({ version: '2.0.0', phase: 'OPM-008', note: 'clRecommendationEngine + logistics_adapter' })
    ])
  }),
  decision_trace: Object.freeze({
    current: '1.0.0',
    history: Object.freeze([
      Object.freeze({ version: '1.0.0', phase: 'OPM-008', note: 'clDecisionTrace' })
    ])
  }),
  scenario_simulation: Object.freeze({
    current: '1.0.0',
    history: Object.freeze([
      Object.freeze({ version: '1.0.0', phase: 'OPM-008', note: 'clScenarioUtils' })
    ])
  }),
  predictive_insights: Object.freeze({
    current: '1.1.0',
    history: Object.freeze([
      Object.freeze({ version: '1.0.0', phase: 'OPM-007', note: 'wiBottleneckUtils' }),
      Object.freeze({ version: '1.1.0', phase: 'OPM-008', note: 'clPredictiveUtils' })
    ])
  }),
  smart_panel: Object.freeze({
    current: '1.0.0',
    history: Object.freeze([
      Object.freeze({ version: '1.0.0', phase: 'BASELINE', note: 'SmartPanel certified surface' })
    ])
  })
});

function defaultVersionEntry(capabilityId) {
  return Object.freeze({
    capabilityId,
    current: '1.0.0',
    history: Object.freeze([
      Object.freeze({ version: '1.0.0', phase: 'CPL-001', note: 'Catalogued — provider unchanged' })
    ]),
    note: 'Independent capability version — provider code not versioned here'
  });
}

export const CAPABILITY_VERSIONS = Object.freeze(
  Object.fromEntries(
    COGNITIVE_PLATFORM_REGISTRY.map((cap) => {
      const override = VERSION_OVERRIDES[cap.capabilityId];
      if (override) {
        return [
          cap.capabilityId,
          Object.freeze({
            capabilityId: cap.capabilityId,
            current: override.current,
            history: override.history,
            note: 'Independent capability version — provider code not versioned here'
          })
        ];
      }
      return [cap.capabilityId, defaultVersionEntry(cap.capabilityId)];
    })
  )
);

export function getCapabilityVersion(capabilityId) {
  return CAPABILITY_VERSIONS[capabilityId] ?? null;
}

export function listCapabilityVersions() {
  return Object.values(CAPABILITY_VERSIONS);
}

export function validateVersionIntegrity() {
  const issues = [];
  for (const cap of COGNITIVE_PLATFORM_REGISTRY) {
    const v = CAPABILITY_VERSIONS[cap.capabilityId];
    if (!v?.current) issues.push(`missing version for ${cap.capabilityId}`);
    if (v && !Array.isArray(v.history)) issues.push(`invalid history for ${cap.capabilityId}`);
  }
  return { valid: issues.length === 0, issues, count: Object.keys(CAPABILITY_VERSIONS).length };
}
