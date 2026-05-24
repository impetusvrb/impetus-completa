'use strict';

const c6 = require('../config/phaseC6FeatureFlags');
const { establishCognitiveSovereignty } = require('../sovereignty/cognitiveSovereigntyRuntime');
const { unifyRuntimeAuthority } = require('../sovereignty/runtimeAuthorityUnifier');
const { retireEngineV2 } = require('../retirement/engineV2RetirementRuntime');
const { suppressLegacyCompetition } = require('../retirement/legacyCompetitionSuppressor');
const { governMotorAFallback } = require('../fallback/motorAFallbackGovernanceRuntime');
const { enforceFallbackVisibility } = require('../fallback/fallbackVisibilityEnforcer');
const { enforceFrontendAuthority } = require('../frontendAuthority/frontendAuthorityEnforcementRuntime');
const { buildRuntimeDeliveryAuthorityMap } = require('../frontendAuthority/runtimeDeliveryAuthorityMap');
const { consolidateCognitiveGovernance } = require('../governance/cognitiveGovernanceConsolidationRuntime');
const { certifyRuntimeSovereignty } = require('../governance/runtimeSovereigntyCertification');
const { emitC6 } = require('./observability/cognitiveC6Observability');

function applyCognitiveC6AuthorityUnification(user = {}, payload = {}, ctx = {}) {
  const anyEnabled =
    c6.isRuntimeSovereigntyEnabled() ||
    c6.isFallbackGovernanceEnabled() ||
    c6.isFrontendAuthorityEnabled() ||
    c6.isGovernanceConsolidationEnabled();

  if (!anyEnabled && !ctx.force_cognitive_c6) {
    return { payload, skipped: true, reason: 'cognitive_c6_off' };
  }

  const sovereignty = c6.isRuntimeSovereigntyEnabled()
    ? establishCognitiveSovereignty(payload, ctx)
    : { sovereignty_safe: false, sovereign_runtime: 'runtime_z' };

  const unifier = c6.isRuntimeSovereigntyEnabled() ? unifyRuntimeAuthority(payload) : { authority_integrity: 0.5 };

  if (sovereignty.sovereignty_safe) emitC6('RUNTIME_SOVEREIGNTY_ESTABLISHED', { tenant_id: user?.company_id });
  if (unifier.authority_integrity >= 0.6) emitC6('AUTHORITY_UNIFIED', { tenant_id: user?.company_id, score: unifier.authority_integrity });

  const v2Retirement = retireEngineV2(payload);
  if (v2Retirement.engine_v2_runtime_mode === 'retired_shadow_reference') {
    emitC6('ENGINE_V2_RETIRED', { tenant_id: user?.company_id, mode: v2Retirement.engine_v2_runtime_mode });
  }

  const legacyCompetition = suppressLegacyCompetition(payload, v2Retirement, sovereignty);
  if (legacyCompetition.legacy_competition_detected) {
    emitC6('HIDDEN_LEGACY_DETECTED', { tenant_id: user?.company_id });
  }

  const motorA = c6.isFallbackGovernanceEnabled() ? governMotorAFallback(payload) : { motor_a_mode: 'supervised_fallback' };
  const fallbackVisibility = c6.isFallbackGovernanceEnabled()
    ? enforceFallbackVisibility(payload, motorA)
    : { visible_fallback_integrity: true };

  if (motorA.motor_a_mode === 'supervised_fallback') {
    emitC6('FALLBACK_GOVERNANCE_UPDATED', { tenant_id: user?.company_id, ratio: motorA.fallback_authority_ratio });
  }

  const frontend = c6.isFrontendAuthorityEnabled() ? enforceFrontendAuthority(payload, sovereignty) : {};
  const deliveryMap = c6.isFrontendAuthorityEnabled() ? buildRuntimeDeliveryAuthorityMap(payload) : {};

  if (frontend.frontend_enforcement_safe) {
    emitC6('FRONTEND_AUTHORITY_ENFORCED', { tenant_id: user?.company_id });
  }

  const governance = c6.isGovernanceConsolidationEnabled() ? consolidateCognitiveGovernance(payload) : {};
  const certification = certifyRuntimeSovereignty(sovereignty, unifier, v2Retirement, motorA, frontend, governance);

  if (governance.governance_consolidation_score >= 0.65) {
    emitC6('GOVERNANCE_CONSOLIDATED', { tenant_id: user?.company_id, score: governance.governance_consolidation_score });
  }

  const cognitive_sovereignty_runtime = { ...sovereignty, phase: 'C6' };
  const runtime_authority_unification = { ...unifier, legacy_competition: legacyCompetition };
  const engine_v2_retirement_runtime = { ...v2Retirement, competition: legacyCompetition };
  const motor_a_fallback_runtime = { ...motorA, visibility: fallbackVisibility };
  const frontend_authority_runtime = { ...frontend, delivery_map: deliveryMap };
  const governance_consolidation_runtime = { ...governance, certification };

  const cognitive_c6_summary = {
    phase: 'C6',
    sovereign_runtime: sovereignty.sovereign_runtime,
    sovereign_mode: sovereignty.sovereign_mode,
    engine_v2_status: v2Retirement.engine_v2_runtime_mode,
    motor_a_mode: motorA.motor_a_mode,
    sovereignty_safe: sovereignty.sovereignty_safe,
    authority_unification_score: sovereignty.authority_unification_score,
    authority_integrity: unifier.authority_integrity,
    governance_consolidation_score: governance.governance_consolidation_score,
    sovereignty_certified: certification.sovereignty_certified,
    unified_cognitive_infrastructure: certification.certification_safe,
    rollback_ready: sovereignty.rollback_ready,
    auto_remediation: false,
    auto_decisions: false,
    authoritative_global: false,
    motor_a_removed: false,
    engine_v2_removed: false
  };

  const enriched = {
    ...payload,
    cognitive_sovereignty_runtime,
    runtime_authority_unification,
    engine_v2_retirement_runtime,
    motor_a_fallback_runtime,
    frontend_authority_runtime,
    governance_consolidation_runtime,
    cognitive_c6_summary
  };

  return {
    payload: enriched,
    cognitive_sovereignty_runtime,
    runtime_authority_unification,
    engine_v2_retirement_runtime,
    motor_a_fallback_runtime,
    frontend_authority_runtime,
    governance_consolidation_runtime,
    cognitive_c6_summary,
    report: { sovereignty, unifier, v2Retirement, legacyCompetition, motorA, fallbackVisibility, frontend, deliveryMap, governance, certification }
  };
}

module.exports = { applyCognitiveC6AuthorityUnification };
