'use strict';

/**
 * WAVE 7 — Cenários de teste: Governança Industrial Enterprise.
 * Execução: node backend/src/tests/wave7IndustrialGovernanceScenarios.js
 */

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

// ── env para flags desactivados por defeito ───────────────────────────────
delete process.env.IMPETUS_GOVERNANCE_V7_ENABLED;
delete process.env.IMPETUS_ABAC_ENFORCE;
delete process.env.IMPETUS_WORKFLOW_CAPABILITY_MATRIX_ENABLED;
delete process.env.IMPETUS_WORKFLOW_PERMISSION_ENFORCE;
delete process.env.IMPETUS_AUDIT_HASH_CHAIN_ENABLED;
delete process.env.IMPETUS_LGPD_CLASSIFICATION_ENABLED;
delete process.env.IMPETUS_DOMAIN_CAPABILITY_GOVERNANCE_ENABLED;
delete process.env.IMPETUS_TRACEABILITY_ENABLED;
delete process.env.IMPETUS_INDUSTRIAL_AUDIT_ENABLED;

// Limpar cache antes de importar
Object.keys(require.cache).forEach((k) => {
  if (k.includes('/governance/')) delete require.cache[k];
});

// ---------------------------------------------------------------------------
// W7.1 — governanceFlags: defaults
// ---------------------------------------------------------------------------
console.log('\n[ W7.1 ] governanceFlags — defaults (todos false)');
const flags = require('../governance/governanceFlags');
assert('W7.1.a GOVERNANCE_V7_ENABLED default false', flags.GOVERNANCE_V7_ENABLED === false);
assert('W7.1.b ABAC_ENFORCE default false', flags.ABAC_ENFORCE === false);
assert('W7.1.c WORKFLOW_CAPABILITY_MATRIX_ENABLED default false', flags.WORKFLOW_CAPABILITY_MATRIX_ENABLED === false);
assert('W7.1.d AUDIT_HASH_CHAIN_ENABLED default false', flags.AUDIT_HASH_CHAIN_ENABLED === false);
assert('W7.1.e LGPD_CLASSIFICATION_ENABLED default false', flags.LGPD_CLASSIFICATION_ENABLED === false);
assert('W7.1.f TRACEABILITY_ENABLED default false', flags.TRACEABILITY_ENABLED === false);

// ---------------------------------------------------------------------------
// W7.2 — workflowCapabilityMatrix: seed + lookup
// ---------------------------------------------------------------------------
console.log('\n[ W7.2 ] workflowCapabilityMatrix — seed + lookup');
const wcm = require('../governance/workflowCapabilityMatrix');

assert('W7.2.a listWorkflowCapabilities() >= 9 entradas', wcm.listWorkflowCapabilities().length >= 9);

const qualInsp = wcm.getWorkflowCapability('quality.inspection');
assert('W7.2.b quality.inspection existe', qualInsp !== null);
assert('W7.2.c quality.inspection domain = quality', qualInsp.domain === 'quality');
assert('W7.2.d quality.inspection requiresHumanApproval = true', qualInsp.requiresHumanApproval === true);
assert('W7.2.e quality.inspection allowAiInitiated = false', qualInsp.allowAiInitiated === false);

const alert = wcm.getWorkflowCapability('operational.alert_acknowledge');
assert('W7.2.f operational.alert_acknowledge allowAiInitiated = true', alert.allowAiInitiated === true);

assert('W7.2.g getWorkflowCapability("unknown") = null', wcm.getWorkflowCapability('unknown') === null);

// checkWorkflowCapability: desactivado por defeito
const r1 = wcm.checkWorkflowCapability('quality.inspection', 'supervisor');
assert('W7.2.h check desactivado retorna allowed=true', r1.allowed === true);
assert('W7.2.i mode = disabled quando flag off', r1.mode === 'disabled');

