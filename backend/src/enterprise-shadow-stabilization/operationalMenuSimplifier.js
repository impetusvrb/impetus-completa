'use strict';

/**
 * Sugestões de simplificação de menu por domínio (bounded publication).
 */
function simplifyMenuPlan(manifestItems = [], band = 'operator') {
  const limits = {
    operator: 6,
    technician: 9,
    supervisor: 10,
    coordinator: 11,
    manager: 9,
    director: 7,
    auditor: 9,
    production: 2
  };
  const max = limits[band] || 6;
  const prioritized = manifestItems.slice().sort((a, b) => {
    const score = (id) => (id.includes('operational') ? 3 : id.includes('picking') || id.includes('receiving') ? 2 : 1);
    return score(b.id) - score(a.id);
  });
  const keep = prioritized.slice(0, max);
  const defer = prioritized.slice(max);
  return {
    ok: true,
    assistive_only: true,
    band,
    keep_ids: keep.map((i) => i.id),
    deferred_ids: defer.map((i) => i.id),
    overflow: defer.length > 0
  };
}

module.exports = { simplifyMenuPlan };
