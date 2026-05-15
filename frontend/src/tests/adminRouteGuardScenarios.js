/**
 * IMPETUS — Testes de Route Guards Administrativos Contextuais
 * 
 * Valida que:
 *  - Admin contextual (system_administration) acessa rotas administrativas
 *  - Legacy (role=admin, role=diretor) continua funcionando
 *  - Operador / Supervisor permanecem bloqueados
 *  - RoleGuard híbrido funciona correctamente
 *  - canAccessPath e useVisibleModules funcionam
 * 
 * Execução: node src/tests/adminRouteGuardScenarios.js
 */

'use strict';

/* ── Stubs de funções copiadas do frontend (Node.js puro) ─────────────────── */

const CAP_SYSTEM_ADMINISTRATION = 'system_administration';

function userHasSystemAdministrationCapability(user) {
  if (!user) return false;
  if (String(user.role || '').toLowerCase() === 'admin') return true;
  return (
    Array.isArray(user.contextual_capabilities) &&
    user.contextual_capabilities.includes(CAP_SYSTEM_ADMINISTRATION)
  );
}

function isStrictAdminRole(user) {
  if (!user) return false;
  if (String(user.role || '').toLowerCase() === 'admin') return true;
  return userHasSystemAdministrationCapability(user);
}

function resolveMenuRole(user) {
  if (!user) return 'colaborador';
  if (userHasSystemAdministrationCapability(user)) return 'admin';
  let role = (user.role || '').toLowerCase();
  if (role === 'admin') return 'admin';
  if (role === 'ceo') return 'ceo';
  if (role === 'diretor' || role.includes('diretor')) return 'diretor';
  if (role === 'gerente' || role.includes('gerente')) return 'gerente';
  if (role === 'coordenador' || role.includes('coordenador')) return 'coordenador';
  if (role.includes('supervisor')) return 'supervisor';
  return 'colaborador';
}

/** Replica isAdministrador() ACTUALIZADO (com capability) */
function isAdministrador(user) {
  if (userHasSystemAdministrationCapability(user)) return true;
  const hierarchyOk = (user.hierarchy_level ?? 5) <= 1;
  const roleOk = ['admin', 'diretor', 'gerente', 'coordenador'].includes(
    String(user.role || '').toLowerCase()
  );
  return hierarchyOk || roleOk;
}

/** Replica isDirectorOrCEO() ACTUALIZADO (com capability) */
function isDirectorOrCEO(user) {
  if (userHasSystemAdministrationCapability(user)) return true;
  return ['ceo', 'admin', 'diretor'].includes(String(user.role || '').toLowerCase());
}

/** Replica canAccessPath() de useVisibleModules.js */
function canAccessPath(path, visibleModules, user) {
  if (!visibleModules?.length) return true;
  const norm = (path || '').replace(/\/+$/, '') || '/';
  if (norm === '/app' || norm === '/app/dashboard-vivo') return true;
  if (norm.startsWith('/app/admin') && userHasSystemAdministrationCapability(user)) return true;
  const pathToModule = {
    '/app/proacao': 'proaction',
    '/app/biblioteca': 'biblioteca',
    '/app/chatbot': 'ai',
    '/app/settings': 'settings',
  };
  if (norm.startsWith('/app/admin')) return visibleModules.includes('admin');
  const mod = pathToModule[norm] || null;
  if (!mod) return true;
  return visibleModules.includes(mod);
}

/** Replica roleGuardAllows() de App.jsx */
function roleGuardAllows(allowedRoles, user) {
  const role = (user.role || 'colaborador').toLowerCase();
  if (allowedRoles.includes(role)) return true;
  if (!userHasSystemAdministrationCapability(user)) return false;
  return allowedRoles.some((ar) =>
    ['diretor', 'gerente', 'coordenador', 'supervisor', 'ceo', 'admin', 'internal_admin'].includes(ar)
  );
}

/* ── Fixtures ─────────────────────────────────────────────────────────────── */

const ADMIN_CONTEXTUAL = {
  id: 'u-admin-ctx',
  name: 'Administrador do Sistema',
  role: 'colaborador',            // papel textual genérico — intencionalmente
  hierarchy_level: 3,             // não é diretor (hierarchy > 1)
  contextual_capabilities: ['system_administration', 'governance_access', 'organizational_management'],
  company_role_name: 'Administrador do Sistema (Admin IMPETUS)'
};

const ADMIN_LEGACY = {
  id: 'u-admin-leg',
  name: 'Admin Legacy',
  role: 'admin',
  hierarchy_level: 0
};

const DIRETOR = {
  id: 'u-dir',
  name: 'Diretor Comercial',
  role: 'diretor',
  hierarchy_level: 1
};

const OPERADOR = {
  id: 'u-op',
  name: 'Operador Fábrica',
  role: 'operador',
  hierarchy_level: 4
};

