'use strict';

/**
 * IMPETUS — Cognitive Policy Engine · Fase 1 (Policy Discovery Normalization)
 * Inventário normativo central: descobre, classifica e correlaciona políticas distribuídas.
 * Não altera runtime, enforcement nem decisões — apenas catálogo + observabilidade.
 * Rollout: IMPETUS_POLICY_DISCOVERY_ENABLED=true
 */

const POLICY_SOURCE_TYPES = Object.freeze({
  DECLARATIVE: 'DECLARATIVE',
  RUNTIME: 'RUNTIME',
  SECURITY: 'SECURITY',
  GOVERNANCE: 'GOVERNANCE',
  INTEGRITY: 'INTEGRITY',
  SAFETY: 'SAFETY',
  LEARNING: 'LEARNING',
  AUTONOMY: 'AUTONOMY',
  OBSERVABILITY: 'OBSERVABILITY'
});

const POLICY_SIGNAL_TYPES = Object.freeze({
  CSI: 'CSI',
  DRIFT: 'DRIFT',
  CONSENSUS: 'CONSENSUS',
  CALIBRATION: 'CALIBRATION',
  SAFETY: 'SAFETY',
  INTEGRITY: 'INTEGRITY',
  RISK: 'RISK',
  TENANT: 'TENANT',
  CHANNEL: 'CHANNEL',
  CONFIDENCE: 'CONFIDENCE',
  ROLE: 'ROLE',
  CAPABILITY: 'CAPABILITY',
  /** Telemetria / correlação passiva (event backbone). */
  TRACE: 'TRACE'
});

const POLICY_EFFECT_TYPES = Object.freeze({
  ALLOW: 'ALLOW',
  BLOCK: 'BLOCK',
  SOFTEN: 'SOFTEN',
  ESCALATE: 'ESCALATE',
  HITL: 'HITL',
  REDACT: 'REDACT',
  LIMIT: 'LIMIT',
  ROUTE: 'ROUTE',
  OVERRIDE: 'OVERRIDE',
  DEGRADE: 'DEGRADE'
});

const POLICY_EXECUTOR_TYPES = Object.freeze({
  GATEWAY: 'GATEWAY',
  ORCHESTRATOR: 'ORCHESTRATOR',
  SAFETY_RUNTIME: 'SAFETY_RUNTIME',
  INTEGRITY_LAYER: 'INTEGRITY_LAYER',
  COUNCIL: 'COUNCIL',
  PIPELINE: 'PIPELINE',
  LEARNING: 'LEARNING',
  GOVERNANCE: 'GOVERNANCE'
});

