/**
 * hierarchyResolver — Phase 7
 *
 * Fonte canónica de hierarchy_level no IMPETUS.
 *
 * Regra absoluta:
 *   1. Se o utilizador tem `company_role_id` válido E `company_roles.hierarchy_level`
 *      é numérico, esse valor é o canónico.
 *   2. Caso contrário, usa `users.hierarchy_level` se for numérico (cache legado).
 *   3. Caso contrário, infere a partir de `users.role` por uma tabela conservadora.
 *   4. Caso contrário, default 5 (operador) — apenas para utilizadores incompletos.
 *
 * IMPORTANTE — Princípios:
 *   - PURO. Sem efeitos colaterais. Apenas leitura.
 *   - ADITIVO. Não substitui leituras directas; é a forma recomendada de
 *     resolver hierarquia em runtime.
 *   - OBSERVÁVEL. Quando há divergência (`users` vs `cr`), regista em
 *     `[HIERARCHY_DRIFT]` para correcção offline.
 *   - SEGURO POR DEFEITO. Se algo falha, devolve o valor mais conservador
 *     entre `users.hierarchy_level` e o default.
 *
 * Uso típico:
 *   const { resolveHierarchyLevel } = require('./hierarchyResolver');
 *   const level = resolveHierarchyLevel(user); // sync, leitura barata
 *
 * Para hidratar a partir do banco (quando `cr.hierarchy_level` não veio no
 * JOIN), usar `loadAndResolveFromDb(db, user)`.
 */

'use strict';

/**
 * Mapa conservador role → hierarchy_level (last-resort).
 * NÃO é fonte de verdade. Só é usado quando não há `company_role_id` nem
 * `users.hierarchy_level`.
 */
const ROLE_TO_LEVEL_FALLBACK = Object.freeze({
  ceo: 0,
  diretor: 1,
  gerente: 2,
  coordenador: 3,
  supervisor: 4,
  colaborador: 5,
  operador: 5,
  auxiliar: 5,
  auxiliar_producao: 5,
  admin: 1,
  rh: 3
});

const DEFAULT_OPERATIONAL_LEVEL = 5;

function _toFiniteInt(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(99, Math.trunc(n)));
}

/**
 * Devolve o nível canónico a partir do que estiver disponível no objecto.
 * Aceita os campos:
 *   - company_role_hierarchy_level (preferido — vem de JOIN com company_roles)
 *   - cr_hierarchy_level           (alias)
 *   - hierarchy_level              (cache em users)
 *   - role                         (último recurso)
 *
 * @param {Object} user
 * @param {Object} [opts]
 * @param {boolean} [opts.silent=false]  desativa log de drift
 * @returns {number} hierarchy_level canónico (0..99)
 */
function resolveHierarchyLevel(user, opts) {
  const silent = !!(opts && opts.silent);
  if (!user || typeof user !== 'object') return DEFAULT_OPERATIONAL_LEVEL;

  const cr =
    _toFiniteInt(user.company_role_hierarchy_level) ??
    _toFiniteInt(user.cr_hierarchy_level);
  const usersValue = _toFiniteInt(user.hierarchy_level);

  if (cr !== null) {
    if (!silent && usersValue !== null && usersValue !== cr) {
      try {
        // eslint-disable-next-line no-console
        console.warn('[HIERARCHY_DRIFT]', {
          user_id: user.id || null,
          email: user.email || null,
          users_value: usersValue,
          cr_value: cr,
          company_role_id: user.company_role_id || null
        });
      } catch (_) { /* swallow */ }
    }
    return cr;
  }

  if (usersValue !== null) return usersValue;

  const role = String(user.role || '').toLowerCase().trim();
  if (role && ROLE_TO_LEVEL_FALLBACK[role] !== undefined) {
    return ROLE_TO_LEVEL_FALLBACK[role];
  }

  return DEFAULT_OPERATIONAL_LEVEL;
}

/**
 * Diz se a hierarquia do `user` está em drift face a `company_roles`.
 * Não escreve nada. Útil para audits e para o resolver decidir invalidar
 * caches sem alterar o banco.
 */
function isHierarchyDrifted(user) {
  if (!user) return false;
  const cr =
    _toFiniteInt(user.company_role_hierarchy_level) ??
    _toFiniteInt(user.cr_hierarchy_level);
  const usersValue = _toFiniteInt(user.hierarchy_level);
  return cr !== null && usersValue !== null && cr !== usersValue;
}

/**
 * Carrega `company_roles.hierarchy_level` directamente do banco e devolve
 * o nível canónico. Útil em pontos onde o `req.user` não trouxe o JOIN
 * (ex.: services chamados via background).
 *
 * @param {{ query: Function }} db
 * @param {Object} user
 * @returns {Promise<{ level: number, source: 'company_roles'|'users'|'role'|'default', drift: boolean }>}
 */
async function loadAndResolveFromDb(db, user) {
  const fallback = {
    level: resolveHierarchyLevel(user, { silent: true }),
    source: 'users',
    drift: false
  };
  if (!db || typeof db.query !== 'function') return fallback;
  if (!user || !user.company_role_id) {
    return {
      level: resolveHierarchyLevel(user, { silent: true }),
      source: _toFiniteInt(user && user.hierarchy_level) !== null ? 'users' : 'role',
      drift: false
    };
  }
  try {
    const r = await db.query(
      'SELECT hierarchy_level FROM company_roles WHERE id = $1',
      [user.company_role_id]
    );
    const cr = r && r.rows && r.rows[0] ? _toFiniteInt(r.rows[0].hierarchy_level) : null;
    if (cr !== null) {
      const usersValue = _toFiniteInt(user.hierarchy_level);
      return {
        level: cr,
        source: 'company_roles',
        drift: usersValue !== null && usersValue !== cr
      };
    }
    return fallback;
  } catch (_) {
    return fallback;
  }
}

/**
 * Helper: enriquece um snapshot de utilizador (vindo de qualquer query) com
 * o `hierarchy_level` canónico, mantendo o original em
 * `hierarchy_level_users` para auditoria. Não toca em mais nada.
 *
 * Uso típico em hydration de sessão:
 *   const enriched = applyCanonicalHierarchy(rawUser);
 */
function applyCanonicalHierarchy(user) {
  if (!user || typeof user !== 'object') return user;
  const canonical = resolveHierarchyLevel(user, { silent: false });
  const usersValue = _toFiniteInt(user.hierarchy_level);
  if (usersValue === canonical) return user;
  return Object.assign({}, user, {
    hierarchy_level: canonical,
    hierarchy_level_users: usersValue,
    hierarchy_level_canonical_source:
      _toFiniteInt(user.company_role_hierarchy_level) !== null ||
      _toFiniteInt(user.cr_hierarchy_level) !== null
        ? 'company_roles'
        : usersValue !== null
          ? 'users'
          : 'role'
  });
}

module.exports = {
  resolveHierarchyLevel,
  loadAndResolveFromDb,
  isHierarchyDrifted,
  applyCanonicalHierarchy,
  ROLE_TO_LEVEL_FALLBACK,
  DEFAULT_OPERATIONAL_LEVEL
};
