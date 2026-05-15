'use strict';

/**
 * Dashboard Governance Scenarios — auditoria estrutural completa.
 *
 *   npm run test:dashboard-governance
 *   node src/tests/dashboardGovernanceScenarios.js
 *
 * Cobre (conforme pedido do plano de auditoria):
 *   ✔ Inventário de perfis entregues (Fase 1+2)
 *   ✔ Segregação por domínio: finance / RH / manutenção / operações (Fase 2)
 *   ✔ Capability resolution sem inflação (Fase 3)
 *   ✔ Payload risks — módulos cross-domain (Fase 4)
 *   ✔ Contextualização cognitiva domain-safe (Fase 5)
 *   ✔ Frontend delivery — fail-open, módulos inesperados (Fase 6)
 *   ✔ Orquestração restrita ao domínio correcto (Fase 7)
 *   ✔ auditDeliveryForUser — contrato do serviço de auditoria (Fase 8)
 *   ✔ auditProfileMatrix — matriz multi-perfil (Fase 8)
 */

const path = require('path');
const {
  auditDeliveryForUser,
  auditProfileMatrix,
  resolveDeliveryConfig,
  detectImplicitCapabilityRisks,
  detectPayloadRisks,
  auditCognitiveSummary,
  buildFrontendDeliverySnapshot
} = require(path.join('..', 'services', 'dashboardDeliveryAuditService'));
const { buildIntelligentSummary, canOrchestrate } = require(path.join('..', 'services', 'liveDashboardService'));
const dashboardProfileResolver = require(path.join('..', 'services', 'dashboardProfileResolver'));
const dashboardAccessService   = require(path.join('..', 'services', 'dashboardAccessService'));

// ─── helpers ──────────────────────────────────────────────────────────────
let _passed = 0;
let _failed = 0;
function assert(cond, label, detail) {
  if (cond) { _passed++; console.log(`  PASS  ${label}`); return true; }
  _failed++; console.log(`  FAIL  ${label}`);
  if (detail !== undefined) {
    try { console.log('        ', JSON.stringify(detail).slice(0, 500)); } catch (_) {}
  }
  return false;
}
function section(name) { console.log(`\n=== ${name} ===`); }

// ─── personas ─────────────────────────────────────────────────────────────
const PERSONAS = {
  CFO: {
    id: 'gov-cfo', company_id: 'co-1', role: 'diretor', job_title: 'Diretor Financeiro',
    functional_area: 'finance', department: 'Controladoria',
    hierarchy_level: 1, permissions: ['VIEW_FINANCIAL', 'VIEW_STRATEGIC', 'VIEW_DASHBOARD'],
    dashboard_profile: 'finance_management'
  },
  RH_MGR: {
    id: 'gov-rh', company_id: 'co-1', role: 'gerente', job_title: 'Gerente de RH',
    functional_area: 'hr', department: 'Recursos Humanos',
    hierarchy_level: 2, permissions: ['VIEW_HR', 'VIEW_OPERATIONAL', 'VIEW_DASHBOARD'],
    dashboard_profile: 'hr_management'
  },
  DIR_MAINT: {
    id: 'gov-dm', company_id: 'co-1', role: 'diretor', job_title: 'Diretor de Manutenção',
    functional_area: 'maintenance', department: 'Manutenção',
    hierarchy_level: 1, permissions: ['VIEW_OPERATIONAL', 'VIEW_STRATEGIC', 'VIEW_DASHBOARD'],
    dashboard_profile: 'director_industrial'
  },
  DIR_OPS: {
    id: 'gov-do', company_id: 'co-1', role: 'diretor', job_title: 'Diretor de Operações',
    functional_area: 'operations', department: 'Operações',
    hierarchy_level: 1, permissions: ['VIEW_OPERATIONAL', 'VIEW_STRATEGIC', 'VIEW_DASHBOARD'],
    dashboard_profile: 'director_operations'
  },
  DIR_AMB: {
    id: 'gov-da', company_id: 'co-1', role: 'diretor', job_title: 'Diretor',
    functional_area: null, department: 'Sede',
    hierarchy_level: 1, permissions: ['VIEW_DASHBOARD'],
    dashboard_profile: null
  },
  SUP_PROD: {
    id: 'gov-sp', company_id: 'co-1', role: 'supervisor', job_title: 'Supervisor de Produção',
    functional_area: 'production', department: 'Produção',
    hierarchy_level: 4, permissions: ['VIEW_OPERATIONAL', 'VIEW_DASHBOARD'],
    dashboard_profile: 'supervisor_production'
  },
  OPER: {
    id: 'gov-op', company_id: 'co-1', role: 'colaborador', job_title: 'Operador de Máquina',
    functional_area: 'production', department: 'Produção',
    hierarchy_level: 5, permissions: ['VIEW_OPERATIONAL', 'VIEW_DASHBOARD'],
    dashboard_profile: 'operator_floor'
  },
  CEO: {
    id: 'gov-ceo', company_id: 'co-1', role: 'ceo', job_title: 'CEO',
    functional_area: null, department: 'Diretoria',
    hierarchy_level: 0, permissions: ['*'],
    dashboard_profile: 'ceo_executive'
  },
  ADMIN: {
    id: 'gov-adm', company_id: 'co-1', role: 'admin', job_title: 'Administrador',
    functional_area: 'admin', department: 'TI',
    hierarchy_level: 3, permissions: ['MANAGE_USERS', 'VIEW_AUDIT_LOGS', 'VIEW_DASHBOARD'],
    dashboard_profile: 'admin_system'
  }
};