/** Catálogo semi-estático dos módulos normativos reais (Fase 1 — sem AST). */
const DISTRIBUTED_POLICY_MODULES = Object.freeze([
  {
    id: 'aiSecurityGateway',
    module_path: 'backend/src/services/aiSecurityGateway.js',
    source_type: POLICY_SOURCE_TYPES.SECURITY,
    executor_type: POLICY_EXECUTOR_TYPES.GATEWAY,
    signal_types: [POLICY_SIGNAL_TYPES.RISK, POLICY_SIGNAL_TYPES.SAFETY],
    effect_types: [POLICY_EFFECT_TYPES.BLOCK, POLICY_EFFECT_TYPES.REDACT],
    notes: 'Ingress (promptFirewall), contexto, integridade opcional, egress, cognitive safety em cadeia.'
  },
  {
    id: 'contextIntegrityService',
    module_path: 'backend/src/services/contextIntegrityService.js',
    source_type: POLICY_SOURCE_TYPES.INTEGRITY,
    executor_type: POLICY_EXECUTOR_TYPES.INTEGRITY_LAYER,
    signal_types: [POLICY_SIGNAL_TYPES.INTEGRITY, POLICY_SIGNAL_TYPES.TENANT],
    effect_types: [POLICY_EFFECT_TYPES.BLOCK],
    notes: 'Hash, poisoning, cross-tenant, limites de contexto; block mode via env.'
  },
  {
    id: 'cognitiveSafetyRuntimeService',
    module_path: 'backend/src/services/cognitiveSafetyRuntimeService.js',
    source_type: POLICY_SOURCE_TYPES.SAFETY,
    executor_type: POLICY_EXECUTOR_TYPES.SAFETY_RUNTIME,
    signal_types: [POLICY_SIGNAL_TYPES.SAFETY],
    effect_types: [POLICY_EFFECT_TYPES.SOFTEN, POLICY_EFFECT_TYPES.ESCALATE, POLICY_EFFECT_TYPES.BLOCK],
    notes: 'Avalia risco cognitivo; critical retém resposta; warning suaviza narrativa.'
  },
  {
    id: 'adaptiveGovernanceEngine',
    module_path: 'backend/src/services/adaptiveGovernanceEngine.js',
    source_type: POLICY_SOURCE_TYPES.GOVERNANCE,
    executor_type: POLICY_EXECUTOR_TYPES.GOVERNANCE,
    signal_types: [POLICY_SIGNAL_TYPES.CSI, POLICY_SIGNAL_TYPES.DRIFT, POLICY_SIGNAL_TYPES.RISK, POLICY_SIGNAL_TYPES.CONFIDENCE],
    effect_types: [POLICY_EFFECT_TYPES.DEGRADE, POLICY_EFFECT_TYPES.LIMIT],
    notes: 'Modo de resposta e gates de risco combinando risk/behavioral/learning signals.'
  },
  {
    id: 'policyEngineService',
    module_path: 'backend/src/services/policyEngineService.js',
    source_type: POLICY_SOURCE_TYPES.DECLARATIVE,
    executor_type: POLICY_EXECUTOR_TYPES.GOVERNANCE,
    signal_types: [POLICY_SIGNAL_TYPES.ROLE, POLICY_SIGNAL_TYPES.CAPABILITY],
    effect_types: [POLICY_EFFECT_TYPES.ALLOW, POLICY_EFFECT_TYPES.BLOCK],
    notes: 'Resolução hierárquica de políticas persistidas (merge + hardening).'
  },
  {
    id: 'policyEnforcementService',
    module_path: 'backend/src/services/policyEnforcementService.js',
    source_type: POLICY_SOURCE_TYPES.DECLARATIVE,
    executor_type: POLICY_EXECUTOR_TYPES.PIPELINE,
    signal_types: [POLICY_SIGNAL_TYPES.ROLE, POLICY_SIGNAL_TYPES.CAPABILITY],
    effect_types: [POLICY_EFFECT_TYPES.ALLOW, POLICY_EFFECT_TYPES.BLOCK, POLICY_EFFECT_TYPES.LIMIT, POLICY_EFFECT_TYPES.HITL],
    notes: 'Efeitos declarativos sobre síntese (allowed_modules, dados sensíveis, detalhe máximo).'
  },
  {
    id: 'policyLayer',
    module_path: 'backend/src/ai/layers/policyLayer.js',
    source_type: POLICY_SOURCE_TYPES.DECLARATIVE,
    executor_type: POLICY_EXECUTOR_TYPES.PIPELINE,
    signal_types: [POLICY_SIGNAL_TYPES.RISK, POLICY_SIGNAL_TYPES.ROLE, POLICY_SIGNAL_TYPES.CAPABILITY],
    effect_types: [POLICY_EFFECT_TYPES.BLOCK, POLICY_EFFECT_TYPES.LIMIT, POLICY_EFFECT_TYPES.DEGRADE],
    notes: 'Orquestra policyEngine + adaptiveGovernance no pipeline cognitivo.'
  },
  {
    id: 'unifiedOrchestrator',
    module_path: 'backend/src/services/unifiedOrchestrator.js',
    source_type: POLICY_SOURCE_TYPES.RUNTIME,
    executor_type: POLICY_EXECUTOR_TYPES.ORCHESTRATOR,
    signal_types: [POLICY_SIGNAL_TYPES.CHANNEL],
    effect_types: [POLICY_EFFECT_TYPES.ROUTE],
    notes: 'Seleção de runtime por canal; governança de caminhos legacy (observação).'
  },
  {
    id: 'cognitiveEventBackboneService',
    module_path: 'backend/src/services/cognitiveEventBackboneService.js',
    source_type: POLICY_SOURCE_TYPES.OBSERVABILITY,
    executor_type: POLICY_EXECUTOR_TYPES.GOVERNANCE,
    signal_types: [POLICY_SIGNAL_TYPES.TRACE],
    effect_types: [],
    notes: 'Retenção, criticidade, fila/batch — política operacional passiva (sem alterar decisão LLM).'
  },
  {
    id: 'promptFirewall',
    module_path: 'backend/src/middleware/promptFirewall.js',
    source_type: POLICY_SOURCE_TYPES.SECURITY,
    executor_type: POLICY_EXECUTOR_TYPES.GATEWAY,
    signal_types: [POLICY_SIGNAL_TYPES.CAPABILITY, POLICY_SIGNAL_TYPES.RISK],
    effect_types: [POLICY_EFFECT_TYPES.BLOCK],
    notes: 'Ingress complementar: permissões vs termos sensíveis + aiPromptGuardService.'
  },
  {
    id: 'aiEgressGuardService',
    module_path: 'backend/src/services/aiEgressGuardService.js',
    source_type: POLICY_SOURCE_TYPES.SECURITY,
    executor_type: POLICY_EXECUTOR_TYPES.GATEWAY,
    signal_types: [POLICY_SIGNAL_TYPES.TENANT, POLICY_SIGNAL_TYPES.RISK],
    effect_types: [POLICY_EFFECT_TYPES.BLOCK, POLICY_EFFECT_TYPES.REDACT],
    notes: 'Scan de saída por padrões sensíveis / exfiltração.'
  },
  {
    id: 'adaptiveTuningService',
    module_path: 'backend/src/services/adaptiveTuningService.js',
    source_type: POLICY_SOURCE_TYPES.LEARNING,
    executor_type: POLICY_EXECUTOR_TYPES.LEARNING,
    signal_types: [POLICY_SIGNAL_TYPES.CONFIDENCE],
    effect_types: [POLICY_EFFECT_TYPES.LIMIT, POLICY_EFFECT_TYPES.SOFTEN],
    notes: 'Ajustes de apresentação/confiança aprovados (rollout IMPETUS_ADAPTIVE_TUNING_ENABLED).'
  },
  {
    id: 'autonomousOptimizationService',
    module_path: 'backend/src/services/autonomousOptimizationService.js',
    source_type: POLICY_SOURCE_TYPES.AUTONOMY,
    executor_type: POLICY_EXECUTOR_TYPES.GOVERNANCE,
    signal_types: [POLICY_SIGNAL_TYPES.CONFIDENCE, POLICY_SIGNAL_TYPES.CONSENSUS],
    effect_types: [POLICY_EFFECT_TYPES.DEGRADE, POLICY_EFFECT_TYPES.OVERRIDE],
    notes: 'Ciclos autónomos com rollback supervisionado (env).'
  },
  {
    id: 'supervisedLearningService',
    module_path: 'backend/src/services/supervisedLearningService.js',
    source_type: POLICY_SOURCE_TYPES.LEARNING,
    executor_type: POLICY_EXECUTOR_TYPES.LEARNING,
    signal_types: [POLICY_SIGNAL_TYPES.ROLE],
    effect_types: [POLICY_EFFECT_TYPES.HITL, POLICY_EFFECT_TYPES.ALLOW],
    notes: 'Propostas e aprovação explícita humana.'
  }
]);