// Com flag activa
process.env.IMPETUS_WORKFLOW_CAPABILITY_MATRIX_ENABLED = 'true';
Object.keys(require.cache).forEach((k) => { if (k.includes('/governance/')) delete require.cache[k]; });
const wcm2 = require('../governance/workflowCapabilityMatrix');
const r2 = wcm2.checkWorkflowCapability('quality.inspection', 'supervisor');
assert('W7.2.j supervisor permitido em quality.inspection', r2.allowed === true);
const r3 = wcm2.checkWorkflowCapability('quality.inspection', 'colaborador');
assert('W7.2.k colaborador negado em quality.inspection', r3.allowed === false);
assert('W7.2.l reason = role_not_allowed para colaborador', r3.reason === 'role_not_allowed');
delete process.env.IMPETUS_WORKFLOW_CAPABILITY_MATRIX_ENABLED;
Object.keys(require.cache).forEach((k) => { if (k.includes('/governance/')) delete require.cache[k]; });

// ---------------------------------------------------------------------------
// W7.3 — abacExtension: policies + evaluate
// ---------------------------------------------------------------------------
console.log('\n[ W7.3 ] abacExtension — políticas ABAC');
const abac = require('../governance/abacExtension');

const policies = abac.listAbacPolicies();
assert('W7.3.a >= 3 políticas built-in', policies.length >= 3);
assert('W7.3.b tenant_isolation existe', policies.some((p) => p.id === 'tenant_isolation'));
assert('W7.3.c no_ai_regulated_workflow existe', policies.some((p) => p.id === 'no_ai_regulated_workflow'));

// Tenant isolation — mesmo tenant → allow
const r4 = abac.evaluateAbacPolicies(
  { company_id: 'co-1', role: 'supervisor', actor_type: 'human' },
  { company_id: 'co-1', workflow_type: 'quality.inspection', domain: 'quality' }
);
assert('W7.3.d mesmo tenant → decision=allow', r4.decision === 'allow');

// Tenant isolation — tenant diferente → deny (observe)
const r5 = abac.evaluateAbacPolicies(
  { company_id: 'co-1', role: 'supervisor', actor_type: 'human' },
  { company_id: 'co-2', workflow_type: 'quality.inspection', domain: 'quality' }
);
assert('W7.3.e tenants diferentes → decision=deny', r5.decision === 'deny');
assert('W7.3.f mode=observe quando ABAC_ENFORCE=false', r5.mode === 'observe');
assert('W7.3.g effectiveBlock=false em observe', r5.effectiveBlock === false);
assert('W7.3.h violations inclui tenant_isolation', r5.violations.includes('tenant_isolation'));

// IA a tentar iniciar workflow regulado → deny
const r6 = abac.evaluateAbacPolicies(
  { company_id: 'co-1', role: 'supervisor', actor_type: 'ai' },
  { company_id: 'co-1', workflow_type: 'quality.inspection', domain: 'quality' }
);
assert('W7.3.i IA em workflow regulado → deny', r6.decision === 'deny');
assert('W7.3.j violations inclui no_ai_regulated_workflow', r6.violations.includes('no_ai_regulated_workflow'));

// IA em workflow não-regulado → allow
const r7 = abac.evaluateAbacPolicies(
  { company_id: 'co-1', role: 'supervisor', actor_type: 'ai' },
  { company_id: 'co-1', workflow_type: 'operational.alert_acknowledge', domain: 'operational' }
);
assert('W7.3.k IA em alert_acknowledge → allow (permitido)', r7.decision === 'allow');

// ---------------------------------------------------------------------------
// W7.4 — domainCapabilityGovernance: registry + checks
// ---------------------------------------------------------------------------
console.log('\n[ W7.4 ] domainCapabilityGovernance — registry e checks');
const dcg = require('../governance/domainCapabilityGovernance');

const stats = dcg.getDomainCapabilityStats();
assert('W7.4.a total_capabilities >= 12', stats.total_capabilities >= 12);
assert('W7.4.b quality domain tem capabilities', (stats.by_domain.quality || 0) >= 3);
assert('W7.4.c safety domain tem capabilities', (stats.by_domain.safety || 0) >= 2);

const cap = dcg.getDomainCapability('can_approve_inspection');
assert('W7.4.d can_approve_inspection existe', cap !== null);
assert('W7.4.e can_approve_inspection domain = quality', cap.domain === 'quality');
assert('W7.4.f can_approve_inspection requires_human_actor = true', cap.requires_human_actor === true);

