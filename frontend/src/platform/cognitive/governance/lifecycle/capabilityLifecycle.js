/**
 * CPL-003 — Capability Lifecycle (metadata only · sem alterar implementações).
 */
import { COGNITIVE_PLATFORM_REGISTRY } from '../../registry/cognitivePlatformRegistry.js';

export const CPL_GOVERNANCE_PHASE = 'CPL-003';

export const CAPABILITY_LIFECYCLE_STATES = Object.freeze([
  'planned',
  'experimental',
  'active',
  'deprecated',
  'retired'
]);

/**
 * Lifecycle explícito por capability.
 * Derivado do adapterStatus CPL-002 quando não há override.
 * Não altera providers nem adapters.
 */
const LIFECYCLE_OVERRIDES = Object.freeze({
  // nenhuma override por defeito — derivação automática
});

function deriveLifecycleStatus(cap) {
  if (LIFECYCLE_OVERRIDES[cap.capabilityId]) {
    return LIFECYCLE_OVERRIDES[cap.capabilityId];
  }
  if (cap.adapterStatus === 'active') return 'active';
  if (cap.adapterStatus === 'planned') return 'experimental';
  return 'planned';
}

/** Mapa capabilityId → lifecycle entry */
export const CAPABILITY_LIFECYCLE = Object.freeze(
  Object.fromEntries(
    COGNITIVE_PLATFORM_REGISTRY.map((cap) => {
      const status = deriveLifecycleStatus(cap);
      return [
        cap.capabilityId,
        Object.freeze({
          capabilityId: cap.capabilityId,
          status,
          sincePhase: status === 'active' ? 'CPL-002' : 'CPL-001',
          note: 'Metadata only — provider implementation unchanged'
        })
      ];
    })
  )
);

export function getCapabilityLifecycle(capabilityId) {
  return CAPABILITY_LIFECYCLE[capabilityId] ?? null;
}

export function listCapabilitiesByLifecycleStatus(status) {
  return Object.values(CAPABILITY_LIFECYCLE).filter((e) => e.status === status);
}

export function validateLifecycleIntegrity() {
  const issues = [];
  for (const cap of COGNITIVE_PLATFORM_REGISTRY) {
    const entry = CAPABILITY_LIFECYCLE[cap.capabilityId];
    if (!entry) {
      issues.push(`missing lifecycle for ${cap.capabilityId}`);
      continue;
    }
    if (!CAPABILITY_LIFECYCLE_STATES.includes(entry.status)) {
      issues.push(`invalid lifecycle status for ${cap.capabilityId}: ${entry.status}`);
    }
  }
  return { valid: issues.length === 0, issues, count: Object.keys(CAPABILITY_LIFECYCLE).length };
}