const SHADOW_POLICY_CATALOG = Object.freeze([
  {
    module: 'adaptiveTuningService',
    type: 'confidence_threshold',
    risk: 'high',
    hint: 'Limiares e heurísticas de apresentação/confiança fora do motor declarativo central.'
  },
  {
    module: 'unifiedDriftDetectionService',
    type: 'threshold_hardcoded',
    risk: 'medium',
    hint: 'UNIFIED_DRIFT_DETECTION + heurísticas locais de score/fallback/pipeline.'
  },
  {
    module: 'unifiedDegradationService',
    type: 'behavior_threshold',
    risk: 'medium',
    hint: 'UNIFIED_BEHAVIOR_* thresholds em código.'
  },
  {
    module: 'unifiedConservatismGuardService',
    type: 'threshold_hardcoded',
    risk: 'high',
    hint: 'Heurísticas conservadoras sem tabela de política central.'
  },
  {
    module: 'cognitiveDriftService',
    type: 'severity_heuristic',
    risk: 'low',
    hint: 'severityFromSignals — regras locais de severidade.'
  },
  {
    module: 'promptFirewall',
    type: 'keyword_policy',
    risk: 'low',
    hint: 'SENSITIVE_TERMS + mapa de permissões em middleware.'
  }
]);

const CAPABILITY_GOVERNANCE_CATALOG = Object.freeze([
  {
    capability: 'requireRole',
    scope: 'global',
    mechanism: "middleware auth — users.role ∈ allowedRoles (ex.: 'admin')",
    used_by: ['admin_learning_policy_discovery', 'admin_routes']
  },
  {
    capability: 'requireHealthAccess',
    scope: 'tenant',
    mechanism: 'middleware auth — permissões de saúde / governance de dados sensíveis',
    used_by: ['health_routes', 'occupational_health']
  },
  {
    capability: 'requireTenantAdminRole',
    scope: 'tenant',
    mechanism: 'middleware auth — is_tenant_admin ou contextual system administration',
    used_by: ['admin_learning_routes', 'tenant_admin_portal']
  },
  {
    capability: 'system_administration',
    scope: 'tenant',
    mechanism: 'contextual_capabilities + contextualSystemAdminService',
    used_by: ['requireTenantAdminRole', 'admin_learning_routes', 'health_governance']
  },
  {
    capability: 'tenant_admin',
    scope: 'tenant',
    mechanism: 'users.is_tenant_admin + IMPETUS_TENANT_ADMIN_GOVERNANCE',
    used_by: ['requireTenantAdminRole']
  },
  {
    capability: 'legacy_role_admin',
    scope: 'global',
    mechanism: "users.role === 'admin'",
    used_by: ['requireTenantAdminRole', 'requireRole']
  },
  {
    capability: 'permission_star_or_explicit',
    scope: 'tenant',
    mechanism: 'requirePermission(permission)',
    used_by: ['routes_admin', 'feature_flags']
  },
  {
    capability: 'hierarchy_gate',
    scope: 'tenant',
    mechanism: 'requireHierarchyLevel(minLevel)',
    used_by: ['sensitive_routes']
  },
  {
    capability: 'internal_admin',
    scope: 'platform',
    mechanism: 'role internal_admin / impetus admin portal',
    used_by: ['impetus_admin_routes']
  }
]);

