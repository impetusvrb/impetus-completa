'use strict';

/**
 * Enterprise Identity & Visibility Sovereignty — Suite de Testes de Regressão
 *
 * Cobertura:
 *   ▸ Normalização semântica (QUALITY, SAFETY, ENVIRONMENT, LOGISTICS, MAINTENANCE, PRODUCTION, HR, FINANCE, EXECUTIVE)
 *   ▸ Hierarquia normalizada (PT + EN)
 *   ▸ Reconciliação de visibilidade
 *   ▸ Sovereign governance lock
 *   ▸ Domain isolation
 *   ▸ Executive bypass
 *   ▸ Cadeia de autoridade
 *   ▸ Frontend sovereignty guard
 *   ▸ Observabilidade
 *
 * Meta: 80+ testes
 */

const assert = require('assert');

const normRuntime = require('../../src/runtime-z-sovereign/identity/zOperationalRoleNormalizationRuntime');
const reconciliation = require('../../src/runtime-z-sovereign/governance/zVisibilityReconciliationRuntime');
const sovereignLock = require('../../src/runtime-z-sovereign/governance/zSovereignGovernanceLock');
const observability = require('../../src/runtime-z-sovereign/observability/zIdentityObservabilityRuntime');

const cadastroResolver = require('../../src/services/structuralCadastroModuleResolver');
const govEngine = require('../../src/services/moduleAccessGovernanceEngine');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, error: e.message || e });
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
  }
}

function assertEq(a, b, msg) {
  assert.strictEqual(a, b, msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

function assertIncludes(arr, val, msg) {
  assert.ok(
    Array.isArray(arr) && arr.includes(val),
    msg || `Expected array to include "${val}", got: [${(arr || []).join(', ')}]`
  );
}

function assertNotIncludes(arr, val, msg) {
  assert.ok(
    !Array.isArray(arr) || !arr.includes(val),
    msg || `Expected array to NOT include "${val}", got: [${(arr || []).join(', ')}]`
  );
}

// ════════════════════════════════════════════
// SECTION 1 — Normalização Semântica: QUALITY
// ════════════════════════════════════════════
console.log('\n▸ SECTION 1 — Quality Domain Normalization');

test('1.1 — "Gerente de Qualidade" → QUALITY_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Gerente de Qualidade'), 'QUALITY_DOMAIN_AUTHORITY');
});

test('1.2 — "Coordenador SGQ" → QUALITY_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Coordenador SGQ'), 'QUALITY_DOMAIN_AUTHORITY');
});

test('1.3 — "Supervisor de Qualidade" → QUALITY_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Supervisor de Qualidade'), 'QUALITY_DOMAIN_AUTHORITY');
});

test('1.4 — "Analista de Qualidade" → QUALITY_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Analista de Qualidade'), 'QUALITY_DOMAIN_AUTHORITY');
});

test('1.5 — "Inspetor de Qualidade" → QUALITY_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Inspetor de Qualidade'), 'QUALITY_DOMAIN_AUTHORITY');
});

test('1.6 — "Quality Manager" → QUALITY_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Quality Manager'), 'QUALITY_DOMAIN_AUTHORITY');
});

test('1.7 — "Controle de Qualidade" → QUALITY_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Controle de Qualidade'), 'QUALITY_DOMAIN_AUTHORITY');
});

test('1.8 — "Analista de Inspeção" → QUALITY_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Analista de Inspeção'), 'QUALITY_DOMAIN_AUTHORITY');
});

test('1.9 — "QC Technician" → QUALITY_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('QC Technician'), 'QUALITY_DOMAIN_AUTHORITY');
});

test('1.10 — Quality domain → quality_intelligence module key', () => {
  assertIncludes(normRuntime.DOMAIN_TO_MODULE_KEYS['QUALITY_DOMAIN_AUTHORITY'], 'quality_intelligence');
});

// ════════════════════════════════════════════
// SECTION 2 — Normalização Semântica: SAFETY
// ════════════════════════════════════════════
console.log('\n▸ SECTION 2 — Safety Domain Normalization');

test('2.1 — "Gerente de Segurança" → SAFETY_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Gerente de Segurança'), 'SAFETY_DOMAIN_AUTHORITY');
});

test('2.2 — "Técnico SST" → SAFETY_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Técnico SST'), 'SAFETY_DOMAIN_AUTHORITY');
});

