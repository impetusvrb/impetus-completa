'use strict';

/**
 * Derivação de capabilities sem migração de BD.
 *
 * As capabilities V2 são um superset declarativo das `permissions` actuais,
 * derivado de `(role, function_type, axes_priority, permissions)`. O Motor A
 * continua a usar `user.permissions` cru — esta camada é aditiva e usada
 * apenas pelo Motor B / V2.
 *
 * Capabilities canónicas (12):
 *   view:operational  view:financial  view:hr  view:strategic
 *   view:audit  view:safety  view:quality  view:logistics
 *   act:approve  act:execute  act:configure
 *   data:export  data:cross_sector
 *
 * Mapa permissions → capabilities ('+' adiciona, '-' nunca remove):
 *   *                  → todas
 *   VIEW_STRATEGIC     → view:strategic
 *   VIEW_FINANCIAL     → view:financial
 *   VIEW_AUDIT_LOGS    → view:audit
 *   MANAGE_USERS       → act:configure
 *   etc.
 */

const ALL_CAPABILITIES = Object.freeze([
  'view:operational',
  'view:financial',
  'view:hr',
  'view:strategic',
  'view:audit',
  'view:safety',
  'view:quality',
  'view:logistics',
  'view:maintenance',
  'act:approve',
  'act:execute',
  'act:configure',
  'data:export',
  'data:cross_sector'
]);

/**
 * Mapa explícito role/function → capabilities implícitas.
 * Default-deny: o que não está aqui não é concedido implicitamente.
 */
const IMPLICIT_BY_FUNCTION_AREA = Object.freeze({
  decisao_estrategica: {
    // Domínio financeiro: visão financeira + auditoria + operacional (KPIs/custos) — sem manutenção/RH implícitos
    finance:      ['view:financial', 'view:strategic', 'view:operational', 'view:audit', 'act:approve', 'data:export', 'data:cross_sector'],
    operations:   ['view:operational', 'view:strategic', 'view:financial', 'view:safety', 'view:quality', 'view:maintenance', 'act:approve', 'data:cross_sector'],
    industrial:   ['view:operational', 'view:strategic', 'view:financial', 'view:maintenance', 'view:safety', 'view:quality', 'act:approve', 'data:cross_sector'],
    production:   ['view:operational', 'view:strategic', 'view:quality', 'act:approve', 'data:cross_sector'],
    maintenance:  ['view:maintenance', 'view:operational', 'view:strategic', 'view:safety', 'act:approve', 'data:cross_sector'],
    quality:      ['view:quality', 'view:strategic', 'view:operational', 'act:approve', 'data:cross_sector'],
    hr:           ['view:hr', 'view:strategic', 'view:operational', 'act:approve', 'data:cross_sector'],
    pcp:          ['view:operational', 'view:strategic', 'act:approve'],
    admin:        ['view:operational', 'view:strategic', 'view:audit', 'act:approve', 'act:configure', 'data:export', 'data:cross_sector'],
    _default:     ['view:operational', 'view:strategic']
  },
  analise: {
    finance:      ['view:financial', 'view:operational', 'data:export'],
    operations:   ['view:operational', 'view:strategic', 'data:export'],
    industrial:   ['view:operational', 'view:maintenance', 'data:export'],
    production:   ['view:operational', 'view:quality'],
    maintenance:  ['view:maintenance', 'view:operational', 'view:safety'],
    quality:      ['view:quality', 'view:operational'],
    hr:           ['view:hr', 'view:operational', 'data:export'],
    pcp:          ['view:operational'],
    admin:        ['view:operational', 'view:audit', 'act:configure'],
    _default:     ['view:operational']
  },
  supervisao: {
    finance:      ['view:financial', 'view:operational'],
    operations:   ['view:operational', 'view:safety'],
    industrial:   ['view:operational', 'view:maintenance', 'view:safety'],
    production:   ['view:operational', 'view:quality', 'view:safety'],
    maintenance:  ['view:maintenance', 'view:operational', 'view:safety', 'act:execute'],
    quality:      ['view:quality', 'view:operational'],
    hr:           ['view:hr', 'view:operational'],
    pcp:          ['view:operational'],
    admin:        ['view:operational', 'view:safety'],
    _default:     ['view:operational']
  },
  execucao: {
    finance:      ['view:financial'],
    operations:   ['view:operational', 'act:execute'],
    industrial:   ['view:operational', 'view:maintenance', 'act:execute'],
    production:   ['view:operational', 'act:execute'],
    maintenance:  ['view:maintenance', 'view:operational', 'act:execute'],
    quality:      ['view:quality', 'act:execute'],
    hr:           ['view:hr', 'view:operational'],
    pcp:          ['view:operational'],
    admin:        ['view:operational'],
    _default:     ['view:operational', 'act:execute']
  },
  governanca: {
    finance:      ['view:financial', 'view:audit', 'data:export'],
    operations:   ['view:operational', 'view:audit'],
    industrial:   ['view:operational', 'view:audit', 'view:safety'],
    production:   ['view:operational', 'view:audit', 'view:quality'],
    maintenance:  ['view:maintenance', 'view:audit', 'view:safety'],
    quality:      ['view:quality', 'view:audit'],
    hr:           ['view:hr', 'view:operational', 'view:audit'],
    pcp:          ['view:operational', 'view:audit'],
    admin:        ['view:operational', 'view:audit', 'view:strategic', 'act:configure', 'data:export'],
    _default:     ['view:operational', 'view:audit']
  }
});