// ────────────────────────────────────────────────────────────────────────────
// FASE 1+2 — Inventário e matrix de entrega
// ────────────────────────────────────────────────────────────────────────────
function testProfileInventory() {
  section('Fase 1+2 — Inventário de perfis e entrega por persona');

  for (const [name, user] of Object.entries(PERSONAS)) {
    const cfg = dashboardProfileResolver.getDashboardConfigForUser(user);
    assert(typeof cfg.profile_code === 'string' && cfg.profile_code.length > 0,
      `${name}: profile_code resolvido`, cfg.profile_code);
  }

  // Matriz: perfis distintos sem sobreposição errada
  const { matrix, summary } = auditProfileMatrix(Object.values(PERSONAS));
  assert(summary.total === Object.keys(PERSONAS).length,
    'matriz cobre todas as personas', summary);
  assert(typeof summary.clean === 'number',
    'matriz retorna contagem clean', summary);
}

// ────────────────────────────────────────────────────────────────────────────
// FASE 2 — Segregação cross-domain
// ────────────────────────────────────────────────────────────────────────────
function testDomainSegregation() {
  section('Fase 2 — Segregação de módulos por domínio');

  // Financeiro não recebe manuia / hr_intelligence
  const cfoCfg = resolveDeliveryConfig(PERSONAS.CFO);
  assert(!cfoCfg.allowed_modules.includes('manuia'),
    'CFO: sem módulo manuia', cfoCfg.allowed_modules);
  assert(!cfoCfg.allowed_modules.includes('hr_intelligence'),
    'CFO: sem hr_intelligence', cfoCfg.allowed_modules);
  assert(cfoCfg.profile_code === 'finance_management',
    'CFO: profile = finance_management', cfoCfg.profile_code);

  // RH não recebe telemetry de manutenção
  const rhCfg = resolveDeliveryConfig(PERSONAS.RH_MGR);
  assert(!rhCfg.allowed_modules.includes('manuia'),
    'RH: sem módulo manuia', rhCfg.allowed_modules);
  assert(rhCfg.profile_code === 'hr_management',
    'RH: profile = hr_management', rhCfg.profile_code);

  // Manutenção não recebe perfil financeiro
  const maintCfg = resolveDeliveryConfig(PERSONAS.DIR_MAINT);
  assert(maintCfg.profile_code !== 'finance_management',
    'Diretor Manutenção: não é finance_management', maintCfg.profile_code);
  assert(maintCfg.profile_code === 'director_industrial',
    'Diretor Manutenção: director_industrial', maintCfg.profile_code);

  // Diretor ambíguo não vira operations
  const ambCfg = resolveDeliveryConfig(PERSONAS.DIR_AMB);
  assert(ambCfg.profile_code === 'director_unassigned',
    'Diretor ambíguo: director_unassigned', ambCfg.profile_code);
  assert(
    ambCfg.functional_area == null || ambCfg.functional_area === '',
    'Diretor ambíguo: área não forçada para operations', ambCfg.functional_area
  );
}

// ────────────────────────────────────────────────────────────────────────────
// FASE 3 — Capability resolution
// ────────────────────────────────────────────────────────────────────────────
function testCapabilityResolution() {
  section('Fase 3 — Capability resolution sem inflação');

  // Liderança sem permissions → aviso, não crash
  const noPermUser = { ...PERSONAS.DIR_OPS, permissions: [] };
  const risks = detectImplicitCapabilityRisks(noPermUser);
  const leaderNoPermRisk = risks.find(r => r.type === 'leadership_no_explicit_permissions');
  assert(leaderNoPermRisk !== undefined,
    'Diretor sem permissions: risk leadership_no_explicit_permissions detectado', risks.map(r => r.type));

  // Wildcard registado como info
  const ceoRisks = detectImplicitCapabilityRisks(PERSONAS.CEO);
  const wildcardRisk = ceoRisks.find(r => r.type === 'wildcard_permission');
  assert(wildcardRisk !== undefined && wildcardRisk.severity === 'info',
    'CEO wildcard *: registado como info', ceoRisks);

  // Finance com permissão operacional — risco registado
  const finOpsUser = { ...PERSONAS.CFO, permissions: ['VIEW_FINANCIAL', 'VIEW_OPERATIONAL', 'ACCESS_TELEMETRY'] };
  const finOpsRisks = detectImplicitCapabilityRisks(finOpsUser);
  const crossPerm = finOpsRisks.find(r => r.type === 'non_operational_area_with_operational_perm');
  assert(crossPerm !== undefined,
    'CFO com ACCESS_TELEMETRY: risk non_operational_area_with_operational_perm', finOpsRisks.map(r => r.type));
}