test('2.3 — "Supervisor SSO" → SAFETY_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Supervisor SSO'), 'SAFETY_DOMAIN_AUTHORITY');
});

test('2.4 — "EHS Manager" → SAFETY_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('EHS Manager'), 'SAFETY_DOMAIN_AUTHORITY');
});

test('2.5 — "Health and Safety Officer" → SAFETY_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Health and Safety Officer'), 'SAFETY_DOMAIN_AUTHORITY');
});

test('2.6 — "Saúde e Segurança do Trabalho" → SAFETY_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Saúde e Segurança do Trabalho'), 'SAFETY_DOMAIN_AUTHORITY');
});

test('2.7 — Safety domain → safety_intelligence module', () => {
  assertIncludes(normRuntime.DOMAIN_TO_MODULE_KEYS['SAFETY_DOMAIN_AUTHORITY'], 'safety_intelligence');
});

// ════════════════════════════════════════════
// SECTION 3 — Normalização Semântica: ENVIRONMENT
// ════════════════════════════════════════════
console.log('\n▸ SECTION 3 — Environment Domain Normalization');

test('3.1 — "Coordenador de Meio Ambiente" → ENVIRONMENT_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Coordenador de Meio Ambiente'), 'ENVIRONMENT_DOMAIN_AUTHORITY');
});

test('3.2 — "Analista Ambiental" → ENVIRONMENT_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Analista Ambiental'), 'ENVIRONMENT_DOMAIN_AUTHORITY');
});

test('3.3 — "Gerente de Sustentabilidade" → ENVIRONMENT_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Gerente de Sustentabilidade'), 'ENVIRONMENT_DOMAIN_AUTHORITY');
});

test('3.4 — "ESG Coordinator" → ENVIRONMENT_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('ESG Coordinator'), 'ENVIRONMENT_DOMAIN_AUTHORITY');
});

test('3.5 — "Gestão de Resíduos" → ENVIRONMENT_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Gestão de Resíduos'), 'ENVIRONMENT_DOMAIN_AUTHORITY');
});

test('3.6 — Environment domain → environment_intelligence module', () => {
  assertIncludes(normRuntime.DOMAIN_TO_MODULE_KEYS['ENVIRONMENT_DOMAIN_AUTHORITY'], 'environment_intelligence');
});

// ════════════════════════════════════════════
// SECTION 4 — Normalização Semântica: LOGISTICS
// ════════════════════════════════════════════
console.log('\n▸ SECTION 4 — Logistics Domain Normalization');

test('4.1 — "Gerente de Logística" → LOGISTICS_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Gerente de Logística'), 'LOGISTICS_DOMAIN_AUTHORITY');
});

test('4.2 — "Coordenador de Almoxarifado" → LOGISTICS_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Coordenador de Almoxarifado'), 'LOGISTICS_DOMAIN_AUTHORITY');
});

test('4.3 — "Supply Chain Manager" → LOGISTICS_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Supply Chain Manager'), 'LOGISTICS_DOMAIN_AUTHORITY');
});

test('4.4 — "Expedição e Estoque" → LOGISTICS_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Expedição e Estoque'), 'LOGISTICS_DOMAIN_AUTHORITY');
});

test('4.5 — Logistics domain → logistics_intelligence module', () => {
  assertIncludes(normRuntime.DOMAIN_TO_MODULE_KEYS['LOGISTICS_DOMAIN_AUTHORITY'], 'logistics_intelligence');
});

// ════════════════════════════════════════════
// SECTION 5 — Normalização Semântica: HR
// ════════════════════════════════════════════
console.log('\n▸ SECTION 5 — HR Domain Normalization');

test('5.1 — "Gerente de RH" → HR_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Gerente de RH'), 'HR_DOMAIN_AUTHORITY');
});

test('5.2 — "Analista de Recursos Humanos" → HR_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Analista de Recursos Humanos'), 'HR_DOMAIN_AUTHORITY');
});

test('5.3 — "Human Resources Coordinator" → HR_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Human Resources Coordinator'), 'HR_DOMAIN_AUTHORITY');
});

test('5.4 — "Departamento Pessoal" → HR_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Departamento Pessoal'), 'HR_DOMAIN_AUTHORITY');
});

