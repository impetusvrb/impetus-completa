'use strict';

/**
 * SEC-04 — Runtime validation (PM2, processos, health).
 * Read-only — nunca reinicia ou mata processos.
 */

const { execSync } = require('child_process');

const CRITICAL_APPS = ['impetus-backend', 'impetus-frontend'];

function gatherPm2State() {
  try {
    const out = execSync('pm2 jlist 2>/dev/null', { encoding: 'utf8', timeout: 10000 });
    return JSON.parse(out);
  } catch (_e) {
    return null;
  }
}

/**
 * @param {object} baseline
 * @param {object} [ctx] — mock: { processes: [] }
 */
function validateRuntime(baseline, ctx = {}) {
  const findings = [];
  const baselineProcs = baseline.pm2Snapshot || [];
  const current = ctx.processes != null ? ctx.processes : gatherPm2State();

  if (!current) {
    return {
      kind: 'runtime',
      status: 'UNKNOWN',
      passed: false,
      findings: [{ severity: 'WARNING', code: 'PM2_UNAVAILABLE', message: 'PM2 jlist indisponível — verificação parcial' }],
      summary: 'PM2 indisponível',
      processHealth: { online: 0, stopped: 0, issues: ['PM2_UNAVAILABLE'] }
    };
  }

  const byName = new Map(current.map((p) => [p.name, p]));
  let online = 0;
  let stopped = 0;
  const issues = [];

  for (const app of CRITICAL_APPS) {
    const cur = byName.get(app);
    const base = baselineProcs.find((p) => p.name === app);

    if (!cur) {
      findings.push({ severity: 'CRITICAL', code: 'PROCESS_MISSING', process: app, message: `Processo ${app} não encontrado no PM2` });
      issues.push(`${app}_MISSING`);
      continue;
    }

    if (cur.pm2_env?.status === 'online' || cur.status === 'online') online += 1;
    else {
      stopped += 1;
      findings.push({ severity: 'CRITICAL', code: 'PROCESS_OFFLINE', process: app, message: `${app} não está online` });
      issues.push(`${app}_OFFLINE`);
    }

    const curScript = cur.pm2_env?.pm_exec_path || cur.script || '';
    const baseScript = base?.script || '';

    if (baseScript && curScript && !curScript.includes(baseScript.split('/').pop())) {
      findings.push({
        severity: 'CRITICAL',
        code: 'SCRIPT_CHANGED',
        process: app,
        expected: baseScript,
        actual: curScript,
        message: 'Script de execução alterado face à baseline'
      });
      issues.push(`${app}_SCRIPT_DRIFT`);
    }

    const curRestarts = cur.pm2_env?.restart_time ?? cur.restarts ?? 0;
    const baseRestarts = base?.restarts ?? 0;
    if (curRestarts > baseRestarts + 50) {
      findings.push({
        severity: 'WARNING',
        code: 'UNEXPECTED_RESTARTS',
        process: app,
        baseline_restarts: baseRestarts,
        current_restarts: curRestarts,
        message: 'Restart count significativamente superior à baseline'
      });
    }
  }

  for (const base of baselineProcs.filter((p) => p.status === 'stopped')) {
    const cur = byName.get(base.name);
    if (cur && (cur.pm2_env?.status === 'online' || cur.status === 'online')) {
      findings.push({
        severity: 'WARNING',
        code: 'UNEXPECTED_PROCESS_ONLINE',
        process: base.name,
        message: `Processo ${base.name} estava stopped na baseline mas está online`
      });
    }
  }

  const critical = findings.filter((f) => f.severity === 'CRITICAL');
  const passed = critical.length === 0 && online >= CRITICAL_APPS.length;
  const status = critical.some((f) => f.code === 'PROCESS_MISSING' || f.code === 'PROCESS_OFFLINE')
    ? 'COMPROMISED'
    : critical.length > 0
      ? 'DEGRADED'
      : passed
        ? 'OK'
        : 'UNKNOWN';

  return {
    kind: 'runtime',
    status,
    passed,
    findings,
    summary: passed ? `${online} processos críticos online` : `${critical.length} problemas críticos de runtime`,
    processHealth: { online, stopped, issues }
  };
}

module.exports = { validateRuntime, gatherPm2State, CRITICAL_APPS };
