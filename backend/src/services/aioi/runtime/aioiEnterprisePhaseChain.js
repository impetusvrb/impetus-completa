'use strict';

/**
 * Cadeia canónica enterprise P1A → P1N (14 fases).
 * Fonte única para P1N (compliance/drift/docs) e P1O (baseline).
 * O registry P1J (aioiCertificationRegistryService) permanece scoped a P1A–P1I (9).
 */

const ENTERPRISE_BASELINE_PHASE_COUNT = 14;
const ENTERPRISE_BASELINE_RANGE = 'P1A-P1N';
const P1J_REGISTRY_PHASE_COUNT = 9;

/** Contagens obsoletas que indicam deriva documental */
const STALE_PHASE_COUNTS = Object.freeze([9, 13]);

const ENTERPRISE_BASELINE_PHASES = Object.freeze([
  { id: 'P1A', doc: 'AIOI_P1A_RUNTIME_AUDIT.md', verdict: 'AIOI_P1A_CONTINUOUS_RUNTIME_FOUNDATION_PASS', deps: [] },
  { id: 'P1B', doc: 'AIOI_P1B_ENTERPRISE_READINESS.md', verdict: 'AIOI_P1B_CONTINUOUS_RUNTIME_OPERATION_PASS', deps: ['P1A'] },
  { id: 'P1C', doc: 'AIOI_P1C_ENTERPRISE_SCALE_READINESS.md', verdict: 'AIOI_P1C_ENTERPRISE_SCALE_CERTIFICATION_PASS', deps: ['P1B'] },
  { id: 'P1D', doc: 'AIOI_P1D_ENTERPRISE_RUNTIME_HARDENING.md', verdict: 'AIOI_P1D_ENTERPRISE_RUNTIME_HARDENING_PASS', deps: ['P1C'] },
  { id: 'P1E', doc: 'AIOI_P1E_ENTERPRISE_HORIZONTAL_SCALE.md', verdict: 'AIOI_P1E_ENTERPRISE_HORIZONTAL_SCALE_PASS', deps: ['P1D'] },
  { id: 'P1F', doc: 'AIOI_P1F_ENTERPRISE_HORIZONTAL_VALIDATION.md', verdict: 'AIOI_P1F_CONTROLLED_HORIZONTAL_RUNTIME_VALIDATION_PASS', deps: ['P1E'] },
  { id: 'P1G', doc: 'AIOI_P1G_ENTERPRISE_HORIZONTAL_ACTIVATION.md', verdict: 'AIOI_P1G_CONTROLLED_HORIZONTAL_ACTIVATION_PASS', deps: ['P1F'] },
  { id: 'P1H', doc: 'AIOI_P1H_ENTERPRISE_DISTRIBUTED_RUNTIME.md', verdict: 'AIOI_P1H_DISTRIBUTED_WORKER_ACTIVATION_PASS', deps: ['P1G'] },
  { id: 'P1I', doc: 'AIOI_P1I_ENTERPRISE_DISTRIBUTED_OPERATIONS.md', verdict: 'AIOI_P1I_ENTERPRISE_DISTRIBUTED_OPERATIONS_PASS', deps: ['P1H'] },
  { id: 'P1J', doc: 'AIOI_P1J_ENTERPRISE_PRODUCTION_READINESS.md', verdict: 'AIOI_P1J_ENTERPRISE_PRODUCTION_READINESS_PASS', deps: ['P1I'] },
  { id: 'P1K', doc: 'AIOI_P1K_ENTERPRISE_DEPLOYMENT_GOVERNANCE.md', verdict: 'AIOI_P1K_ENTERPRISE_DEPLOYMENT_GOVERNANCE_PASS', deps: ['P1J'] },
  { id: 'P1L', doc: 'AIOI_P1L_ENTERPRISE_OPERATIONAL_CERTIFICATION.md', verdict: 'AIOI_P1L_ENTERPRISE_OPERATIONAL_CERTIFICATION_PASS', deps: ['P1K'] },
  { id: 'P1M', doc: 'AIOI_P1M_ENTERPRISE_RUNTIME_AUTHORIZATION.md', verdict: 'AIOI_P1M_ENTERPRISE_RUNTIME_AUTHORIZATION_PASS', deps: ['P1L'] },
  { id: 'P1N', doc: 'AIOI_P1N_ENTERPRISE_COMPLIANCE.md', verdict: 'AIOI_P1N_ENTERPRISE_COMPLIANCE_AND_OPERATIONAL_INTEGRITY_PASS', deps: ['P1M'] }
]);

function isCanonicalPhaseCount(count) {
  return count === ENTERPRISE_BASELINE_PHASE_COUNT;
}

function detectStalePhaseCount(count, context = 'unknown') {
  if (isCanonicalPhaseCount(count)) return null;
  if (STALE_PHASE_COUNTS.includes(count)) {
    return {
      context,
      reported_count: count,
      expected_count: ENTERPRISE_BASELINE_PHASE_COUNT,
      stale: true,
      message: `Contagem obsoleta ${count} — baseline exige ${ENTERPRISE_BASELINE_PHASE_COUNT} (${ENTERPRISE_BASELINE_RANGE})`
    };
  }
  if (count !== ENTERPRISE_BASELINE_PHASE_COUNT) {
    return {
      context,
      reported_count: count,
      expected_count: ENTERPRISE_BASELINE_PHASE_COUNT,
      stale: true,
      message: `Contagem ${count} ≠ ${ENTERPRISE_BASELINE_PHASE_COUNT} (${ENTERPRISE_BASELINE_RANGE})`
    };
  }
  return null;
}

module.exports = {
  ENTERPRISE_BASELINE_PHASE_COUNT,
  ENTERPRISE_BASELINE_RANGE,
  P1J_REGISTRY_PHASE_COUNT,
  STALE_PHASE_COUNTS,
  ENTERPRISE_BASELINE_PHASES,
  isCanonicalPhaseCount,
  detectStalePhaseCount
};
