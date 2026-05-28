#!/usr/bin/env node
'use strict';

/**
 * Monitorização Action Runtime — fila HITL + traces (24–48h rollout).
 * Uso: node scripts/action-runtime-monitor.js [--json] [--company=uuid]
 */

const flags = require('../src/actionRuntime/config/actionRuntimeFlags');

async function main() {
  const jsonOut = process.argv.includes('--json');
  const companyArg = process.argv.find((a) => a.startsWith('--company='));
  const companyFilter = companyArg ? companyArg.split('=')[1] : null;

  const db = require('../src/db');
  const pilots = flags.pilotTenants();

  const params = [];
  let companySql = '';
  if (companyFilter) {
    companySql = ' AND company_id = $1::uuid';
    params.push(companyFilter);
  } else if (pilots.length > 0) {
    companySql = ` AND company_id = ANY($1::uuid[])`;
    params.push(pilots);
  }

  const pending = await db.query(
    `SELECT status, COUNT(*)::int AS c FROM ai_action_approval_queue
     WHERE 1=1 ${companySql} GROUP BY status ORDER BY status`,
    params
  );

  const traces = await db.query(
    `SELECT status, COUNT(*)::int AS c FROM ai_action_execution_traces
     WHERE created_at > now() - interval '48 hours' ${companySql}
     GROUP BY status ORDER BY status`,
    params
  );

  const stale = await db.query(
    `SELECT COUNT(*)::int AS c FROM ai_action_approval_queue
     WHERE status = 'pending' AND created_at < now() - interval '24 hours' ${companySql}`,
    params
  );

  const recent = await db.query(
    `SELECT trace_id, tool_name, status, mode, created_at
     FROM ai_action_execution_traces
     WHERE 1=1 ${companySql}
     ORDER BY created_at DESC LIMIT 10`,
    params
  );

  const report = {
    ts: new Date().toISOString(),
    mode: flags.actionRuntimeMode(),
    enabled: flags.isActionRuntimeEnabled(),
    pilot_tenants: pilots,
    approval_queue: pending.rows,
    traces_48h: traces.rows,
    stale_pending_over_24h: stale.rows[0]?.c || 0,
    recent_traces: recent.rows
  };

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('\n[ACTION_RUNTIME_MONITOR]', JSON.stringify(report, null, 2), '\n');
  }

  if ((report.stale_pending_over_24h || 0) > 0) {
    process.exitCode = 2;
  }
}

main().catch((e) => {
  console.error('[ACTION_RUNTIME_MONITOR_ERR]', e?.message);
  process.exit(1);
});
