'use strict';

/**
 * Universal Safe Access Modules — Suite de Testes de Governança
 * =============================================================
 *
 *   npm run test:universal-safe-access
 *   node src/tests/universalSafeAccessModulesScenarios.js
 *
 * Valida:
 *   ✔ Registro Inteligente, Cadastrar com IA e PróAção acessíveis a TODOS
 *   ✔ Financeiro, RH, Manutenção, Operações, Admin, Director_unassigned
 *   ✔ Ausência de cross-domain: finance não recebe telemetry operacional
 *   ✔ RH não recebe orchestration industrial
 *   ✔ Director_unassigned não vira operações
 *   ✔ PróAção: acesso universal sem contexto cross-domain
 *   ✔ deny-by-default preservado no restante do sistema
 *   ✔ Nenhum módulo fora da allowlist explícita é liberado universalmente
 */

const path = require('path');
const dashboardAccessService = require(path.join('..', 'services', 'dashboardAccessService'));
const { canOrchestrate, buildIntelligentSummary } = require(path.join('..', 'services', 'liveDashboardService'));

// ─── helpers ──────────────────────────────────────────────────────────────
let _passed = 0;
let _failed = 0;
function assert(cond, label, detail) {
  if (cond) { _passed++; console.log(`  PASS  ${label}`); return true; }
  _failed++;
  console.log(`  FAIL  ${label}`);
  if (detail !== undefined) {
    try { console.log('        ', JSON.stringify(detail).slice(0, 600)); } catch (_) {}
  }
  return false;
}
function section(name) { console.log(`\n=== ${name} ===`); }

// ─── constantes ────────────────────────────────────────────────────────────
const { UNIVERSAL_SAFE_ACCESS_MODULES } = dashboardAccessService;

/** Módulos sensíveis que NÃO devem ser liberados universalmente */
const SENSITIVE_MODULES = [
  'operational', 'manuia', 'hr_intelligence', 'anomaly_detection',
  'financial_intelligence', 'centro_previsao_operacional', 'centro_operacoes_industrial',
  'cerebro_operacional', 'losses_map', 'cost_center', 'pulse_rh', 'pulse_gestao'
];

// ─── personas ──────────────────────────────────────────────────────────────
const PERSONAS = {
  FINANCEIRO: {
    id: 'usa-fin', company_id: 'co-1', role: 'diretor',
    job_title: 'Diretor Financeiro', functional_area: 'finance',
    department: 'Controladoria', hierarchy_level: 1,
    permissions: ['VIEW_FINANCIAL', 'VIEW_STRATEGIC', 'VIEW_DASHBOARD'],
    dashboard_profile: 'finance_management'
  },
  RH: {
    id: 'usa-rh', company_id: 'co-1', role: 'gerente',
    job_title: 'Gerente de RH', functional_area: 'hr',
    department: 'Recursos Humanos', hierarchy_level: 2,
    permissions: ['VIEW_HR', 'VIEW_OPERATIONAL', 'VIEW_DASHBOARD'],
    dashboard_profile: 'hr_management'
  },
  OPERACOES: {
    id: 'usa-ops', company_id: 'co-1', role: 'supervisor',
    job_title: 'Supervisor de Produção', functional_area: 'operations',
    department: 'Operações', hierarchy_level: 3,
    permissions: ['VIEW_OPERATIONAL', 'VIEW_DASHBOARD'],
    dashboard_profile: 'operations_management'
  },
  MANUTENCAO: {
    id: 'usa-mnt', company_id: 'co-1', role: 'colaborador',
    job_title: 'Técnico de Manutenção', functional_area: 'maintenance',
    department: 'Manutenção', hierarchy_level: 4,
    permissions: ['VIEW_OPERATIONAL', 'VIEW_DASHBOARD'],
    dashboard_profile: 'maintenance_technician'
  },
  ADMIN: {
    id: 'usa-adm', company_id: 'co-1', role: 'admin',
    job_title: 'Administrador do Sistema', functional_area: 'admin',
    department: 'TI', hierarchy_level: 1,
    permissions: ['*'],
    is_tenant_admin: true
  },
  DIR_AMB: {
    id: 'usa-dam', company_id: 'co-1', role: 'diretor',
    job_title: 'Diretor Geral', functional_area: null,
    department: null, hierarchy_level: 1,
    permissions: [],
    dashboard_profile: 'director_unassigned'
  },
  COLABORADOR: {
    id: 'usa-col', company_id: 'co-1', role: 'colaborador',
    job_title: 'Operador de Produção', functional_area: 'production',
    department: 'Produção', hierarchy_level: 5,
    permissions: ['VIEW_DASHBOARD'],
    dashboard_profile: 'production_operator'
  }
};

