/**
 * Contextual Sidebar Builder — núcleo puro (Phase 8).
 *
 * Sem dependências de React/ícones/lucide. Forçado a CommonJS via extensão
 * `.cjs` para que possa ser carregado tanto pelo Vite (frontend ESM) como
 * por scripts Node puros (testes do backend).
 *
 * Carregado por:
 *   - `contextualSidebarBuilder.js` (decoração com ícones do lucide-react)
 *   - `backend/src/tests/contextualSidebarBuilderScenarios.js` (testes)
 */

const DEFAULT_CATEGORY_PRIORITY = Object.freeze([
  'financial',
  'operational',
  'risk',
  'quality',
  'maintenance',
  'safety',
  'hr',
  'audit'
]);

const DEFAULT_MIN_SCORE = 0.5;

function _normPath(p) {
  if (!p) return '';
  return String(p).replace(/\/+$/, '') || '/';
}

function _debug(...args) {
  try {
    if (typeof window !== 'undefined' && window.IMPETUS_CONTEXTUAL_DEBUG === true) {
      // eslint-disable-next-line no-console
      console.log('[CONTEXTUAL_MENU]', ...args);
    }
  } catch (_) { /* never throw */ }
}

function makeMenuItem(mod, decorationMap) {
  if (!mod || typeof mod !== 'object') return null;
  const known = decorationMap && decorationMap[mod.module_id];
  if (known) {
    return {
      path: known.path,
      icon: known.icon,
      label: known.label,
      _contextual: true,
      _module_id: mod.module_id,
      _category: mod.category || null,
      _score: typeof mod.score === 'number' ? mod.score : null,
      _criticality: typeof mod.criticality === 'number' ? mod.criticality : null
    };
  }
  const path = Array.isArray(mod.paths) && mod.paths[0] ? mod.paths[0] : null;
  if (!path) return null;
  return {
    path,
    icon: null,
    label: mod.label || mod.module_id,
    _contextual: true,
    _module_id: mod.module_id,
    _category: mod.category || null,
    _score: typeof mod.score === 'number' ? mod.score : null,
    _criticality: typeof mod.criticality === 'number' ? mod.criticality : null
  };
}

function buildHybridMenu(legacyMenu, contextualModules, decorationMap, opts) {
  const baseLegacy = Array.isArray(legacyMenu) ? legacyMenu.slice() : [];
  if (!Array.isArray(contextualModules) || contextualModules.length === 0) {
    _debug('skip', { reason: 'no_contextual_modules', legacy_count: baseLegacy.length });
    return baseLegacy;
  }

  const minScore = typeof (opts && opts.minScore) === 'number' ? opts.minScore : DEFAULT_MIN_SCORE;
  const allowSet = (opts && Array.isArray(opts.allowCategories) && opts.allowCategories.length > 0)
    ? new Set(opts.allowCategories)
    : null;
  const denyIds = new Set((opts && Array.isArray(opts.denyModuleIds)) ? opts.denyModuleIds : []);

  const occupiedPaths = new Set(
    baseLegacy.map((it) => _normPath(it && it.path)).filter(Boolean)
  );

  const candidates = contextualModules
    .filter((m) => m && !denyIds.has(m.module_id))
    .filter((m) => (typeof m.score !== 'number') || m.score >= minScore)
    .filter((m) => !allowSet || (m.category && allowSet.has(m.category)))
    .map((m) => makeMenuItem(m, decorationMap))
    .filter((it) => !!it && !occupiedPaths.has(_normPath(it.path)));

  if (candidates.length === 0) {
    _debug('all_filtered', { contextual_count: contextualModules.length });
    return baseLegacy;
  }

  const categoryRank = new Map(DEFAULT_CATEGORY_PRIORITY.map((c, i) => [c, i]));
  candidates.sort((a, b) => {
    const ra = categoryRank.has(a._category) ? categoryRank.get(a._category) : 999;
    const rb = categoryRank.has(b._category) ? categoryRank.get(b._category) : 999;
    if (ra !== rb) return ra - rb;
    const sa = typeof a._score === 'number' ? a._score : 0;
    const sb = typeof b._score === 'number' ? b._score : 0;
    if (sa !== sb) return sb - sa;
    return String(a.label).localeCompare(String(b.label));
  });

  const out = baseLegacy.slice();
  let insertAt = out.findIndex((it) => _normPath(it && it.path) === '/app');
  if (insertAt >= 0) {
    insertAt += 1;
  } else {
    const settingsIdx = out.findIndex((it) => _normPath(it && it.path) === '/app/settings');
    insertAt = settingsIdx >= 0 ? settingsIdx : out.length;
  }

  const seen = new Set(occupiedPaths);
  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const it = candidates[i];
    const np = _normPath(it.path);
    if (seen.has(np)) continue;
    seen.add(np);
    out.splice(insertAt, 0, it);
  }

  _debug('hybrid', {
    legacy_count: baseLegacy.length,
    contextual_count: contextualModules.length,
    accepted: candidates.length,
    final_count: out.length,
    accepted_module_ids: candidates.map((c) => c._module_id)
  });

  return out;
}

function logContextualDebugSummary(payload) {
  if (typeof window === 'undefined' || window.IMPETUS_CONTEXTUAL_DEBUG !== true) return;
  if (!payload || typeof payload !== 'object') return;
  try {
    // eslint-disable-next-line no-console
    console.groupCollapsed('[CONTEXTUAL_MENU] /dashboard/me summary');
    // eslint-disable-next-line no-console
    console.log('mode:', payload.mode || 'off');
    // eslint-disable-next-line no-console
    console.log('visible_modules:', payload.visible_modules || []);
    // eslint-disable-next-line no-console
    console.log('contextual_modules:', payload.contextual_modules || []);
    // eslint-disable-next-line no-console
    console.log('meta:', payload.meta || null);
    // eslint-disable-next-line no-console
    console.groupEnd();
  } catch (_) { /* never throw */ }
}

module.exports = {
  buildHybridMenu,
  makeMenuItem,
  logContextualDebugSummary,
  DEFAULT_CATEGORY_PRIORITY,
  DEFAULT_MIN_SCORE
};