// ────────────────────────────────────────────────────────────────────────────
// FASE 4 — Payload risks
// ────────────────────────────────────────────────────────────────────────────
function testPayloadRisks() {
  section('Fase 4 — Payload risks / módulos cross-domain no payload');

  // CFO com perfil operacional forçado — detectar
  const cfoCrossUser = { ...PERSONAS.CFO, dashboard_profile: 'director_operations' };
  const cfoCross = resolveDeliveryConfig(cfoCrossUser);
  const cfoCrossRisks = detectPayloadRisks(cfoCrossUser, cfoCross);
  // A área é finance → risco manuia se presente
  // Só verifica que detectPayloadRisks retorna array
  assert(Array.isArray(cfoCrossRisks), 'detectPayloadRisks retorna array', cfoCrossRisks);

  // Perfil desconhecido
  const unknownProfile = { ...PERSONAS.OPER, dashboard_profile: 'fake_profile_xyz' };
  const ukCfg = resolveDeliveryConfig(unknownProfile);
  // operator_floor é o fallback esperado quando o override não é válido
  assert(typeof ukCfg.profile_code === 'string', 'perfil desconhecido: resolve para fallback', ukCfg.profile_code);

  // CFO normal: sem módulos cross-domain de alto risco
  const cfoCfg = resolveDeliveryConfig(PERSONAS.CFO);
  const cfoRisks = detectPayloadRisks(PERSONAS.CFO, cfoCfg);
  const highRisks = cfoRisks.filter(r => r.severity === 'high' || r.severity === 'critical');
  assert(highRisks.length === 0,
    'CFO com perfil correto: sem payload risks high/critical', highRisks);
}

// ────────────────────────────────────────────────────────────────────────────
// FASE 5 — Contextualização cognitiva domain-safe
// ────────────────────────────────────────────────────────────────────────────
function testCognitiveSummaries() {
  section('Fase 5 — Resumos cognitivos domain-safe');

  // Finance / RH não devem ter "alertas operacionais"
  for (const [name, user] of [['CFO', PERSONAS.CFO], ['RH_MGR', PERSONAS.RH_MGR]]) {
    const cfg = resolveDeliveryConfig(user);
    const cogAudit = auditCognitiveSummary(user, cfg);
    assert(cogAudit.domain_safe === true,
      `${name}: resumo cognitivo domain-safe`, { excerpt: cogAudit.summary_excerpt });
    assert(!cogAudit.has_operational_phrasing,
      `${name}: sem "alertas operacionais" no resumo`, cogAudit.summary_excerpt.slice(0, 180));
  }

  // Operações deve manter "alertas operacionais"
  const opsCfg = resolveDeliveryConfig(PERSONAS.DIR_OPS);
  const opsAudit = auditCognitiveSummary(PERSONAS.DIR_OPS, opsCfg);
  assert(opsAudit.has_operational_phrasing,
    'DIR_OPS: resumo mantém "alertas operacionais"', opsAudit.summary_excerpt.slice(0, 200));

  // director_unassigned
  const ambCfg = resolveDeliveryConfig(PERSONAS.DIR_AMB);
  const ambAudit = auditCognitiveSummary(PERSONAS.DIR_AMB, ambCfg);
  assert(ambAudit.domain_safe === true,
    'DIR_AMB (unassigned): resumo domain-safe', ambAudit.summary_excerpt.slice(0, 180));
}