// ─── Fase 1: Constante UNIVERSAL_SAFE_ACCESS_MODULES ──────────────────────
section('CONSTANTE UNIVERSAL_SAFE_ACCESS_MODULES');

assert(
  Array.isArray(UNIVERSAL_SAFE_ACCESS_MODULES),
  'UNIVERSAL_SAFE_ACCESS_MODULES é um array'
);
assert(
  UNIVERSAL_SAFE_ACCESS_MODULES.includes('proaction'),
  'Allowlist contém proaction'
);
assert(
  UNIVERSAL_SAFE_ACCESS_MODULES.includes('registro_inteligente'),
  'Allowlist contém registro_inteligente'
);
assert(
  UNIVERSAL_SAFE_ACCESS_MODULES.includes('cadastrar_com_ia'),
  'Allowlist contém cadastrar_com_ia'
);
assert(
  UNIVERSAL_SAFE_ACCESS_MODULES.length === 3,
  'Allowlist contém EXATAMENTE 3 módulos (não fail-open)',
  { length: UNIVERSAL_SAFE_ACCESS_MODULES.length, modules: UNIVERSAL_SAFE_ACCESS_MODULES }
);

// Garantia: nenhum módulo sensível está na allowlist
for (const sensitive of SENSITIVE_MODULES) {
  assert(
    !UNIVERSAL_SAFE_ACCESS_MODULES.includes(sensitive),
    `Módulo sensível "${sensitive}" NÃO está na allowlist universal`,
    { sensitive, allowlist: UNIVERSAL_SAFE_ACCESS_MODULES }
  );
}

// ─── Fase 2: getAllowedModules — todos os perfis têm os 3 módulos ──────────
section('ACESSO UNIVERSAL — getAllowedModules (backend)');

for (const [personaName, persona] of Object.entries(PERSONAS)) {
  const mods = dashboardAccessService.getAllowedModules(persona);

  assert(
    mods.includes('proaction'),
    `${personaName}: visible_modules contém proaction`,
    { persona: personaName, mods }
  );
  assert(
    mods.includes('registro_inteligente'),
    `${personaName}: visible_modules contém registro_inteligente`,
    { persona: personaName, mods }
  );
  assert(
    mods.includes('cadastrar_com_ia'),
    `${personaName}: visible_modules contém cadastrar_com_ia`,
    { persona: personaName, mods }
  );
}

// ─── Fase 3: Segregação — módulos sensíveis não vazam para finanças/RH ────
section('SEGREGAÇÃO DOMINAL — módulos sensíveis não vazam');

const finMods = dashboardAccessService.getAllowedModules(PERSONAS.FINANCEIRO);
assert(
  !finMods.includes('manuia'),
  'Financeiro NÃO recebe manuia (telemetry industrial)',
  { finMods }
);
assert(
  !finMods.includes('hr_intelligence'),
  'Financeiro NÃO recebe hr_intelligence',
  { finMods }
);

const rhMods = dashboardAccessService.getAllowedModules(PERSONAS.RH);
assert(
  !rhMods.includes('manuia'),
  'RH NÃO recebe manuia',
  { rhMods }
);
assert(
  !rhMods.includes('financial_intelligence'),
  'RH NÃO recebe financial_intelligence',
  { rhMods }
);

