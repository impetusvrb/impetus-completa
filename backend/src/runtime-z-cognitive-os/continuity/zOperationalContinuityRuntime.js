'use strict';

const incidents = require('../memory/zIncidentMemoryRuntime');
const tasks = require('../memory/zTaskMemoryRuntime');

function buildOperationalContinuity(tenantId) {
  const openIncs = incidents.openIncidents(tenantId);
  const openTasks = tasks.openTasks(tenantId);
  return {
    open_incidents: openIncs.length,
    open_tasks: openTasks.length,
    critical_incidents: openIncs.filter((i) =>
      ['critical', 'high'].includes(i?.payload?.severity)
    ).length,
    has_operational_continuity: openIncs.length > 0 || openTasks.length > 0,
    incidents_summary: openIncs.slice(0, 5).map((i) => ({
      id: i.id,
      summary: i.summary,
      severity: i?.payload?.severity,
      area: i?.payload?.area
    })),
    tasks_summary: openTasks.slice(0, 5).map((t) => ({
      id: t.id,
      summary: t.summary,
      status: t?.payload?.status,
      due_at: t?.payload?.due_at
    }))
  };
}

module.exports = { buildOperationalContinuity };