/** Chaves de ambiente com impacto normativo (curado — alinhado a .env.example). */
const POLICY_ENV_GOVERNANCE_KEYS = Object.freeze([
  { key: 'IMPETUS_AI_GATEWAY_ENABLED', category: 'ai_security', type: 'runtime_policy' },
  { key: 'IMPETUS_AI_GATEWAY_REALTIME_ENABLED', category: 'ai_security', type: 'runtime_policy' },
  { key: 'IMPETUS_AI_GATEWAY_REALTIME_ENFORCE', category: 'ai_security', type: 'runtime_policy' },
  { key: 'IMPETUS_UNIFIED_ORCHESTRATOR_ENABLED', category: 'orchestration', type: 'runtime_policy' },
  { key: 'IMPETUS_BLOCK_LEGACY_COGNITIVE_PATHS', category: 'orchestration', type: 'runtime_policy' },
  { key: 'IMPETUS_CONTEXT_INTEGRITY_ENABLED', category: 'integrity', type: 'runtime_policy' },
  { key: 'IMPETUS_CONTEXT_INTEGRITY_BLOCK_MODE', category: 'integrity', type: 'runtime_policy' },
  { key: 'IMPETUS_COGNITIVE_SAFETY_ENABLED', category: 'safety', type: 'runtime_policy' },
  { key: 'IMPETUS_EVENT_BACKBONE_ENABLED', category: 'observability', type: 'runtime_policy' },
  { key: 'IMPETUS_EVENT_BACKBONE_PERSIST', category: 'observability', type: 'runtime_policy' },
  { key: 'IMPETUS_EVENT_QUEUE_MAX', category: 'observability', type: 'operational_cap' },
  { key: 'IMPETUS_COGNITIVE_DASHBOARD_ENABLED', category: 'governance', type: 'access_policy' },
  { key: 'IMPETUS_POLICY_DISCOVERY_ENABLED', category: 'governance', type: 'discovery_rollout' },
  { key: 'IMPETUS_GOVERNANCE_ENABLED', category: 'governance', type: 'feature_policy' },
  { key: 'IMPETUS_ADAPTIVE_TUNING_ENABLED', category: 'learning', type: 'runtime_policy' },
  { key: 'IMPETUS_AUTONOMOUS_OPTIMIZATION_ENABLED', category: 'autonomy', type: 'runtime_policy' },
  { key: 'IMPETUS_COGNITIVE_CONSENSUS_ENABLED', category: 'consensus', type: 'runtime_policy' },
  { key: 'IMPETUS_CONFIDENCE_CALIBRATION_ENABLED', category: 'calibration', type: 'runtime_policy' },
  { key: 'IMPETUS_CSI_ENABLED', category: 'csi', type: 'runtime_policy' },
  { key: 'IMPETUS_WEIGHTED_VOTING_ENABLED', category: 'voting', type: 'runtime_policy' },
  { key: 'IMPETUS_COGNITIVE_DRIFT_ENABLED', category: 'drift', type: 'runtime_policy' },
  { key: 'IMPETUS_COGNITIVE_REPLAY_ENABLED', category: 'replay', type: 'runtime_policy' },
  { key: 'UNIFIED_AUTONOMY_ENABLED', category: 'autonomy', type: 'runtime_policy' },
  { key: 'UNIFIED_DECISION_VALIDATION', category: 'governance', type: 'runtime_policy' },
  { key: 'UNIFIED_DRIFT_DETECTION', category: 'drift', type: 'heuristic_switch' },
  { key: 'UNIFIED_BEHAVIOR_DRIFT', category: 'drift', type: 'heuristic_switch' },
  { key: 'ADAPTIVE_GOVERNANCE_ENABLED', category: 'governance', type: 'implicit_default' },
  { key: 'IMPETUS_TEST_MODE', category: 'governance', type: 'exception_path' },
  { key: 'RED_TEAM_SKIP_DB', category: 'security', type: 'exception_path' },
  { key: 'AI_POLICY_CACHE_TTL_MS', category: 'declarative', type: 'cache_policy' }
]);

