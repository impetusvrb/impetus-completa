'use strict';

const omr = require('./zOperationalMemoryRuntime');

const TYPE = 'incident';

function recordIncident(tenantId, user, inc = {}) {
  return omr.record(tenantId, {
    type: TYPE,
    user_id: user?.id || null,
    summary: inc.summary || inc.title || 'incident',
    intent: 'incident_response',
    payload: {
      incident_id: inc.incident_id || null,
      severity: inc.severity || 'unknown',
      domain: inc.domain || null,
      status: inc.status || 'open',
      area: inc.area || null
    },
    tags: ['incident', ...(inc.tags || [])],
    domain: inc.domain || null,
    correlation_id: inc.incident_id || null
  });
}

function openIncidents(tenantId) {
  return omr
    .list(tenantId, { type: TYPE })
    .filter((e) => e?.payload?.status !== 'closed');
}

module.exports = { recordIncident, openIncidents, TYPE };