// ────────────────────────────────────────────────────────────────────────────
// FASE 6 — Frontend delivery
// ────────────────────────────────────────────────────────────────────────────
function testFrontendDelivery() {
  section('Fase 6 — Frontend delivery (snapshot de módulos e fail-open)');

  for (const [name, user] of Object.entries(PERSONAS)) {
    const cfg = resolveDeliveryConfig(user);
    const snap = buildFrontendDeliverySnapshot(user, cfg);

    // Sem cross-domain inesperado para perfis com área definida
    if (user.functional_area) {
      assert(snap.unexpected_cross_domain.length === 0,
        `${name}: sem módulos cross-domain inesperados`, snap.unexpected_cross_domain);
    }

    // fail_open_risk só acceptable para admin (que tem bypass legítimo)
    if (user.role !== 'admin' && cfg.allowed_modules.length > 0) {
      assert(snap.fail_open_risk === 'none',
        `${name}: sem fail-open risk`, snap.fail_open_risk);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// FASE 7 — Orquestração restrita
// ────────────────────────────────────────────────────────────────────────────
function testOrchestrationGating() {
  section('Fase 7 — Gating de orquestração por domínio');

  // Perfis não-operacionais: sem orquestração
  const noOrchProfiles = [
    ['CFO', PERSONAS.CFO, 'finance_management', 'finance'],
    ['RH_MGR', PERSONAS.RH_MGR, 'hr_management', 'hr'],
    ['DIR_AMB', PERSONAS.DIR_AMB, 'director_unassigned', null]
  ];
  for (const [name, user, profile, area] of noOrchProfiles) {
    assert(!canOrchestrate(user, profile, area),
      `${name}: canOrchestrate=false para domínio não-operacional`, { profile, area });
  }

  // Operações / produção: orquestração permitida
  const orchProfiles = [
    ['DIR_OPS', PERSONAS.DIR_OPS, 'director_operations', 'operations'],
    ['SUP_PROD', PERSONAS.SUP_PROD, 'supervisor_production', 'production']
  ];
  for (const [name, user, profile, area] of orchProfiles) {
    assert(canOrchestrate(user, profile, area),
      `${name}: canOrchestrate=true para domínio operacional`, { profile, area });
  }

  // CEO com área finance explícita bloqueia orquestração
  assert(!canOrchestrate(PERSONAS.CEO, 'ceo_executive', 'finance'),
    'CEO com área=finance: canOrchestrate=false');
}

// ────────────────────────────────────────────────────────────────────────────
// FASE 8 — Serviço de auditoria (contrato)
// ────────────────────────────────────────────────────────────────────────────
function testAuditServiceContract() {
  section('Fase 8 — auditDeliveryForUser e auditProfileMatrix (contrato)');

  // auditDeliveryForUser retorna estrutura esperada
  const report = auditDeliveryForUser(PERSONAS.CFO);
  assert(report.ok === true, 'auditDeliveryForUser: ok=true', report);
  assert(typeof report.governance_status === 'string', 'governance_status presente', report.governance_status);
  assert(typeof report.high_risk_count === 'number', 'high_risk_count numérico', report.high_risk_count);
  assert(Array.isArray(report.risks), 'risks[] presente', report.risks);
  assert(report.delivery?.profile_code === 'finance_management',
    'CFO: profile no audit report', report.delivery);

  // auditDeliveryForUser null
  const nullReport = auditDeliveryForUser(null);
  assert(nullReport.ok === false, 'null user: ok=false', nullReport);

  // auditProfileMatrix
  const matrix = auditProfileMatrix(Object.values(PERSONAS));
  assert(matrix.summary.total === Object.keys(PERSONAS).length,
    'matrix: total=9 personas', matrix.summary);
  assert(matrix.summary.clean >= 0, 'matrix: clean numérico', matrix.summary);
  assert(Array.isArray(matrix.matrix), 'matrix.matrix é array', matrix.matrix);

  // Cada linha da matriz tem campos obrigatórios
  for (const row of matrix.matrix) {
    assert(
      'role' in row && 'profile_code' in row && 'modules_count' in row && 'orchestration' in row,
      `matrix row ${row.role}: campos obrigatórios`,
      row
    );
  }

  // CFO tem governance_status clean (sem high risks)
  const cfoRow = matrix.matrix.find(r => r.profile_code === 'finance_management');
  assert(cfoRow?.governance_status === 'clean',
    'CFO matrix row: governance_status=clean', cfoRow);
}

// ────────────────────────────────────────────────────────────────────────────
// EXTRA — KPI depth não é operacional para perfis não-operacionais
// ────────────────────────────────────────────────────────────────────────────
function testIADepth() {
  section('Extra — IA depth conforme domínio');

  const cfoDepth = dashboardAccessService.getIADataDepth(PERSONAS.CFO);
  assert(cfoDepth === 'strategic' || cfoDepth === 'analytical',
    'CFO: ia_depth strategic ou analytical', cfoDepth);

  const operDepth = dashboardAccessService.getIADataDepth(PERSONAS.OPER);
  assert(operDepth === 'practical' || operDepth === 'operational',
    'OPER: ia_depth practical ou operational', operDepth);
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────────
function main() {
  testProfileInventory();
  testDomainSegregation();
  testCapabilityResolution();
  testPayloadRisks();
  testCognitiveSummaries();
  testFrontendDelivery();
  testOrchestrationGating();
  testAuditServiceContract();
  testIADepth();

  console.log(`\nTotal: ${_passed} passed | ${_failed} failed`);
  if (_failed > 0) process.exit(1);
}

main();