function isPolicyDiscoveryEnabled() {
  return String(process.env.IMPETUS_POLICY_DISCOVERY_ENABLED || '')
    .trim()
    .toLowerCase() === 'true';
}

function _uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

/**
 * Mapa normativo dos módulos distribuídos (semi-estático).
 * `capabilities` fica vazio aqui — ver `discoverCapabilityGovernance()`.
 */
function discoverDistributedPolicies() {
  const sources = DISTRIBUTED_POLICY_MODULES.map((m) => ({ ...m }));
  const signalSet = new Set();
  const effectSet = new Set();
  const executorSet = new Set();
  for (const s of sources) {
    (s.signal_types || []).forEach((x) => signalSet.add(x));
    (s.effect_types || []).forEach((x) => effectSet.add(x));
    if (s.executor_type) executorSet.add(s.executor_type);
  }
  return {
    sources,
    signals: [...signalSet],
    effects: [...effectSet],
    executors: [...executorSet],
    capabilities: [],
    env_governance: discoverPolicyEnvGovernance()
  };
}

/**
 * Sobreposição de sinais/efeitos entre módulos (heurística Fase 1).
 */
function detectPolicyOverlap(sourcesIn) {
  const sources =
    sourcesIn && Array.isArray(sourcesIn)
      ? sourcesIn
      : discoverDistributedPolicies().sources;
  const bySignal = {};
  const byEffect = {};
  for (const s of sources) {
    for (const sig of s.signal_types || []) {
      if (!bySignal[sig]) bySignal[sig] = [];
      bySignal[sig].push(s.id);
    }
    for (const eff of s.effect_types || []) {
      if (!byEffect[eff]) byEffect[eff] = [];
      byEffect[eff].push(s.id);
    }
  }
  const overlaps = [];
  for (const [signal, modules] of Object.entries(bySignal)) {
    if (modules.length > 1) {
      let risk = 'low';
      if (signal === POLICY_SIGNAL_TYPES.SAFETY && modules.length >= 2) risk = 'medium';
      if (signal === POLICY_SIGNAL_TYPES.RISK && modules.length >= 3) risk = 'medium';
      overlaps.push({ signal, modules: _uniq(modules), risk, kind: 'shared_signal' });
    }
  }
  for (const [effect, modules] of Object.entries(byEffect)) {
    if (modules.length > 1 && effect === POLICY_EFFECT_TYPES.BLOCK) {
      overlaps.push({
        signal: null,
        effect,
        modules: _uniq(modules),
        risk: 'high',
        kind: 'multiple_block_enforcement'
      });
    }
  }
  try {
    console.info('[POLICY_OVERLAP]', JSON.stringify({ count: overlaps.length, kinds: overlaps.map((o) => o.kind) }));
  } catch (_e) {}
  return { overlaps };
}

function detectShadowPolicies() {
  const shadow_policies = SHADOW_POLICY_CATALOG.map((x) => ({ ...x }));
  try {
    console.info('[SHADOW_POLICY]', JSON.stringify({ count: shadow_policies.length }));
  } catch (_e) {}
  return { shadow_policies };
}

function discoverCapabilityGovernance() {
  const capabilities = CAPABILITY_GOVERNANCE_CATALOG.map((c) => ({ ...c }));
  try {
    console.info('[POLICY_CAPABILITY]', JSON.stringify({ count: capabilities.length }));
  } catch (_e) {}
  return { capabilities };
}