const mntMods = dashboardAccessService.getAllowedModules(PERSONAS.MANUTENCAO);
assert(
  !mntMods.includes('financial_intelligence'),
  'Manutenção NÃO recebe financial_intelligence',
  { mntMods }
);
assert(
  !mntMods.includes('hr_intelligence'),
  'Manutenção NÃO recebe hr_intelligence',
  { mntMods }
);

const dirMods = dashboardAccessService.getAllowedModules(PERSONAS.DIR_AMB);
assert(
  !dirMods.includes('manuia'),
  'Director_unassigned NÃO recebe manuia',
  { dirMods }
);
assert(
  dirMods.includes('proaction'),
  'Director_unassigned TEM proaction',
  { dirMods }
);

// ─── Fase 4: canOrchestrate — universal access NÃO abre orchestration ──────
// canOrchestrate(user, profileCode, functionalArea) recebe 3 argumentos distintos.
section('ORCHESTRATION GOVERNANCE — NÃO alterado pela universalização');

// Perfis de domínio não-operacional: orchestration DEVE permanecer bloqueada.
const orchCasesBlocked = [
  { persona: PERSONAS.FINANCEIRO, profile: 'finance_management', area: 'finance', name: 'Financeiro' },
  { persona: PERSONAS.RH,         profile: 'hr_management',      area: 'hr',      name: 'RH' },
  { persona: PERSONAS.DIR_AMB,    profile: 'director_unassigned', area: null,      name: 'Director_unassigned' }
];
for (const { persona, profile, area, name } of orchCasesBlocked) {
  const orch = canOrchestrate(persona, profile, area);
  assert(
    !orch,
    `${name}: canOrchestrate=false (orchestration NÃO aberta pela universalização)`,
    { persona: name, profile, area, canOrchestrate: orch }
  );
}

// Operações SÍ deve orquestrar (não regrediu)
const orchOps = canOrchestrate(PERSONAS.OPERACOES, 'operations_management', 'operations');
assert(
  orchOps,
  'Operações: canOrchestrate=true (sem regressão)',
  { canOrchestrate: orchOps }
);

// Admin (tenant) pode orquestrar por design (level=1, role=admin) — não é um perfil não-operacional.
const orchAdmin = canOrchestrate(PERSONAS.ADMIN, null, 'admin');
assert(
  orchAdmin,
  'Admin: canOrchestrate=true (administrador sistêmico — comportamento esperado)',
  { canOrchestrate: orchAdmin }
);

// ─── Fase 5: buildIntelligentSummary — domain-safe para perfis sem domínio ─
// buildIntelligentSummary({ userName, profileLabel, areaLabel, deptName, jobTitle,
//   signals, gaps, sufficiency, profileCode, functionalArea })
section('COGNITIVE SUMMARY — domain-safe preservado');

const DEFAULT_SIGNALS = { tasksOpen: 0, tasksOverdue: 0, alertsOpen: 0 };

const summaryDir = buildIntelligentSummary({
  profileCode: 'director_unassigned',
  functionalArea: null,
  profileLabel: 'Diretor Geral',
  signals: DEFAULT_SIGNALS,
  gaps: [],
  sufficiency: 'full'
});
assert(
  typeof summaryDir === 'string' && summaryDir.length > 0,
  'Director_unassigned: resumo gerado (não quebra)',
  { summary: summaryDir.slice(0, 120) }
);
assert(
  !summaryDir.toLowerCase().includes('alertas operacionais'),
  'Director_unassigned: resumo NÃO contém "alertas operacionais"',
  { summary: summaryDir.slice(0, 200) }
);

const summaryFin = buildIntelligentSummary({
  profileCode: 'finance_management',
  functionalArea: 'finance',
  profileLabel: 'Gestão Financeira',
  signals: DEFAULT_SIGNALS,
  gaps: [],
  sufficiency: 'full'
});
assert(
  !summaryFin.toLowerCase().includes('alertas operacionais'),
  'Financeiro: resumo NÃO contém "alertas operacionais"',
  { summary: summaryFin.slice(0, 200) }
);

