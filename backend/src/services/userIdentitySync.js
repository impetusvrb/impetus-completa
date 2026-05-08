/**
 * userIdentitySync — Phase 7
 *
 * Garante que `users.hierarchy_level` espelha `company_roles.hierarchy_level`
 * sempre que o `company_role_id` de um utilizador é definido ou alterado.
 *
 * Também expõe um helper para resolver, de forma transaccional, o nível
 * hierárquico que **deve** ser persistido em `users` na criação/edição.
 *
 * IMPORTANTE — Princípios:
 *   - ADITIVO. Não substitui as escritas existentes; é chamado em paralelo.
 *   - SEGURO. Cada operação é envolvida em try/catch — uma falha de
 *     sincronização nunca aborta o fluxo principal.
 *   - OBSERVÁVEL. Log `[IDENTITY_SYNC]` e `[HIERARCHY_DRIFT]` para auditoria.
 *   - IDEMPOTENTE. Reaplicar a mesma sincronização não muda nada.
 *
 * Uso típico:
 *   const sync = require('./userIdentitySync');
 *   // após INSERT/UPDATE em users
 *   await sync.syncHierarchyFromCompanyRole({ userId, companyRoleId });
 */

'use strict';

const db = require('../db');
const cacheBus = require('./userIdentityCacheBus');

function _toFiniteInt(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(99, Math.trunc(n)));
}

/**
 * Lê `company_roles.hierarchy_level` para o cargo informado.
 * @param {string} companyRoleId
 * @returns {Promise<number|null>}
 */
async function getCompanyRoleHierarchy(companyRoleId) {
  if (!companyRoleId) return null;
  try {
    const r = await db.query(
      'SELECT hierarchy_level FROM company_roles WHERE id = $1',
      [companyRoleId]
    );
    if (!r || !r.rows || r.rows.length === 0) return null;
    return _toFiniteInt(r.rows[0].hierarchy_level);
  } catch (_) {
    return null;
  }
}

/**
 * Resolve qual `hierarchy_level` deve ser persistido em `users` para um
 * dado conjunto de inputs (CREATE/UPDATE).
 *
 * Prioridade:
 *   1. company_roles.hierarchy_level (se companyRoleId fornecido e nivel válido)
 *   2. valor explicitamente fornecido pelo admin (`fallbackLevel`)
 *   3. mapa role → nível (ROLE_TO_LEVEL_FALLBACK)
 *   4. default 5
 *
 * @param {Object} input
 * @param {string|null} [input.companyRoleId]
 * @param {number|null} [input.fallbackLevel]   o que o admin/area mapeou
 * @param {string|null} [input.role]            ex.: 'ceo','diretor','gerente'
 * @returns {Promise<{ level: number, source: 'company_roles'|'fallback'|'role'|'default' }>}
 */
async function resolveLevelForPersistence(input) {
  const inp = input || {};
  if (inp.companyRoleId) {
    const cr = await getCompanyRoleHierarchy(inp.companyRoleId);
    if (cr !== null) return { level: cr, source: 'company_roles' };
  }
  const fb = _toFiniteInt(inp.fallbackLevel);
  if (fb !== null) return { level: fb, source: 'fallback' };
  const { ROLE_TO_LEVEL_FALLBACK, DEFAULT_OPERATIONAL_LEVEL } = require('./hierarchyResolver');
  const role = String(inp.role || '').toLowerCase().trim();
  if (role && ROLE_TO_LEVEL_FALLBACK[role] !== undefined) {
    return { level: ROLE_TO_LEVEL_FALLBACK[role], source: 'role' };
  }
  return { level: DEFAULT_OPERATIONAL_LEVEL, source: 'default' };
}

/**
 * Reescreve `users.hierarchy_level` para refletir o cargo formal actual.
 * Idempotente — não escreve se já está sincronizado.
 *
 * @param {Object} args
 * @param {string} args.userId
 * @param {string|null} [args.companyRoleId]   se omitido, lê do banco
 * @param {string} [args.reason]                p/ telemetria
 * @returns {Promise<{ok:boolean, before:?number, after:?number, changed:boolean, reason?:string}>}
 */
async function syncHierarchyFromCompanyRole(args) {
  const opts = args || {};
  const userId = opts.userId;
  if (!userId) return { ok: false, reason: 'missing_user_id', before: null, after: null, changed: false };

  let companyRoleId = opts.companyRoleId;
  let companyId = null;
  let currentLevel = null;
  try {
    const r = await db.query(
      'SELECT company_id, company_role_id, hierarchy_level FROM users WHERE id = $1 AND deleted_at IS NULL',
      [userId]
    );
    if (!r || !r.rows || r.rows.length === 0) {
      return { ok: false, reason: 'user_not_found', before: null, after: null, changed: false };
    }
    companyId = r.rows[0].company_id || null;
    if (companyRoleId === undefined) companyRoleId = r.rows[0].company_role_id;
    currentLevel = _toFiniteInt(r.rows[0].hierarchy_level);
  } catch (e) {
    return { ok: false, reason: `db_lookup_failed:${e.message}`, before: null, after: null, changed: false };
  }

  if (!companyRoleId) {
    return { ok: true, reason: 'no_company_role', before: currentLevel, after: currentLevel, changed: false };
  }

  const cr = await getCompanyRoleHierarchy(companyRoleId);
  if (cr === null) {
    return { ok: true, reason: 'company_role_has_no_level', before: currentLevel, after: currentLevel, changed: false };
  }

  if (cr === currentLevel) {
    return { ok: true, reason: 'already_synced', before: currentLevel, after: cr, changed: false };
  }

  try {
    await db.query(
      'UPDATE users SET hierarchy_level = $1, updated_at = now() WHERE id = $2',
      [cr, userId]
    );
  } catch (e) {
    return { ok: false, reason: `db_update_failed:${e.message}`, before: currentLevel, after: null, changed: false };
  }

  try {
    // eslint-disable-next-line no-console
    console.log('[IDENTITY_SYNC]', {
      user_id: userId,
      company_id: companyId,
      company_role_id: companyRoleId,
      before: currentLevel,
      after: cr,
      reason: opts.reason || 'sync_from_company_role'
    });
  } catch (_) { /* swallow */ }

  // Cascata de invalidações
  try {
    await cacheBus.invalidateUserIdentity({
      userId,
      companyId,
      reason: 'hierarchy_synced',
      fieldsChanged: ['hierarchy_level', 'company_role_id'],
      force: true
    });
  } catch (_) { /* swallow */ }

  return { ok: true, before: currentLevel, after: cr, changed: true, reason: opts.reason || 'sync_from_company_role' };
}

module.exports = {
  syncHierarchyFromCompanyRole,
  resolveLevelForPersistence,
  getCompanyRoleHierarchy
};