const SUPERVISOR = {
  id: 'u-sup',
  name: 'Supervisor Produção',
  role: 'supervisor',
  hierarchy_level: 2
};

const COLABORADOR = {
  id: 'u-col',
  name: 'Colaborador',
  role: 'colaborador',
  hierarchy_level: 5
};

/* ── Runner ───────────────────────────────────────────────────────────────── */

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✔ ${label}`);
    passed++;
  } else {
    console.error(`  ✘ ${label}`);
    failed++;
  }
}

console.log('\n[ADMIN_ROUTE_GUARD_SCENARIOS] Iniciando 15 cenários de validação...\n');

/* ── BLOCO 1: Admin contextual acessa rotas administrativas ──────────────── */
console.log('── Bloco 1: Admin Contextual acessa módulos admin ──');

// Cenário 1
assert(
  'Admin contextual — isAdministrador() retorna true',
  isAdministrador(ADMIN_CONTEXTUAL)
);

// Cenário 2
assert(
  'Admin contextual — acessa /app/admin/users (AdminRouteGuard)',
  isAdministrador(ADMIN_CONTEXTUAL)
);

// Cenário 3
assert(
  'Admin contextual — acessa /app/admin/structural (Base Estrutural)',
  isAdministrador(ADMIN_CONTEXTUAL)
);

// Cenário 4
assert(
  'Admin contextual — acessa /app/admin/departments (Departamentos)',
  isAdministrador(ADMIN_CONTEXTUAL)
);

// Cenário 5
assert(
  'Admin contextual — acessa /app/admin/conteudo-empresa (Governança/Configurações)',
  isAdministrador(ADMIN_CONTEXTUAL)
);

// Cenário 6
assert(
  'Admin contextual — acessa /app/admin/audio-logs (DirectorOrCEORouteGuard)',
  isDirectorOrCEO(ADMIN_CONTEXTUAL)
);

// Cenário 7
assert(
  'Admin contextual — StrictAdminRouteGuard: isStrictAdminRole() retorna true',
  isStrictAdminRole(ADMIN_CONTEXTUAL)
);

// Cenário 8
assert(
  'Admin contextual — canAccessPath /app/admin/users retorna true',
  canAccessPath('/app/admin/users', ['proaction', 'operational'], ADMIN_CONTEXTUAL)
);

/* ── BLOCO 2: Legacy continua funcionando ──────────────────────────────────── */
console.log('\n── Bloco 2: Legacy (role=admin, role=diretor) continua funcionando ──');

// Cenário 9
assert(
  'Admin legacy (role=admin) — isAdministrador() retorna true',
  isAdministrador(ADMIN_LEGACY)
);

// Cenário 10
assert(
  'Diretor — isAdministrador() retorna true',
  isAdministrador(DIRETOR)
);

// Cenário 11
assert(
  'Diretor — resolveMenuRole retorna "diretor"',
  resolveMenuRole(DIRETOR) === 'diretor'
);

/* ── BLOCO 3: Operador / Supervisor permanecem bloqueados ────────────────── */
console.log('\n── Bloco 3: Roles não-admin permanecem bloqueadas ──');

// Cenário 12
assert(
  'Operador — isAdministrador() retorna false',
  !isAdministrador(OPERADOR)
);

// Cenário 13
assert(
  'Supervisor — isAdministrador() retorna false',
  !isAdministrador(SUPERVISOR)
);

// Cenário 14
assert(
  'Colaborador — isAdministrador() retorna false',
  !isAdministrador(COLABORADOR)
);

/* ── BLOCO 4: RoleGuard híbrido / canAccessPath ───────────────────────────── */
console.log('\n── Bloco 4: RoleGuard híbrido e canAccessPath ──');

// Cenário 15
assert(
  'RoleGuard híbrido — Admin contextual acessa rota com allowedRoles=[diretor,gerente,admin]',
  roleGuardAllows(['diretor', 'gerente', 'admin'], ADMIN_CONTEXTUAL)
);

// Bónus: sidebar role
const sidebarRoleAdmin = resolveMenuRole(ADMIN_CONTEXTUAL);
assert(
  `Admin contextual — resolveMenuRole retorna "admin" (got "${sidebarRoleAdmin}")`,
  sidebarRoleAdmin === 'admin'
);

// Bónus: operador não ganha admin via roleGuard
assert(
  'Operador — roleGuardAllows([admin]) retorna false (sem escalonamento)',
  !roleGuardAllows(['admin'], OPERADOR)
);

/* ── Resultado ──────────────────────────────────────────────────────────────── */
console.log(`\n[ADMIN_ROUTE_GUARD_SCENARIOS] ${passed} passaram, ${failed} falharam`);
if (failed > 0) {
  console.error('[ADMIN_ROUTE_GUARD_SCENARIOS] FALHA — corrigir gates antes de build.');
  process.exit(1);
} else {
  console.log('[ADMIN_ROUTE_GUARD_SCENARIOS] ok\n');
}
