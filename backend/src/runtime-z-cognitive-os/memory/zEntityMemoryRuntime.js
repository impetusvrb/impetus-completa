'use strict';

const omr = require('./zOperationalMemoryRuntime');

const TYPE = 'entity';

/**
 * Memoriza entidades operacionais mencionadas (activos, sectores, NRs,
 * comunicados, eventos). É deliberadamente leve — apenas atributos
 * suficientes para o raciocínio inferir continuidade.
 */
function recordEntity(tenantId, user, ent = {}) {
  return omr.record(tenantId, {
    type: TYPE,
    user_id: user?.id || null,
    summary: ent.label || ent.name || ent.id || 'entity',
    intent: null,
    payload: {
      kind: ent.kind || 'generic',
      attributes: ent.attributes || {},
      external_refs: ent.external_refs || null
    },
    tags: ent.tags || [],
    domain: ent.domain || null,
    correlation_id: ent.correlation_id || null
  });
}

function findEntities(tenantId, text, limit = 5) {
  return omr.index(tenantId).search(text, limit).filter((e) => e.type === TYPE);
}

function recentEntities(tenantId, limit = 10) {
  return omr.index(tenantId).byTypeRecent(TYPE, limit);
}

module.exports = { recordEntity, findEntities, recentEntities, TYPE };