const summaryRh = buildIntelligentSummary({
  profileCode: 'hr_management',
  functionalArea: 'hr',
  profileLabel: 'Gestão de RH',
  signals: DEFAULT_SIGNALS,
  gaps: [],
  sufficiency: 'full'
});
assert(
  !summaryRh.toLowerCase().includes('alertas operacionais'),
  'RH: resumo NÃO contém "alertas operacionais"',
  { summary: summaryRh.slice(0, 200) }
);

// ─── Fase 6: deny-by-default preservado — módulos fora da allowlist ────────
section('DENY-BY-DEFAULT — módulos fora da allowlist não são universais');

// Colaborador simples não deve ter operational, manuia, etc.
const colMods = dashboardAccessService.getAllowedModules(PERSONAS.COLABORADOR);
assert(
  !colMods.includes('manuia'),
  'Colaborador: NÃO recebe manuia (deny-by-default preservado)',
  { colMods }
);
assert(
  !colMods.includes('financial_intelligence'),
  'Colaborador: NÃO recebe financial_intelligence',
  { colMods }
);
assert(
  !colMods.includes('hr_intelligence'),
  'Colaborador: NÃO recebe hr_intelligence',
  { colMods }
);
// Mas tem os 3 módulos universais
assert(
  colMods.includes('proaction') && colMods.includes('registro_inteligente') && colMods.includes('cadastrar_com_ia'),
  'Colaborador: TEM os 3 módulos universais',
  { colMods }
);

// ─── Fase 7: Integridade da allowlist (sem ampliação silenciosa) ───────────
section('INTEGRIDADE DA ALLOWLIST — sem ampliação silenciosa');

// Para cada persona, verificar que nenhum módulo sensível foi liberado além dos legítimos
for (const [personaName, persona] of Object.entries(PERSONAS)) {
  const mods = dashboardAccessService.getAllowedModules(persona);
  const allowedSensitive = mods.filter(m => SENSITIVE_MODULES.includes(m));
  // Para financeiro: nenhum módulo sensível esperado
  if (personaName === 'FINANCEIRO') {
    assert(
      allowedSensitive.length === 0,
      `${personaName}: zero módulos sensíveis no payload`,
      { allowedSensitive, mods }
    );
  }
  // Para RH: nenhum módulo sensível operacional esperado (RH tem hr_intelligence via perfil)
  if (personaName === 'RH') {
    const unexpectedForRH = allowedSensitive.filter(m =>
      !['hr_intelligence', 'anomaly_detection', 'operational'].includes(m)
    );
    assert(
      unexpectedForRH.length === 0,
      `${personaName}: sem módulos sensíveis de outros domínios`,
      { unexpectedForRH, allowedSensitive }
    );
  }
  // Director_unassigned: profile de diretor genérico inclui hr_intelligence e anomaly_detection
  // por design (visão ampla de diretoria). Verificamos apenas os módulos que NÃO fazem sentido:
  // manuia (telemetry industrial de campo) e financial_intelligence (domínio financeiro específico).
  if (personaName === 'DIR_AMB') {
    const unexpectedForDir = allowedSensitive.filter(m =>
      ['manuia', 'financial_intelligence'].includes(m)
    );
    assert(
      unexpectedForDir.length === 0,
      `${personaName}: sem manuia nem financial_intelligence (módulos fora do escopo de diretoria geral)`,
      { unexpectedForDir }
    );
  }
}

// ─── Resultado ─────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`Resultado: ${_passed} passou, ${_failed} falhou`);
if (_failed > 0) {
  console.log('ATENÇÃO: Há falhas — revisar governança de acesso universal.');
  process.exit(1);
} else {
  console.log('✓ universal safe access modules successfully governed');
  process.exit(0);
}