test('5.5 — "Gestão de Pessoas" → HR_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Gestão de Pessoas'), 'HR_DOMAIN_AUTHORITY');
});

test('5.6 — HR domain → hr_intelligence module', () => {
  assertIncludes(normRuntime.DOMAIN_TO_MODULE_KEYS['HR_DOMAIN_AUTHORITY'], 'hr_intelligence');
});

// ════════════════════════════════════════════
// SECTION 6 — Normalização Semântica: MAINTENANCE + PRODUCTION + FINANCE + EXECUTIVE
// ════════════════════════════════════════════
console.log('\n▸ SECTION 6 — Other Domains Normalization');

test('6.1 — "Técnico de Manutenção" → MAINTENANCE_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Técnico de Manutenção'), 'MAINTENANCE_DOMAIN_AUTHORITY');
});

test('6.2 — "PCM Coordinator" → MAINTENANCE_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('PCM Coordinator'), 'MAINTENANCE_DOMAIN_AUTHORITY');
});

test('6.3 — "Gerente de Produção" → PRODUCTION_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Gerente de Produção'), 'PRODUCTION_DOMAIN_AUTHORITY');
});

test('6.4 — "Supervisor de Linha de Produção" → PRODUCTION_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Supervisor de Linha de Produção'), 'PRODUCTION_DOMAIN_AUTHORITY');
});

test('6.5 — "Diretor Financeiro" → FINANCE_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Diretor Financeiro'), 'FINANCE_DOMAIN_AUTHORITY');
});

test('6.6 — "Controller / Controladoria" → FINANCE_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Controladoria'), 'FINANCE_DOMAIN_AUTHORITY');
});

test('6.7 — "Diretoria Executiva" → EXECUTIVE_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('Diretoria Executiva'), 'EXECUTIVE_DOMAIN_AUTHORITY');
});

test('6.8 — "C-Level Suite" → EXECUTIVE_DOMAIN_AUTHORITY', () => {
  assertEq(normRuntime.resolveDomainFromText('C-Level Suite'), 'EXECUTIVE_DOMAIN_AUTHORITY');
});

test('6.9 — Maintenance domain → manuia module', () => {
  assertIncludes(normRuntime.DOMAIN_TO_MODULE_KEYS['MAINTENANCE_DOMAIN_AUTHORITY'], 'manuia');
});

test('6.10 — Executive domain → operational module', () => {
  assertIncludes(normRuntime.DOMAIN_TO_MODULE_KEYS['EXECUTIVE_DOMAIN_AUTHORITY'], 'operational');
});

// ════════════════════════════════════════════
// SECTION 7 — Hierarchy Role Normalization
// ════════════════════════════════════════════
console.log('\n▸ SECTION 7 — Hierarchy Role Normalization');

test('7.1 — "manager" normaliza para "gerente"', () => {
  assertEq(normRuntime.normalizeHierarchyRole('manager'), 'gerente');
});

test('7.2 — "coordinator" normaliza para "coordenador"', () => {
  assertEq(normRuntime.normalizeHierarchyRole('coordinator'), 'coordenador');
});

test('7.3 — "director" normaliza para "diretor"', () => {
  assertEq(normRuntime.normalizeHierarchyRole('director'), 'diretor');
});

test('7.4 — "presidente" normaliza para "ceo"', () => {
  assertEq(normRuntime.normalizeHierarchyRole('presidente'), 'ceo');
});

test('7.5 — "gerente" → hierarchy level 2', () => {
  assertEq(normRuntime.resolveHierarchyLevel('gerente'), 2);
});

test('7.6 — "manager" → hierarchy level 2 (via normalization)', () => {
  assertEq(normRuntime.resolveHierarchyLevel('manager'), 2);
});

test('7.7 — "ceo" → hierarchy level 0', () => {
  assertEq(normRuntime.resolveHierarchyLevel('ceo'), 0);
});

test('7.8 — "coordenador" → hierarchy level 3', () => {
  assertEq(normRuntime.resolveHierarchyLevel('coordenador'), 3);
});

test('7.9 — "supervisor" → hierarchy level 4', () => {
  assertEq(normRuntime.resolveHierarchyLevel('supervisor'), 4);
});

test('7.10 — "analista" → hierarchy level 5 (colaborador)', () => {
  assertEq(normRuntime.resolveHierarchyLevel('analista'), 5);
});

