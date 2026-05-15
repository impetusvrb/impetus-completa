'use strict';

/**
 * IMPETUS — Executive Module Isolation Test Suite
 *
 * Valida que o CEO NÃO recebe Pró-Ação (proaction) em visible_modules,
 * enquanto TODOS os outros perfis mantêm acesso universal inalterado.
 *
 * Cobre:
 * - CEO sem proaction
 * - CEO com outros universais preservados
 * - Demais perfis com proaction intacto
 * - Regressão do menu lateral
 * - Regressão contextual
 * - Dashboard governance íntegro
 */

const dashboardAccessService = require('../services/dashboardAccessService');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(label);
    console.error(`  ✗ FAIL: ${label}`);
  }
}

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  IMPETUS — Executive Module Isolation Tests');
console.log('══════════════════════════════════════════════════════════════\n');

/* ============================================================
 * PERSONAS
 * ============================================================ */
const CEO = {
  id: 'ceo-001',
  name: 'CEO Teste',
  role: 'ceo',
  dashboard_profile: 'ceo_executive',
  functional_area: 'executive',
  permissions: [],
  hierarchy_level: 1,
  company_id: 'test-company'
};

const CEO_WITH_PERMS = {
  ...CEO,
  id: 'ceo-002',
  permissions: ['dashboard.view', 'VIEW_STRATEGIC', 'VIEW_FINANCIAL']
};

const CEO_ALIAS = {
  id: 'ceo-003',
  name: 'CEO Alias',
  role: 'ceo',
  dashboard_profile: 'ceo_executive',
  functional_area: 'executive',
  permissions: ['*'],
  hierarchy_level: 1,
  company_id: 'test-company'
};

const DIRETOR_INDUSTRIAL = {
  id: 'dir-001',
  name: 'Diretor Industrial',
  role: 'diretor',
  dashboard_profile: 'director_industrial',
  functional_area: 'industrial',
  permissions: [],
  hierarchy_level: 2,
  company_id: 'test-company'
};

const GERENTE_OPERACOES = {
  id: 'ger-001',
  name: 'Gerente Operações',
  role: 'gerente',
  dashboard_profile: 'manager_operations',
  functional_area: 'operations',
  permissions: [],
  hierarchy_level: 3,
  company_id: 'test-company'
};

const COORDENADOR = {
  id: 'coord-001',
  name: 'Coordenador Produção',
  role: 'coordenador',
  dashboard_profile: 'coordinator_production',
  functional_area: 'production',
  permissions: [],
  hierarchy_level: 3,
  company_id: 'test-company'
};

const SUPERVISOR = {
  id: 'sup-001',
  name: 'Supervisor Qualidade',
  role: 'supervisor',
  dashboard_profile: 'supervisor_quality',
  functional_area: 'quality',
  permissions: [],
  hierarchy_level: 4,
  company_id: 'test-company'
};

const RH = {
  id: 'rh-001',
  name: 'Analista RH',
  role: 'rh',
  dashboard_profile: 'hr_management',
  functional_area: 'hr',
  permissions: [],
  hierarchy_level: 3,
  company_id: 'test-company'
};

const OPERADOR = {
  id: 'op-001',
  name: 'Operador',
  role: 'operador',
  dashboard_profile: 'operator_floor',
  functional_area: 'production',
  permissions: [],
  hierarchy_level: 5,
  company_id: 'test-company'
};

const COLABORADOR = {
  id: 'col-001',
  name: 'Colaborador',
  role: 'colaborador',
  dashboard_profile: 'operational_base',
  functional_area: 'production',
  permissions: [],
  hierarchy_level: 5,
  company_id: 'test-company'
};

/* ============================================================
 * 1. CEO — NÃO vê Pró-Ação
 * ============================================================ */
console.log('── 1. CEO sem Pró-Ação ──');

const ceoModules = dashboardAccessService.getAllowedModules(CEO);
assert(!ceoModules.includes('proaction'), '1.1 CEO basic: proaction NOT in visible_modules');
assert(ceoModules.includes('dashboard'), '1.2 CEO basic: dashboard preservado');
assert(ceoModules.includes('registro_inteligente'), '1.3 CEO basic: registro_inteligente preservado');
assert(ceoModules.includes('cadastrar_com_ia'), '1.4 CEO basic: cadastrar_com_ia preservado');

const ceoPermsModules = dashboardAccessService.getAllowedModules(CEO_WITH_PERMS);
assert(!ceoPermsModules.includes('proaction'), '1.5 CEO com permissions: proaction NOT in visible_modules');
assert(ceoPermsModules.includes('registro_inteligente'), '1.6 CEO com permissions: registro_inteligente preservado');

const ceoAliasModules = dashboardAccessService.getAllowedModules(CEO_ALIAS);
assert(!ceoAliasModules.includes('proaction'), '1.7 CEO wildcard: proaction NOT in visible_modules');
assert(ceoAliasModules.includes('cadastrar_com_ia'), '1.8 CEO wildcard: cadastrar_com_ia preservado');

assert(!dashboardAccessService.canAccessModule(CEO, 'proaction'), '1.9 canAccessModule CEO proaction = false');
assert(dashboardAccessService.canAccessModule(CEO, 'dashboard'), '1.10 canAccessModule CEO dashboard = true');
assert(dashboardAccessService.canAccessModule(CEO, 'registro_inteligente'), '1.11 canAccessModule CEO registro_inteligente = true');

/* ============================================================
 * 2. Financeiro (diretor) — continua vendo
 * ============================================================ */
console.log('── 2. Financeiro/Diretor ──');