// check capability — flag desactivada
const cr1 = dcg.checkCapability('can_approve_inspection', 'supervisor');
assert('W7.4.g check desactivado → granted=true', cr1.granted === true);
assert('W7.4.h mode=disabled quando flag off', cr1.mode === 'disabled');

// Com flag activa
process.env.IMPETUS_DOMAIN_CAPABILITY_GOVERNANCE_ENABLED = 'true';
Object.keys(require.cache).forEach((k) => { if (k.includes('/governance/')) delete require.cache[k]; });
const dcg2 = require('../governance/domainCapabilityGovernance');
const cr2 = dcg2.checkCapability('can_approve_inspection', 'supervisor');
assert('W7.4.i supervisor tem can_approve_inspection', cr2.granted === true);
const cr3 = dcg2.checkCapability('can_approve_inspection', 'colaborador');
assert('W7.4.j colaborador não tem can_approve_inspection', cr3.granted === false);
const caps4Role = dcg2.getCapabilitiesForRole('ceo');
assert('W7.4.k CEO tem múltiplas capabilities', caps4Role.length >= 5);
delete process.env.IMPETUS_DOMAIN_CAPABILITY_GOVERNANCE_ENABLED;
Object.keys(require.cache).forEach((k) => { if (k.includes('/governance/')) delete require.cache[k]; });

// ---------------------------------------------------------------------------
// W7.5 — workflowPermissionMatrix: avaliação completa
// ---------------------------------------------------------------------------
console.log('\n[ W7.5 ] workflowPermissionMatrix — decisão consolidada');
process.env.IMPETUS_WORKFLOW_CAPABILITY_MATRIX_ENABLED = 'true';
process.env.IMPETUS_DOMAIN_CAPABILITY_GOVERNANCE_ENABLED = 'true';
Object.keys(require.cache).forEach((k) => { if (k.includes('/governance/')) delete require.cache[k]; });
const wpm = require('../governance/workflowPermissionMatrix');

// Supervisor do mesmo tenant → permitido
const perm1 = wpm.evaluateWorkflowPermission({
  workflowType: 'quality.inspection',
  role: 'supervisor',
  company_id: 'co-1',
  actor_type: 'human'
});
assert('W7.5.a supervisor quality.inspection → permitted', perm1.permitted === true);
assert('W7.5.b mode=observe (não enforce)', perm1.mode === 'observe');
assert('W7.5.c requires_human_approval = true', perm1.requires_human_approval === true);
assert('W7.5.d effective_block=false em observe', perm1.effective_block === false);

// Colaborador → não permitido (role_not_allowed)
const perm2 = wpm.evaluateWorkflowPermission({
  workflowType: 'quality.inspection',
  role: 'colaborador',
  company_id: 'co-1',
  actor_type: 'human'
});
assert('W7.5.e colaborador quality.inspection → not permitted', perm2.permitted === false);
assert('W7.5.f effective_block=false (observe)', perm2.effective_block === false);

// IA em workflow regulado → não permitido
const perm3 = wpm.evaluateWorkflowPermission({
  workflowType: 'safety.risk_assessment',
  role: 'supervisor',
  company_id: 'co-1',
  actor_type: 'ai'
});
assert('W7.5.g IA em safety.risk_assessment → not permitted', perm3.permitted === false);

// IA em alert_acknowledge → permitido (allowAiInitiated=true)
const perm4 = wpm.evaluateWorkflowPermission({
  workflowType: 'operational.alert_acknowledge',
  role: 'operador',
  company_id: 'co-1',
  actor_type: 'ai'
});
assert('W7.5.h IA em alert_acknowledge → permitted', perm4.permitted === true);

delete process.env.IMPETUS_WORKFLOW_CAPABILITY_MATRIX_ENABLED;
delete process.env.IMPETUS_DOMAIN_CAPABILITY_GOVERNANCE_ENABLED;
Object.keys(require.cache).forEach((k) => { if (k.includes('/governance/')) delete require.cache[k]; });

// ---------------------------------------------------------------------------
// W7.6 — immutableWorkflowAuditPrep: hash chain
// ---------------------------------------------------------------------------
console.log('\n[ W7.6 ] immutableWorkflowAuditPrep — hash chain');
const hashChain = require('../governance/immutableWorkflowAuditPrep');