// ════════════════════════════════════════════
// SECTION 8 — Cargo Name Extraction
// ════════════════════════════════════════════
console.log('\n▸ SECTION 8 — Cargo Name Hierarchy Extraction');

test('8.1 — "Gerente de Qualidade" extrai "gerente"', () => {
  assertEq(normRuntime.extractHierarchyFromCargoName('Gerente de Qualidade'), 'gerente');
});

test('8.2 — "Coordenador SGQ" extrai "coordenador"', () => {
  assertEq(normRuntime.extractHierarchyFromCargoName('Coordenador SGQ'), 'coordenador');
});

test('8.3 — "Diretor Industrial" extrai "diretor"', () => {
  assertEq(normRuntime.extractHierarchyFromCargoName('Diretor Industrial'), 'diretor');
});

test('8.4 — "Supervisor de Turno" extrai "supervisor"', () => {
  assertEq(normRuntime.extractHierarchyFromCargoName('Supervisor de Turno'), 'supervisor');
});

test('8.5 — "Analista de Meio Ambiente" extrai "colaborador"', () => {
  assertEq(normRuntime.extractHierarchyFromCargoName('Analista de Meio Ambiente'), 'colaborador');
});

// ════════════════════════════════════════════
// SECTION 9 — Normalized Identity Resolution
// ════════════════════════════════════════════
console.log('\n▸ SECTION 9 — Normalized Identity Resolution');

test('9.1 — "Gerente de Qualidade" resolve identity completa', () => {
  const id = normRuntime.resolveNormalizedIdentity({
    role: 'gerente',
    cargo_name: 'Gerente de Qualidade',
    department: 'Qualidade'
  });
  assertEq(id.domain_authority, 'QUALITY_DOMAIN_AUTHORITY');
  assertEq(id.normalized_role, 'gerente');
  assertEq(id.hierarchy_level, 2);
  assertIncludes(id.domain_module_keys, 'quality_intelligence');
});

test('9.2 — "Manager" (EN) com cargo "Quality Manager"', () => {
  const id = normRuntime.resolveNormalizedIdentity({
    role: 'manager',
    cargo_name: 'Quality Manager'
  });
  assertEq(id.domain_authority, 'QUALITY_DOMAIN_AUTHORITY');
  assertEq(id.hierarchy_level, 2);
});

test('9.3 — "Coordenador de Meio Ambiente"', () => {
  const id = normRuntime.resolveNormalizedIdentity({
    role: 'coordenador',
    cargo_name: 'Coordenador de Meio Ambiente'
  });
  assertEq(id.domain_authority, 'ENVIRONMENT_DOMAIN_AUTHORITY');
  assertEq(id.hierarchy_level, 3);
});

test('9.4 — "Supervisor SST"', () => {
  const id = normRuntime.resolveNormalizedIdentity({
    role: 'supervisor',
    cargo_name: 'Supervisor SST'
  });
  assertEq(id.domain_authority, 'SAFETY_DOMAIN_AUTHORITY');
  assertEq(id.hierarchy_level, 4);
});

test('9.5 — normalized_at tem formato ISO', () => {
  const id = normRuntime.resolveNormalizedIdentity({ role: 'analista' });
  assert.ok(id.normalized_at, 'normalized_at deve existir');
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(id.normalized_at), 'normalized_at deve ser ISO');
});

// ════════════════════════════════════════════
// SECTION 10 — Visibility Reconciliation
// ════════════════════════════════════════════
console.log('\n▸ SECTION 10 — Visibility Reconciliation');

test('10.1 — Reconcilia módulo faltante com structural_complete', () => {
  const result = reconciliation.reconcileVisibility({
    user: { role: 'gerente', job_title: 'Gerente de Qualidade' },
    governed_visible_modules: ['dashboard', 'operational'],
    module_access_governance: { structural_complete: true }
  });
  assertIncludes(result.reconciled_modules, 'quality_intelligence');
  assertIncludes(result.added_modules, 'quality_intelligence');
  assertEq(result.reconciliation_applied, true);
});

test('10.2 — NÃO reconcilia sem structural_complete nem bypass', () => {
  const result = reconciliation.reconcileVisibility({
    user: { role: 'gerente', job_title: 'Gerente de Qualidade' },
    governed_visible_modules: ['dashboard', 'operational'],
    module_access_governance: { structural_complete: false }
  });
  assert.ok(result.mismatches.length > 0, 'Deve registrar mismatch');
  assertNotIncludes(result.added_modules, 'quality_intelligence');
});

