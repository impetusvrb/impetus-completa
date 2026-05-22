/**
 * userIdentityCacheBus — Phase 7
 *
 * Bus único de invalidação para tudo o que depende da identidade
 * organizacional de um utilizador (role, area, hierarchy_level,
 * company_role_id, functional_area, department).
 *
 * Hoje a invalidação está espalhada em vários endpoints e omite o cache
 * mais crítico (`dashboard_configs`, TTL 24h). Esta camada agrega as
 * invalidações conhecidas num único ponto, observável e seguro.
 *
 * IMPORTANTE — Princípios:
 *   - ADITIVO. Não substitui invalidações existentes; complementa-as.
 *   - SEGURO. Cada caller é envolvido em try/catch — uma falha de
 *     invalidação nunca aborta o fluxo principal.
 *   - OBSERVÁVEL. Emite log `[IDENTITY_CACHE_INVALIDATE]` com o motivo
 *     e os caches que respondidos.
 *   - LAZY. Nada é instanciado até `invalidateUserIdentity` ser chamado.
 *
 * Uso típico:
 *   const bus = require('./userIdentityCacheBus');
 *   await bus.invalidateUserIdentity({
 *     userId: 'uuid',
 *     companyId: 'uuid',
 *     reason: 'admin_update_user',
 *     fieldsChanged: ['hierarchy_level', 'company_role_id']
 *   });
 */

'use strict';

const TRIGGERS = Object.freeze([
  'role',
  'hierarchy_level',
  'company_role_id',
  'functional_area',
  'area',
  'department',
  'department_id',
  'job_title',
  'hr_responsibilities',
  'dashboard_profile',
  'descricao',
  'descricao_funcional'
]);

function _shouldInvalidate(fieldsChanged) {
  if (!Array.isArray(fieldsChanged) || fieldsChanged.length === 0) return true;
  return fieldsChanged.some((f) => TRIGGERS.includes(f));
}

async function _safeRun(label, fn, results) {
  try {
    const out = await fn();
    results[label] = out === undefined ? 'ok' : out;
  } catch (err) {
    results[label] = `error:${(err && err.message) || 'unknown'}`;
  }
}

/**
 * @param {Object} args
 * @param {string} args.userId
 * @param {string} [args.companyId]
 * @param {string} [args.reason]                 motivo p/ telemetria
 * @param {string[]} [args.fieldsChanged]        se fornecido, decide se invalida
 * @param {boolean} [args.force=false]           ignora `fieldsChanged` e invalida tudo
 * @returns {Promise<Object>}                    relatório de invalidações
 */
async function invalidateUserIdentity(args) {
  const opts = args || {};
  const userId = opts.userId || null;
  const companyId = opts.companyId || null;
  const reason = opts.reason || 'unknown';
  const fieldsChanged = Array.isArray(opts.fieldsChanged) ? opts.fieldsChanged.slice() : null;
  const force = opts.force === true;

  if (!userId) {
    return { ok: false, reason: 'missing_user_id' };
  }
  if (!force && !_shouldInvalidate(fieldsChanged)) {
    return { ok: true, skipped: true, reason: 'no_relevant_field' };
  }

  const results = {};

  // 1. dashboard_configs (TTL 24h em DB) — causa raiz #1 do bug Welligton
  await _safeRun('dashboard_personalizado', async () => {
    const svc = require('./dashboardPersonalizadoService');
    if (svc && typeof svc.invalidarCache === 'function') {
      await svc.invalidarCache(userId);
    }
  }, results);

  // 2. structuralOrgContextService (memória, scope da empresa)
  await _safeRun('structural_org_context', async () => {
    if (!companyId) return 'skip:no_company_id';
    const svc = require('./structuralOrgContextService');
    if (svc && typeof svc.invalidateCompanyCache === 'function') {
      svc.invalidateCompanyCache(companyId);
    }
    return undefined;
  }, results);

  // 3. hierarchicalFilter scope (placeholder — mas chamamos em caso de
  //    integração futura com cache real)
  await _safeRun('hierarchy_scope', async () => {
    const mw = require('../middleware/hierarchyScope');
    if (mw && typeof mw.invalidateScopeCache === 'function') {
      mw.invalidateScopeCache(userId);
    }
  }, results);

  // 4. dashboard live cache (in-memory, alguns serviços guardam por user)
  await _safeRun('live_dashboard_cache', async () => {
    try {
      const svc = require('./liveDashboardService');
      if (svc && typeof svc.invalidateUserCache === 'function') {
        svc.invalidateUserCache(userId);
      }
    } catch (_) {
      return 'skip:no_handler';
    }
  }, results);

  // 5. contextual identity cache (Phase 4/5/6)
  await _safeRun('contextual_identity', async () => {
    try {
      const svc = require('../dashboardEngineV2/identity/identityResolver');
      if (svc && typeof svc.invalidateCache === 'function') {
        svc.invalidateCache(userId);
      }
    } catch (_) {
      return 'skip:no_handler';
    }
  }, results);

  try {
    // eslint-disable-next-line no-console
    console.log('[IDENTITY_CACHE_INVALIDATE]', {
      user_id: userId,
      company_id: companyId,
      reason,
      fields_changed: fieldsChanged,
      results
    });
  } catch (_) { /* swallow */ }

  return { ok: true, results, reason };
}

module.exports = {
  invalidateUserIdentity,
  TRIGGERS
};