const h1 = hashChain.computeRecordHash('0000', { action: 'start', workflow_id: 'w1' });
const h2 = hashChain.computeRecordHash('0000', { action: 'start', workflow_id: 'w1' });
assert('W7.6.a hashes iguais para payload idêntico', h1 === h2);

const h3 = hashChain.computeRecordHash('0001', { action: 'start', workflow_id: 'w1' });
assert('W7.6.b prev_hash diferente gera hash diferente', h1 !== h3);

const { GENESIS_HASH } = hashChain;
assert('W7.6.c GENESIS_HASH é 64 chars hex', /^[0-9a-f]{64}$/.test(GENESIS_HASH));

const stats2 = hashChain.getImmutableLedgerStats();
assert('W7.6.d enabled=false por defeito', stats2.enabled === false);
assert('W7.6.e genesis_hash presente', stats2.genesis_hash === GENESIS_HASH);

// append (disabled) retorna ok mas mode=disabled
(async () => {
  process.env.IMPETUS_AUDIT_HASH_CHAIN_ENABLED = 'false';
  Object.keys(require.cache).forEach((k) => { if (k.includes('/governance/')) delete require.cache[k]; });
  const hc2 = require('../governance/immutableWorkflowAuditPrep');
  const r = await hc2.appendWorkflowAuditRecord({
    workflow_id: 'w1', workflow_type: 'quality.inspection', domain: 'quality', action: 'start'
  });
  assert('W7.6.f append disabled retorna ok=true', r.ok === true);
  assert('W7.6.g append disabled mode=disabled', r.mode === 'disabled');
  delete process.env.IMPETUS_AUDIT_HASH_CHAIN_ENABLED;
  Object.keys(require.cache).forEach((k) => { if (k.includes('/governance/')) delete require.cache[k]; });
})().catch(() => failed++);

// ---------------------------------------------------------------------------
// W7.7 — lgpdIndustrialPrep: classificações + consentimento
// ---------------------------------------------------------------------------
console.log('\n[ W7.7 ] lgpdIndustrialPrep — LGPD classificação');
const lgpd = require('../governance/lgpdIndustrialPrep');

const lgpdStats = lgpd.getLgpdStats();
assert('W7.7.a classificações built-in >= 12', lgpdStats.classified_fields >= 12);

const emailClass = lgpd.getFieldClassification('users.email');
assert('W7.7.b users.email classified as personal', emailClass && emailClass.category === 'personal');
assert('W7.7.c users.email anonymization_required = true', emailClass && emailClass.anonymization_required === true);

const cpfClass = lgpd.getFieldClassification('users.cpf');
assert('W7.7.d users.cpf classified as sensitive', cpfClass && cpfClass.category === 'sensitive');

const telClass = lgpd.getFieldClassification('telemetry_timeseries_v1.*');
assert('W7.7.e telemetry classified as industrial', telClass && telClass.category === 'industrial');
assert('W7.7.f telemetry anonymization_required = false', telClass && !telClass.anonymization_required);

const anonFields = lgpd.listFieldsRequiringAnonymization();
assert('W7.7.g campos que requerem anonimização >= 5', anonFields.length >= 5);

// consent hook (disabled)
const cons = lgpd.recordConsentHook({ user_id: 'u1', company_id: 'co-1', purpose: 'operational', granted: true });
assert('W7.7.h consent disabled retorna ok', cons.ok === true);

// Custom classification
lgpd.classifyField({ field: 'custom.biometric_voice', category: 'sensitive', description: 'Voz biométrica' });
const custom = lgpd.getFieldClassification('custom.biometric_voice');
assert('W7.7.i custom classification registada', custom !== null);
assert('W7.7.j custom category = sensitive', custom.category === 'sensitive');

// ---------------------------------------------------------------------------
// W7.8 — industrialTraceabilityFoundation: geração + registo
// ---------------------------------------------------------------------------
console.log('\n[ W7.8 ] industrialTraceabilityFoundation — rastreabilidade');
const trace = require('../governance/industrialTraceabilityFoundation');

const tid = trace.generateTraceabilityId();
assert('W7.8.a traceability_id gerado não vazio', typeof tid === 'string' && tid.length > 5);
assert('W7.8.b traceability_id começa com TRC-', tid.startsWith('TRC-'));