/**
 * Mapeamento permissions cru → capabilities. Não bloqueia; só amplia.
 */
const PERMISSION_TO_CAPABILITIES = Object.freeze({
  '*':                ALL_CAPABILITIES.slice(),
  VIEW_STRATEGIC:     ['view:strategic'],
  VIEW_FINANCIAL:     ['view:financial'],
  VIEW_OPERATIONAL:   ['view:operational'],
  VIEW_AUDIT_LOGS:    ['view:audit'],
  VIEW_SAFETY:        ['view:safety'],
  VIEW_QUALITY:       ['view:quality'],
  VIEW_HR:            ['view:hr'],
  VIEW_DOCUMENTS:     ['view:operational'],
  VIEW_DASHBOARD:     ['view:operational'],
  ACCESS_AI_ANALYTICS: ['view:operational'],
  MANAGE_USERS:       ['act:configure'],
  EXPORT_DATA:        ['data:export'],
  ACCEPT_PROPOSALS:   ['act:approve'],
  EXECUTE_TASKS:      ['act:execute']
});

function _expandRawPermissions(permissions) {
  const out = new Set();
  if (!Array.isArray(permissions)) return out;
  for (const p of permissions) {
    const mapped = PERMISSION_TO_CAPABILITIES[String(p)];
    if (Array.isArray(mapped)) for (const c of mapped) out.add(c);
  }
  return out;
}

/**
 * Calcula capabilities do utilizador para o V2.
 *
 * @param {object} args
 * @param {string} args.functionType  ex.: 'decisao_estrategica'
 * @param {string|null} args.area     ex.: 'finance'
 * @param {string} args.role          role normalizado ('diretor', 'ceo', ...)
 * @param {string[]} args.permissions permissions cru do utilizador
 * @returns {{ capabilities: string[], implicit: string[], from_permissions: string[], rationale: object[] }}
 */
function deriveCapabilities({ functionType, area, role, permissions }) {
  const set = new Set();
  const rationale = [];

  // 1) Implicit by (function, area)
  const fn = functionType || 'execucao';
  const byArea = IMPLICIT_BY_FUNCTION_AREA[fn] || {};
  const implicit = (byArea[area] || byArea._default || []).slice();
  for (const c of implicit) {
    set.add(c);
    rationale.push({ capability: c, source: 'implicit_function_area', detail: { fn, area: area || '_default' } });
  }

  // 2) CEO/admin: superset (mantém compatibilidade com regra '*' do Motor A)
  if (role === 'ceo' || role === 'admin' || role === 'internal_admin') {
    for (const c of ALL_CAPABILITIES) {
      if (!set.has(c)) {
        set.add(c);
        rationale.push({ capability: c, source: 'role_universal', detail: { role } });
      }
    }
  }

  // 3) Permissions explícitas amplificam
  const fromPerms = _expandRawPermissions(permissions);
  const fromPermsList = [];
  for (const c of fromPerms) {
    fromPermsList.push(c);
    if (!set.has(c)) {
      set.add(c);
      rationale.push({ capability: c, source: 'permissions', detail: null });
    }
  }

  return {
    capabilities: Array.from(set).sort(),
    implicit,
    from_permissions: fromPermsList.sort(),
    rationale
  };
}

/**
 * Helper de verificação. Aceita string ou array. AND-mode (todas requeridas).
 */
function hasAllCapabilities(capabilities, required) {
  if (!Array.isArray(required) || required.length === 0) return true;
  if (!Array.isArray(capabilities)) return false;
  const set = new Set(capabilities);
  for (const c of required) if (!set.has(c)) return false;
  return true;
}

module.exports = {
  ALL_CAPABILITIES,
  IMPLICIT_BY_FUNCTION_AREA,
  PERMISSION_TO_CAPABILITIES,
  deriveCapabilities,
  hasAllCapabilities
};