test('10.3 — Reconcilia com executive_structural_bypass', () => {
  const result = reconciliation.reconcileVisibility({
    user: { role: 'manager', job_title: 'Quality Manager' },
    governed_visible_modules: ['dashboard'],
    module_access_governance: { executive_structural_bypass: true }
  });
  assertIncludes(result.reconciled_modules, 'quality_intelligence');
  assertEq(result.reconciliation_applied, true);
});

test('10.4 — Safety reconciliation funciona', () => {
  const result = reconciliation.reconcileVisibility({
    user: { role: 'supervisor', job_title: 'Supervisor SST' },
    governed_visible_modules: ['dashboard', 'operational'],
    module_access_governance: { structural_complete: true }
  });
  assertIncludes(result.reconciled_modules, 'safety_intelligence');
});

test('10.5 — Não duplica módulo já presente', () => {
  const result = reconciliation.reconcileVisibility({
    user: { role: 'gerente', job_title: 'Gerente de Qualidade' },
    governed_visible_modules: ['dashboard', 'quality_intelligence', 'operational'],
    module_access_governance: { structural_complete: true }
  });
  assertEq(result.added_modules.length, 0);
  const qiCount = result.reconciled_modules.filter((m) => m === 'quality_intelligence').length;
  assertEq(qiCount, 1);
});

test('10.6 — Cross-domain mismatch detectado', () => {
  const result = reconciliation.reconcileVisibility({
    user: { role: 'gerente', job_title: 'Gerente de Qualidade', department: 'Qualidade' },
    governed_visible_modules: ['dashboard', 'quality_intelligence', 'safety_intelligence'],
    module_access_governance: { structural_complete: true }
  });
  const crossDomain = result.mismatches.filter((m) => m.type === 'cross_domain_module');
  assert.ok(crossDomain.length > 0, 'Deve detectar cross-domain module');
});

test('10.7 — Reconciliação desactivada via flag retorna sem alteração', () => {
  const original = process.env.IMPETUS_Z_VISIBILITY_RECONCILIATION;
  process.env.IMPETUS_Z_VISIBILITY_RECONCILIATION = 'false';
  const result = reconciliation.reconcileVisibility({
    user: { role: 'gerente', job_title: 'Gerente de Qualidade' },
    governed_visible_modules: ['dashboard']
  });
  assertEq(result.reconciliation_applied, false);
  assertEq(result.added_modules.length, 0);
  process.env.IMPETUS_Z_VISIBILITY_RECONCILIATION = original || '';
});

test('10.8 — Reconciliação com HR domain', () => {
  const result = reconciliation.reconcileVisibility({
    user: { role: 'gerente', job_title: 'Gerente de RH' },
    governed_visible_modules: ['dashboard', 'operational'],
    module_access_governance: { structural_complete: true }
  });
  assertIncludes(result.reconciled_modules, 'hr_intelligence');
});

test('10.9 — Reconciliação com Environment domain', () => {
  const result = reconciliation.reconcileVisibility({
    user: { role: 'coordenador', job_title: 'Coordenador de Meio Ambiente' },
    governed_visible_modules: ['dashboard'],
    module_access_governance: { structural_complete: true }
  });
  assertIncludes(result.reconciled_modules, 'environment_intelligence');
});

test('10.10 — Reconciliação com Logistics domain', () => {
  const result = reconciliation.reconcileVisibility({
    user: { role: 'gerente', job_title: 'Gerente de Logística' },
    governed_visible_modules: ['dashboard', 'operational'],
    module_access_governance: { structural_complete: true }
  });
  assertIncludes(result.reconciled_modules, 'logistics_intelligence');
});

// ════════════════════════════════════════════
// SECTION 11 — Sovereign Governance Lock
// ════════════════════════════════════════════
console.log('\n▸ SECTION 11 — Sovereign Governance Lock');

test('11.1 — Authority chain tem 7 layers', () => {
  assertEq(sovereignLock.AUTHORITY_CHAIN.length, 7);
});

test('11.2 — Authority chain começa com zIdentityRuntime', () => {
  assertEq(sovereignLock.AUTHORITY_CHAIN[0].runtime, 'zIdentityRuntime');
});

