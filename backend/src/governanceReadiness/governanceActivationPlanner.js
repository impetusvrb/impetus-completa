'use strict';

const phaseH = require('./config/phaseHFeatureFlags');
const { logPhaseH } = require('./phaseHLogger');
const { THRESHOLDS } = require('./governanceReadinessScorer');

const ACTIVATION_ORDER = [
  {
    step: 1,
    flag: 'IMPETUS_KPI_GOVERNANCE',
    channel: 'dashboard_kpis',
    label: 'KPI governance',
    risk: 'low'
  },
  {
    step: 2,
    flag: 'IMPETUS_SUMMARY_GOVERNANCE',
    channel: 'smart_summary',
    label: 'Summary governance',
    risk: 'medium'
  },
  {
    step: 3,
    flag: 'IMPETUS_CHAT_GOVERNANCE',
    channel: 'dashboard_chat',
    label: 'Chat governance',
    risk: 'high'
  },
  {
    step: 4,
    flag: 'IMPETUS_COGNITIVE_BOUNDARY_GUARD',
    channel: 'all_ia_pipelines',
    label: 'Boundary guard',
    risk: 'high'
  },
  {
    step: 5,
    flag: 'IMPETUS_GOVERNANCE_OVERSIGHT',
    channel: 'oversight',
    label: 'Oversight layer',
    risk: 'low'
  },
  {
    step: 6,
    flag: 'IMPETUS_GOVERNANCE_EXPLAINABILITY',
    channel: 'explainability',
    label: 'Explainability',
    risk: 'low'
  },
  {
    step: 7,
    flag: 'IMPETUS_GOVERNANCE_DRIFT_DETECTION',
    channel: 'drift',
    label: 'Drift detection',
    risk: 'low'
  }
];

const FOUNDATION_FLAGS = [
  { flag: 'IMPETUS_COGNITIVE_POLICY_ENGINE', label: 'Content exposure policy engine' },
  { flag: 'IMPETUS_COGNITIVE_ENVELOPE', label: 'Cognitive envelope' },
  { flag: 'IMPETUS_CONTEXT_SANITIZER', label: 'Context sanitizer' }
];

/**
 * Plano de activação controlada — recomendações apenas.
 */
function buildActivationPlan(readinessReport = {}) {
  if (!phaseH.isGovernanceActivationPlannerEnabled() && !readinessReport.force) {
    return { enabled: false, auto_execute: false };
  }

  const score = readinessReport.readiness_score ?? 0;
  const shadow = readinessReport.shadow_alignment_rate ?? 0;
  const safe = readinessReport.activation_safety_score ?? 0;

  let maxStep = 0;
  if (score >= 90 && shadow >= THRESHOLDS.shadow_alignment_min) maxStep = 7;
  else if (score >= 85) maxStep = 4;
  else if (score >= 75) maxStep = 2;
  else if (score >= 65) maxStep = 1;
  else maxStep = 0;

  const steps = ACTIVATION_ORDER.map((s) => ({
    ...s,
    recommended: s.step <= maxStep,
    status: s.step <= maxStep ? 'candidate' : 'hold',
    manual_action_required: true,
    env_command: `# pm2 set ${s.flag}=on (manual)`
  }));

  const foundation = FOUNDATION_FLAGS.map((f) => ({
    ...f,
    recommended: score >= 80,
    status: score >= 80 ? 'candidate_after_shadow_validation' : 'hold'
  }));

  const plan = {
    enabled: true,
    auto_execute: false,
    readiness_score: score,
    activation_safety_score: safe,
    max_recommended_step: maxStep,
    activation_mode:
      maxStep >= 7 ?
        'full_staged' :
        maxStep >= 2 ?
          'partial_channel' :
          maxStep >= 1 ?
            'kpi_only' :
            'shadow_only',
    foundation_flags: foundation,
    channel_steps: steps,
    prerequisites: [
      'IMPETUS_GOVERNANCE_SHADOW_MODE=on',
      'IMPETUS_FAILSAFE_GOVERNANCE=on',
      'Validar COGNITIVE_EXPOSURE_DIVERGENCE < 5% por 7 dias'
    ],
    rollback_reference: 'governanceRollbackCoordinator.coordinateRollback()'
  };

  logPhaseH('GOVERNANCE_ACTIVATION_PLAN_READY', {
    max_step: maxStep,
    mode: plan.activation_mode,
    score
  });

  return plan;
}

module.exports = { buildActivationPlan, ACTIVATION_ORDER, FOUNDATION_FLAGS };