const diretorModules = dashboardAccessService.getAllowedModules(DIRETOR_INDUSTRIAL);
assert(diretorModules.includes('proaction'), '2.1 Diretor: proaction preservado');
assert(diretorModules.includes('registro_inteligente'), '2.2 Diretor: registro_inteligente preservado');
assert(diretorModules.includes('cadastrar_com_ia'), '2.3 Diretor: cadastrar_com_ia preservado');

/* ============================================================
 * 3. RH — continua vendo
 * ============================================================ */
console.log('── 3. RH ──');

const rhModules = dashboardAccessService.getAllowedModules(RH);
assert(rhModules.includes('proaction'), '3.1 RH: proaction preservado');
assert(rhModules.includes('registro_inteligente'), '3.2 RH: registro_inteligente preservado');
assert(rhModules.includes('cadastrar_com_ia'), '3.3 RH: cadastrar_com_ia preservado');

/* ============================================================
 * 4. Operações (gerente) — continua vendo
 * ============================================================ */
console.log('── 4. Operações ──');

const gerenteModules = dashboardAccessService.getAllowedModules(GERENTE_OPERACOES);
assert(gerenteModules.includes('proaction'), '4.1 Gerente: proaction preservado');
assert(gerenteModules.includes('registro_inteligente'), '4.2 Gerente: registro_inteligente preservado');

/* ============================================================
 * 5. Supervisor — continua vendo
 * ============================================================ */
console.log('── 5. Supervisor ──');

const supervisorModules = dashboardAccessService.getAllowedModules(SUPERVISOR);
assert(supervisorModules.includes('proaction'), '5.1 Supervisor: proaction preservado');
assert(supervisorModules.includes('registro_inteligente'), '5.2 Supervisor: registro_inteligente preservado');
assert(supervisorModules.includes('cadastrar_com_ia'), '5.3 Supervisor: cadastrar_com_ia preservado');

/* ============================================================
 * 6. Coordenador — continua vendo
 * ============================================================ */
console.log('── 6. Coordenador ──');

const coordModules = dashboardAccessService.getAllowedModules(COORDENADOR);
assert(coordModules.includes('proaction'), '6.1 Coordenador: proaction preservado');
assert(coordModules.includes('registro_inteligente'), '6.2 Coordenador: registro_inteligente preservado');

/* ============================================================
 * 7. Operador / Colaborador — continua vendo
 * ============================================================ */
console.log('── 7. Operador / Colaborador ──');

const operadorModules = dashboardAccessService.getAllowedModules(OPERADOR);
assert(operadorModules.includes('proaction'), '7.1 Operador: proaction preservado');
assert(operadorModules.includes('registro_inteligente'), '7.2 Operador: registro_inteligente preservado');

const colaboradorModules = dashboardAccessService.getAllowedModules(COLABORADOR);
assert(colaboradorModules.includes('proaction'), '7.3 Colaborador: proaction preservado');
assert(colaboradorModules.includes('cadastrar_com_ia'), '7.4 Colaborador: cadastrar_com_ia preservado');

/* ============================================================
 * 8. Regressão do menu lateral — nenhuma quebra
 * ============================================================ */
console.log('── 8. Regressão do menu lateral ──');

const allPersonas = [
  { persona: DIRETOR_INDUSTRIAL, label: 'Diretor' },
  { persona: GERENTE_OPERACOES, label: 'Gerente' },
  { persona: COORDENADOR, label: 'Coordenador' },
  { persona: SUPERVISOR, label: 'Supervisor' },
  { persona: RH, label: 'RH' },
  { persona: OPERADOR, label: 'Operador' },
  { persona: COLABORADOR, label: 'Colaborador' }
];

for (const { persona, label } of allPersonas) {
  const mods = dashboardAccessService.getAllowedModules(persona);
  assert(mods.includes('dashboard'), `8.R ${label}: dashboard presente`);
  assert(mods.includes('proaction'), `8.R ${label}: proaction universal preservado`);
  assert(mods.includes('registro_inteligente'), `8.R ${label}: registro_inteligente universal preservado`);
  assert(mods.includes('cadastrar_com_ia'), `8.R ${label}: cadastrar_com_ia universal preservado`);
}

/* ============================================================
 * 9. Regressão contextual — CEO preserva outros módulos
 * ============================================================ */
console.log('── 9. Regressão contextual CEO ──');

assert(ceoModules.length >= 3, '9.1 CEO tem pelo menos 3 módulos');
assert(!ceoModules.includes('proaction'), '9.2 Único módulo negado ao CEO é proaction');
const otherUniversals = ['registro_inteligente', 'cadastrar_com_ia'];
for (const u of otherUniversals) {
  assert(ceoModules.includes(u), `9.3 CEO mantém universal: ${u}`);
}

/* ============================================================
 * 10. Dashboard governance — CEO_DENIED_MODULES exportado
 * ============================================================ */
console.log('── 10. Governance metadata ──');

assert(dashboardAccessService.CEO_DENIED_MODULES instanceof Set, '10.1 CEO_DENIED_MODULES é um Set');
assert(dashboardAccessService.CEO_DENIED_MODULES.has('proaction'), '10.2 CEO_DENIED_MODULES contém proaction');
assert(dashboardAccessService.CEO_DENIED_MODULES.size === 1, '10.3 CEO_DENIED_MODULES contém APENAS proaction');
assert(dashboardAccessService.UNIVERSAL_SAFE_ACCESS_MODULES.includes('proaction'), '10.4 proaction continua na lista universal global');

/* ============================================================
 * RESUMO
 * ============================================================ */
console.log('\n══════════════════════════════════════════════════════════════');
console.log(`  RESULTADO: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('  FALHAS:');
  failures.forEach(f => console.log(`    - ${f}`));
}
console.log('══════════════════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