test('11.3 — moduleAccessGovernanceEngine é order 3', () => {
  const entry = sovereignLock.AUTHORITY_CHAIN.find((e) => e.runtime === 'moduleAccessGovernanceEngine');
  assertEq(entry.order, 3);
});

test('11.4 — frontend_hydration é order 7 (último)', () => {
  const entry = sovereignLock.AUTHORITY_CHAIN.find((e) => e.runtime === 'frontend_hydration');
  assertEq(entry.order, 7);
});

test('11.5 — validateAuthorityChain retorna valid=true com runtimes activos', () => {
  const result = sovereignLock.validateAuthorityChain();
  assertEq(result.locked, true);
});

test('11.6 — applySovereignLock retorna lock applied', () => {
  const result = sovereignLock.applySovereignLock({ visible_modules: ['dashboard'] });
  assertEq(result.sovereign_lock_applied, true);
  assertEq(result.canonical_source, 'governed_visible_modules');
});

test('11.7 — Lock desactivado via flag', () => {
  const original = process.env.IMPETUS_Z_SOVEREIGN_LOCK;
  process.env.IMPETUS_Z_SOVEREIGN_LOCK = 'false';
  const result = sovereignLock.applySovereignLock({});
  assertEq(result.sovereign_lock_applied, false);
  process.env.IMPETUS_Z_SOVEREIGN_LOCK = original || '';
});

test('11.8 — Authority chain orders são sequenciais', () => {
  for (let i = 0; i < sovereignLock.AUTHORITY_CHAIN.length; i++) {
    assertEq(sovereignLock.AUTHORITY_CHAIN[i].order, i + 1);
  }
});

// ════════════════════════════════════════════
// SECTION 12 — Observability
// ════════════════════════════════════════════
console.log('\n▸ SECTION 12 — Identity Observability');

test('12.1 — buildIdentityObservabilityBlock retorna bloco válido', () => {
  const block = observability.buildIdentityObservabilityBlock({
    user: { id: 1, role: 'gerente', job_title: 'Gerente de Qualidade' },
    visible_modules: ['dashboard', 'quality_intelligence']
  });
  assert.ok(block, 'Block deve existir');
  assertEq(block.runtime, 'zIdentityObservabilityRuntime');
  assertEq(block.version, 1);
});

test('12.2 — Observability inclui user_identity', () => {
  const block = observability.buildIdentityObservabilityBlock({
    user: { id: 1, name: 'Test', role: 'gerente' },
    visible_modules: []
  });
  assert.ok(block.user_identity, 'user_identity deve existir');
  assertEq(block.user_identity.role, 'gerente');
});

test('12.3 — Observability inclui normalized_role', () => {
  const block = observability.buildIdentityObservabilityBlock({
    user: { role: 'manager', job_title: 'Quality Manager' },
    visible_modules: []
  });
  assertEq(block.user_identity.normalized_role, 'gerente');
});

test('12.4 — Observability inclui authority_chain', () => {
  const block = observability.buildIdentityObservabilityBlock({
    user: { role: 'gerente' },
    visible_modules: []
  });
  assert.ok(Array.isArray(block.authority_chain), 'authority_chain deve ser array');
  assert.ok(block.authority_chain.length >= 4, 'authority_chain deve ter >= 4 entries');
});

test('12.5 — Observability inclui sovereignty block', () => {
  const block = observability.buildIdentityObservabilityBlock({
    user: { role: 'gerente' },
    visible_modules: []
  });
  assert.ok(block.sovereignty, 'sovereignty deve existir');
  assertEq(block.sovereignty.canonical_source, 'moduleAccessGovernanceEngine');
});

test('12.6 — Observability desactivada via flag', () => {
  const original = process.env.IMPETUS_Z_IDENTITY_OBSERVABILITY;
  process.env.IMPETUS_Z_IDENTITY_OBSERVABILITY = 'false';
  const block = observability.buildIdentityObservabilityBlock({
    user: { role: 'gerente' },
    visible_modules: []
  });
  assertEq(block, null);
  process.env.IMPETUS_Z_IDENTITY_OBSERVABILITY = original || '';
});