function discoverPolicyEnvGovernance() {
  const envs = POLICY_ENV_GOVERNANCE_KEYS.map((row) => ({
    ...row,
    active: process.env[row.key] != null && String(process.env[row.key]).trim() !== ''
  }));
  return envs;
}

/**
 * Snapshot completo para admin / auditoria (sem persistência em BD nesta fase).
 */
function generatePolicyDiscoverySnapshot() {
  const distributed = discoverDistributedPolicies();
  const overlaps = detectPolicyOverlap(distributed.sources);
  const shadow = detectShadowPolicies();
  const cap = discoverCapabilityGovernance();

  const policy_sources = {};
  for (const s of distributed.sources) {
    policy_sources[s.id] = { ...s };
  }
  const signals = {};
  for (const sig of distributed.signals) {
    signals[sig] = distributed.sources.filter((m) => (m.signal_types || []).includes(sig)).map((m) => m.id);
  }
  const effects = {};
  for (const eff of distributed.effects) {
    effects[eff] = distributed.sources.filter((m) => (m.effect_types || []).includes(eff)).map((m) => m.id);
  }
  const executors = {};
  for (const ex of distributed.executors) {
    executors[ex] = distributed.sources.filter((m) => m.executor_type === ex).map((m) => m.id);
  }

  const out = {
    generated_at: new Date().toISOString(),
    taxonomy: {
      POLICY_SOURCE_TYPES: { ...POLICY_SOURCE_TYPES },
      POLICY_SIGNAL_TYPES: { ...POLICY_SIGNAL_TYPES },
      POLICY_EFFECT_TYPES: { ...POLICY_EFFECT_TYPES },
      POLICY_EXECUTOR_TYPES: { ...POLICY_EXECUTOR_TYPES }
    },
    policy_sources,
    signals,
    effects,
    executors,
    overlaps: overlaps.overlaps,
    shadow_policies: shadow.shadow_policies,
    capabilities: cap.capabilities,
    env_governance: distributed.env_governance,
    distributed_summary: {
      source_count: distributed.sources.length,
      signal_type_count: distributed.signals.length,
      effect_type_count: distributed.effects.length,
      executor_type_count: distributed.executors.length,
      overlap_count: overlaps.overlaps.length,
      shadow_policy_count: shadow.shadow_policies.length,
      capability_rule_count: cap.capabilities.length,
      env_catalog_size: distributed.env_governance.length
    }
  };

  try {
    console.info(
      '[POLICY_DISCOVERY]',
      JSON.stringify({
        action: 'snapshot',
        sources: out.distributed_summary.source_count,
        overlaps: out.distributed_summary.overlap_count,
        shadow: out.distributed_summary.shadow_policy_count
      })
    );
  } catch (_e) {}
  return out;
}

/** Resumo leve para anexar ao dashboard de governança (somente contagens + enabled). */
function getPolicyDiscoveryDashboardSummary() {
  if (!isPolicyDiscoveryEnabled()) {
    return {
      enabled: false,
      code: 'POLICY_DISCOVERY_DISABLED',
      message: 'Defina IMPETUS_POLICY_DISCOVERY_ENABLED=true para inventário normativo.'
    };
  }
  const snap = generatePolicyDiscoverySnapshot();
  return {
    enabled: true,
    generated_at: snap.generated_at,
    policy_sources_count: snap.distributed_summary.source_count,
    policy_executors_count: snap.distributed_summary.executor_type_count,
    overlap_count: snap.distributed_summary.overlap_count,
    shadow_policy_count: snap.distributed_summary.shadow_policy_count,
    env_governance_count: snap.distributed_summary.env_catalog_size,
    capability_count: snap.distributed_summary.capability_rule_count,
    signal_type_count: snap.distributed_summary.signal_type_count,
    effect_type_count: snap.distributed_summary.effect_type_count
  };
}

module.exports = {
  POLICY_SOURCE_TYPES,
  POLICY_SIGNAL_TYPES,
  POLICY_EFFECT_TYPES,
  POLICY_EXECUTOR_TYPES,
  isPolicyDiscoveryEnabled,
  discoverDistributedPolicies,
  detectPolicyOverlap,
  detectShadowPolicies,
  discoverCapabilityGovernance,
  discoverPolicyEnvGovernance,
  generatePolicyDiscoverySnapshot,
  getPolicyDiscoveryDashboardSummary
};
