'use strict';

const _audits = [];

function recordSidebarPruningAudit(entry = {}) {
  const row = { ts: new Date().toISOString(), phase: 'Z.14', ...entry };
  _audits.push(row);
  if (_audits.length > 500) _audits.shift();
  return row;
}

function getRecentSidebarPruningAudits(limit = 50, tenantId = null) {
  let rows = _audits;
  if (tenantId) rows = rows.filter((r) => r.tenant_id === tenantId);
  return rows.slice(-limit);
}

module.exports = { recordSidebarPruningAudit, getRecentSidebarPruningAudits };