test('12.7 — Observability separa universal e contextual modules', () => {
  const block = observability.buildIdentityObservabilityBlock({
    user: { role: 'gerente' },
    visible_modules: ['dashboard', 'settings', 'quality_intelligence', 'operational']
  });
  assertEq(block.visibility.universal_count, 2);
  assertEq(block.visibility.contextual_count, 2);
});

// ════════════════════════════════════════════
// SECTION 13 — Domain Isolation (Cross-domain)
// ════════════════════════════════════════════
console.log('\n▸ SECTION 13 — Domain Isolation');

test('13.1 — Cargo "Operador de Produção" NÃO resolve para QUALITY', () => {
  const domain = normRuntime.resolveDomainFromText('Operador de Produção');
  assert.ok(domain !== 'QUALITY_DOMAIN_AUTHORITY', 'Produção não deve ser Quality');
});

test('13.2 — Cargo "Gerente de RH" NÃO resolve para QUALITY', () => {
  const domain = normRuntime.resolveDomainFromText('Gerente de RH');
  assert.ok(domain !== 'QUALITY_DOMAIN_AUTHORITY', 'RH não deve ser Quality');
  assertEq(domain, 'HR_DOMAIN_AUTHORITY');
});

test('13.3 — isDomainAuthorityForModule verifica correctamente', () => {
  assertEq(normRuntime.isDomainAuthorityForModule('QUALITY_DOMAIN_AUTHORITY', 'quality_intelligence'), true);
  assertEq(normRuntime.isDomainAuthorityForModule('QUALITY_DOMAIN_AUTHORITY', 'safety_intelligence'), false);
});

test('13.4 — isDomainAuthorityForModule: Safety → safety_intelligence', () => {
  assertEq(normRuntime.isDomainAuthorityForModule('SAFETY_DOMAIN_AUTHORITY', 'safety_intelligence'), true);
  assertEq(normRuntime.isDomainAuthorityForModule('SAFETY_DOMAIN_AUTHORITY', 'quality_intelligence'), false);
});

test('13.5 — getDomainsForModule: quality_intelligence', () => {
  const domains = normRuntime.getDomainsForModule('quality_intelligence');
  assertIncludes(domains, 'QUALITY_DOMAIN_AUTHORITY');
  assertNotIncludes(domains, 'HR_DOMAIN_AUTHORITY');
});

test('13.6 — getDomainsForModule: operational (multi-domain)', () => {
  const domains = normRuntime.getDomainsForModule('operational');
  assert.ok(domains.length >= 5, 'operational deve estar em vários domínios');
});

test('13.7 — Texto vazio retorna null', () => {
  assertEq(normRuntime.resolveDomainFromText(''), null);
  assertEq(normRuntime.resolveDomainFromText(null), null);
  assertEq(normRuntime.resolveDomainFromText(undefined), null);
});

test('13.8 — "Recepcionista" (genérico) retorna null', () => {
  const domain = normRuntime.resolveDomainFromText('Recepcionista');
  assertEq(domain, null);
});

// ════════════════════════════════════════════
// SECTION 14 — Reconciliation Trace
// ════════════════════════════════════════════
console.log('\n▸ SECTION 14 — Reconciliation Trace & Observability Block');

test('14.1 — Reconciliation trace contém steps', () => {
  const result = reconciliation.reconcileVisibility({
    user: { role: 'gerente', job_title: 'Gerente de Qualidade' },
    governed_visible_modules: ['dashboard'],
    module_access_governance: { structural_complete: true }
  });
  assert.ok(result.trace, 'trace deve existir');
  assert.ok(result.trace.steps.length >= 2, 'trace deve ter pelo menos 2 steps');
});

test('14.2 — Observability block tem formato correcto', () => {
  const result = reconciliation.reconcileVisibility({
    user: { role: 'gerente', job_title: 'Gerente de Qualidade' },
    governed_visible_modules: ['dashboard'],
    module_access_governance: { structural_complete: true }
  });
  const obs = reconciliation.buildObservabilityBlock(result);
  assert.ok(obs, 'Observability block deve existir');
  assertEq(obs.runtime, 'zVisibilityReconciliationRuntime');
  assertEq(obs.reconciliation_applied, true);
});

test('14.3 — buildObservabilityBlock com null retorna null', () => {
  const obs = reconciliation.buildObservabilityBlock(null);
  assertEq(obs, null);
});