// record (disabled)
(async () => {
  const r = await trace.recordTraceEvent({
    workflow_id: 'w1', domain: 'quality', actor_role: 'supervisor', action: 'inspection_start'
  });
  assert('W7.8.c record disabled → ok=true', r.ok === true);
  assert('W7.8.d record disabled → stored=disabled', r.stored === 'disabled');
  assert('W7.8.e traceability_id retornado', typeof r.traceability_id === 'string');

  const stats3 = trace.getTraceabilityStats();
  assert('W7.8.f enabled=false por defeito', stats3.enabled === false);
})().catch(() => failed++);

// ---------------------------------------------------------------------------
// W7.9 — industrialAuditStructure: stats + buffer
// ---------------------------------------------------------------------------
console.log('\n[ W7.9 ] industrialAuditStructure — auditoria industrial');
const audit = require('../governance/industrialAuditStructure');

// Disabled by default
(async () => {
  const r = await audit.writeIndustrialAuditEvent({
    event_type: 'quality.inspection_started',
    domain: 'quality',
    actor_role: 'supervisor'
  });
  assert('W7.9.a write disabled retorna ok=true', r.ok === true);
  assert('W7.9.b write disabled stored=disabled', r.stored === 'disabled');

  const s = audit.getAuditStats();
  assert('W7.9.c enabled=false', s.enabled === false);
  assert('W7.9.d total_written=0 quando disabled', s.total_written === 0);
  assert('W7.9.e memory_buffer_size=0', s.memory_buffer_size === 0);
})().catch(() => failed++);

// ---------------------------------------------------------------------------
// W7.10 — industrialGovernanceRuntime: health
// ---------------------------------------------------------------------------
console.log('\n[ W7.10 ] industrialGovernanceRuntime — health');
Object.keys(require.cache).forEach((k) => { if (k.includes('/governance/')) delete require.cache[k]; });
const runtime = require('../governance/industrialGovernanceRuntime');
runtime.bootstrap();
const health = runtime.getGovernanceHealth();
assert('W7.10.a wave=7', health.wave === 7);
assert('W7.10.b enabled=false por defeito', health.enabled === false);
assert('W7.10.c bootstrapped=true após bootstrap()', health.bootstrapped === true);
assert('W7.10.d components.workflow_capability_matrix.count >= 9', health.components.workflow_capability_matrix.count >= 9);
assert('W7.10.e components.abac_extension.policies >= 3', health.components.abac_extension.policies >= 3);
assert('W7.10.f components.lgpd_prep.classified_fields >= 12', health.components.lgpd_prep.classified_fields >= 12);
assert('W7.10.g components.domain_capability_governance.total_capabilities >= 12', health.components.domain_capability_governance.total_capabilities >= 12);

// ---------------------------------------------------------------------------
// W7.11 — featureGovernanceService: novos flags reconhecidos
// ---------------------------------------------------------------------------
console.log('\n[ W7.11 ] featureGovernanceService — flags W7 registados');
Object.keys(require.cache).forEach((k) => {
  if (k.includes('/services/featureGovernanceService')) delete require.cache[k];
});
const fgs = require('../services/featureGovernanceService');
const snap = fgs.getSnapshot();
assert('W7.11.a __captured_at presente', typeof snap.__captured_at === 'string');

// Verificar regras W7 no validate
process.env.IMPETUS_ABAC_ENFORCE = 'true';
delete process.env.IMPETUS_GOVERNANCE_V7_ENABLED;
Object.keys(require.cache).forEach((k) => {
  if (k.includes('/services/featureGovernanceService')) delete require.cache[k];
});
const fgs2 = require('../services/featureGovernanceService');
const val2 = fgs2.getValidation();
const hasAbacWarn = val2.findings.some((f) => f.id === 'ABAC_ENFORCE_WITHOUT_GOVERNANCE_V7');
assert('W7.11.b regra ABAC_ENFORCE_WITHOUT_GOVERNANCE_V7 disparada', hasAbacWarn);
delete process.env.IMPETUS_ABAC_ENFORCE;

// ---------------------------------------------------------------------------
// Sumário
// ---------------------------------------------------------------------------
setTimeout(() => {
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`WAVE 7 — Resultado: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}, 300);
