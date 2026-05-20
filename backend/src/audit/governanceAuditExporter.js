'use strict';

const fs = require('fs');
const auditFeed = require('./cognitiveGovernanceAuditFeed');
const traceService = require('../governanceTrace/governanceTraceService');
const oversightMetrics = require('../policyEngine/observability/governanceEnterpriseMetrics');

/**
 * Exporta pacote auditável para SIEM / compliance.
 */
function exportAuditBundle(opts = {}) {
  const limit = opts.limit || 100;
  const since = opts.since ? new Date(opts.since).getTime() : 0;

  const memoryRecords = auditFeed.listFromMemory(limit * 2);
  const filtered = memoryRecords.filter((r) => {
    const t = new Date(r.timestamp || r.audit_appended_at || 0).getTime();
    return t >= since;
  }).slice(-limit);

  const traces = traceService.listRecent(limit);
  const metrics = oversightMetrics.getEnterpriseMetrics();

  return {
    format: 'impetus_cognitive_governance_audit_v1',
    exported_at: new Date().toISOString(),
    record_count: filtered.length,
    trace_count: traces.length,
    metrics,
    records: filtered,
    traces: traces.map((t) => ({
      trace_id: t.trace_id,
      user_id: t.user_id,
      tenant_id: t.tenant_id,
      timestamp: t.timestamp,
      decision: t.decision,
      channel: t.affected_channel,
      explanation: t.explanation
    }))
  };
}

function exportToJsonFile(targetPath, opts = {}) {
  const bundle = exportAuditBundle(opts);
  fs.writeFileSync(targetPath, JSON.stringify(bundle, null, 2), 'utf8');
  return { path: targetPath, record_count: bundle.record_count };
}

module.exports = { exportAuditBundle, exportToJsonFile };