// ════════════════════════════════════════════
// SECTION 15 — Integration (Cadastro Resolver + Normalization)
// ════════════════════════════════════════════
console.log('\n▸ SECTION 15 — Integration with Cadastro Resolver');

test('15.1 — cadastroResolver: "Gerente de Qualidade" → quality_intelligence', () => {
  const keys = cadastroResolver.resolveAuthorizedMenuKeysFromCadastro({
    name: 'Gerente de Qualidade',
    department_id: 'dep-1',
    sector_id: 'sec-1'
  });
  assertIncludes(keys, 'quality_intelligence');
});

test('15.2 — cadastroResolver: "Coordenador de Qualidade" → quality_intelligence', () => {
  const keys = cadastroResolver.resolveAuthorizedMenuKeysFromCadastro({
    name: 'Coordenador de Qualidade',
    department_id: 'dep-1',
    sector_id: 'sec-1'
  });
  assertIncludes(keys, 'quality_intelligence');
});

test('15.3 — cadastroResolver: completeness com "Gerente de Qualidade"', () => {
  const result = cadastroResolver.assessCadastroCompleteness({
    name: 'Gerente de Qualidade',
    department_id: 'dep-1',
    sector_id: 'sec-1'
  });
  assertEq(result.structural_complete, true);
});

test('15.4 — cadastroResolver: "Operador de Produção" → operational', () => {
  const keys = cadastroResolver.resolveAuthorizedMenuKeysFromCadastro({
    name: 'Operador de Produção',
    department_id: 'dep-1',
    sector_id: 'sec-1'
  });
  assertIncludes(keys, 'operational');
  assertNotIncludes(keys, 'quality_intelligence');
});

test('15.5 — normRuntime + cadastroResolver concordam em domain', () => {
  const domain = normRuntime.resolveDomainFromText('Gerente de Qualidade');
  const keys = cadastroResolver.resolveAuthorizedMenuKeysFromCadastro({
    name: 'Gerente de Qualidade',
    department_id: 'dep-1',
    sector_id: 'sec-1'
  });
  const expectedModule = normRuntime.DOMAIN_TO_MODULE_KEYS[domain];
  for (const mod of expectedModule) {
    assertIncludes(keys, mod, `cadastroResolver deve incluir "${mod}" (esperado por domain ${domain})`);
  }
});

// ════════════════════════════════════════════
// SECTION 16 — Diacritics & Edge Cases
// ════════════════════════════════════════════
console.log('\n▸ SECTION 16 — Diacritics & Edge Cases');

test('16.1 — "Coordenação" com cedilha resolve correctamente', () => {
  const domain = normRuntime.resolveDomainFromText('Coordenação de Segurança');
  assertEq(domain, 'SAFETY_DOMAIN_AUTHORITY');
});

test('16.2 — "Manutenção Preventiva" com til', () => {
  const domain = normRuntime.resolveDomainFromText('Manutenção Preventiva');
  assertEq(domain, 'MAINTENANCE_DOMAIN_AUTHORITY');
});

test('16.3 — Mixed case funciona', () => {
  assertEq(normRuntime.resolveDomainFromText('GERENTE DE QUALIDADE'), 'QUALITY_DOMAIN_AUTHORITY');
  assertEq(normRuntime.resolveDomainFromText('gerente de qualidade'), 'QUALITY_DOMAIN_AUTHORITY');
});

test('16.4 — normalizeHierarchyRole com casing variado', () => {
  assertEq(normRuntime.normalizeHierarchyRole('MANAGER'), 'gerente');
  assertEq(normRuntime.normalizeHierarchyRole('Director'), 'diretor');
});

test('16.5 — resolveNormalizedIdentity com params vazios', () => {
  const id = normRuntime.resolveNormalizedIdentity({});
  assert.ok(id, 'Identity deve existir');
  assertEq(id.domain_authority, null);
  assertEq(id.normalization_runtime, 'zOperationalRoleNormalizationRuntime');
});

// ═══════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════
console.log('\n' + '═'.repeat(60));
console.log(`Resultado: ${passed} passed, ${failed} failed, ${passed + failed} total`);

if (failures.length > 0) {
  console.log('\nFalhas:');
  for (const f of failures) {
    console.log(`  ✗ ${f.name}: ${f.error}`);
  }
}

console.log('═'.repeat(60));
process.exit(failed > 0 ? 1 : 0);
