#!/usr/bin/env node
'use strict';

/**
 * PROMOTION-02 — Controlled Runtime Activation (Grupo A).
 * Apenas flags + PM2 restart — sem alteração de código.
 *
 * Uso:
 *   node scripts/promotion/promotion-02-controlled-activation.js --baseline
 *   PROMOTION_02_EXECUTE=1 node scripts/promotion/promotion-02-controlled-activation.js --execute
 *   node scripts/promotion/promotion-02-controlled-activation.js --report
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

const BACKEND_ROOT = path.resolve(__dirname, '../..');
const ENV_PATH = path.join(BACKEND_ROOT, '.env');
const EVIDENCE_DIR = path.join(BACKEND_ROOT, 'docs/evidence/promotion-02');
const REPORT_PATH = path.join(BACKEND_ROOT, 'docs/PROMOTION_02_ACTIVATION_REPORT.md');

const API_HOST = process.env.PROMOTION_API_HOST || '127.0.0.1';
const API_PORT = parseInt(process.env.PROMOTION_API_PORT || '4000', 10);
const PM2_APP = process.env.PROMOTION_PM2_APP || 'impetus-backend';
const RESTART_WAIT_MS = parseInt(process.env.PROMOTION_RESTART_WAIT_MS || '12000', 10);

const FORBIDDEN_FLAGS = [
  'EVENT_GOVERNANCE_ENABLED',
  'EVENT_GOVERNANCE_EXECUTION_ENABLED',
  'EVENT_GOVERNANCE_OPERATIONAL_ALERTS',
  'EVENT_GOVERNANCE_AI_PROACTIVE',
  'EVENT_GOVERNANCE_TPM',
  'EVENT_GOVERNANCE_EXECUTIVE',
  'EVENT_GOVERNANCE_BILLING',
  'EVENT_GOVERNANCE_DSR',
  'EVENT_GOVERNANCE_MANUIA',
  'EVENT_GOVERNANCE_QUALITY',
  'EVENT_GOVERNANCE_SST',
  'EVENT_GOVERNANCE_ESG'
];

const STEPS = [
  {
    id: 'aioi',
    flag: 'EVENT_GOVERNANCE_AIOI',
    service: 'src/services/governanceAdapters/aioiGovernanceAdapter.js',
    isEnabled: 'isAioiGovernanceEnabled',
    auditRoute: 'aioi'
  },
  {
    id: 'learning',
    flag: 'EVENT_GOVERNANCE_LEARNING',
    service: 'src/services/governanceLearningService.js',
    isEnabled: 'isLearningEnabled',
    auditRoute: 'learning'
  },
  {
    id: 'memory',
    flag: 'EVENT_GOVERNANCE_MEMORY',
    service: 'src/services/governanceOperationalMemoryService.js',
    isEnabled: 'isMemoryEnabled',
    auditRoute: 'memory'
  },
  {
    id: 'explainability',
    flag: 'EVENT_GOVERNANCE_EXPLAINABILITY',
    service: 'src/services/governanceExplainabilityService.js',
    isEnabled: 'isExplainabilityEnabled',
    auditRoute: 'explainability'
  },
  {
    id: 'intelligence',
    flag: 'EVENT_GOVERNANCE_INTELLIGENCE',
    service: 'src/services/governanceIntelligenceService.js',
    isEnabled: 'isIntelligenceEnabled',
    auditRoute: 'intelligence'
  },
  {
    id: 'policy_optimization',
    flag: 'EVENT_GOVERNANCE_POLICY_OPTIMIZATION',
    service: 'src/services/governancePolicyOptimizationService.js',
    isEnabled: 'isPolicyOptimizationEnabled',
    auditRoute: 'policy-optimization'
  },
  {
    id: 'executive_insights',
    flag: 'EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS',
    service: 'src/services/governanceExecutiveInsightsService.js',
    isEnabled: 'isExecutiveInsightsEnabled',
    auditRoute: 'executive-insights'
  },
  {
    id: 'knowledge_base',
    flag: 'EVENT_GOVERNANCE_KNOWLEDGE_BASE',
    service: 'src/services/governanceKnowledgeBaseService.js',
    isEnabled: 'isKnowledgeBaseEnabled',
    auditRoute: 'knowledge-base'
  }
];

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function readEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return '';
  return fs.readFileSync(ENV_PATH, 'utf8');
}

function getEnvFlag(flag) {
  const content = readEnvFile();
  const re = new RegExp(`^${flag}=(.*)$`, 'm');
  const m = content.match(re);
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, '');
}

function setEnvFlag(flag, value) {
  const val = value === true || value === 'true' ? 'true' : 'false';
  let content = readEnvFile();
  const line = `${flag}=${val}`;
  const re = new RegExp(`^${flag}=.*$`, 'm');
  if (re.test(content)) {
    content = content.replace(re, line);
  } else {
    if (content.length && !content.endsWith('\n')) content += '\n';
    content += `${line}\n`;
  }
  fs.writeFileSync(ENV_PATH, content);
}

function httpGet(pathname) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const req = http.request(
      { hostname: API_HOST, port: API_PORT, path: pathname, method: 'GET', timeout: 15000 },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(body);
          } catch {
            /* */
          }
          resolve({ status: res.statusCode, json, ms: Date.now() - t0, raw: body.slice(0, 500) });
        });
      }
    );
    req.on('error', (err) => resolve({ status: 0, error: err.message, ms: Date.now() - t0 }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, error: 'timeout', ms: Date.now() - t0 });
    });
    req.end();
  });
}

function pm2Json() {
  try {
    const out = execSync('pm2 jlist', { encoding: 'utf8' });
    return JSON.parse(out);
  } catch {
    return [];
  }
}

function getPm2App() {
  return pm2Json().find((p) => p.name === PM2_APP) || null;
}

function getMetricsSnapshot() {
  try {
    delete require.cache[require.resolve(path.join(BACKEND_ROOT, 'src/services/observabilityService.js'))];
    return require(path.join(BACKEND_ROOT, 'src/services/observabilityService')).getMetricsSnapshot();
  } catch (e) {
    return { error: e.message };
  }
}

function reloadEnv() {
  const loadEnvPath = path.join(BACKEND_ROOT, 'src/config/loadEnv.js');
  delete require.cache[require.resolve(loadEnvPath)];
  require(loadEnvPath).loadImpetusEnv();
}

function checkServiceEnabled(step) {
  reloadEnv();
  const svcPath = path.join(BACKEND_ROOT, step.service);
  delete require.cache[require.resolve(svcPath)];
  const mod = require(svcPath);
  return mod[step.isEnabled]() === true;
}

function getServiceAudit(step) {
  reloadEnv();
  const svcPath = path.join(BACKEND_ROOT, step.service);
  delete require.cache[require.resolve(svcPath)];
  const mod = require(svcPath);
  if (typeof mod.getAuditStatus === 'function') return mod.getAuditStatus();
  return { enabled: mod[step.isEnabled]() };
}

async function collectBaseline() {
  const health = await httpGet('/health');
  const deep = await httpGet('/api/system/health/deep');
  const pm2 = getPm2App();
  const flags = {};
  for (const s of STEPS) flags[s.flag] = getEnvFlag(s.flag) || 'false';
  for (const f of FORBIDDEN_FLAGS) flags[f] = getEnvFlag(f) || 'false';

  const services = {};
  for (const step of STEPS) {
    services[step.id] = {
      enabled: checkServiceEnabled(step),
      audit: getServiceAudit(step)
    };
  }

  return {
    capturedAt: new Date().toISOString(),
    health,
    deepHealth: deep,
    pm2: pm2
      ? { name: pm2.name, status: pm2.pm2_env?.status, restarts: pm2.pm2_env?.restart_time, uptime: pm2.pm2_env?.pm_uptime }
      : null,
    flags,
    metrics: getMetricsSnapshot(),
    services
  };
}

function pm2Restart() {
  const t0 = Date.now();
  execSync(`pm2 restart ${PM2_APP} --update-env`, { stdio: 'pipe', cwd: path.resolve(BACKEND_ROOT, '..') });
  return Date.now() - t0;
}

async function waitForHealth(maxMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const h = await httpGet('/health');
    if (h.status === 200 && h.json?.success === true) return h;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return { status: 0, error: 'health_timeout' };
}

async function validateStep(step, baseline) {
  const errors = [];
  const health = await httpGet('/health');
  const deep = await httpGet('/api/system/health/deep');

  if (health.status !== 200) errors.push(`health ${health.status}`);
  if (!deep.json?.ready) errors.push('deep health not ready');

  if (!checkServiceEnabled(step)) errors.push(`${step.isEnabled}() !== true`);
  if (getEnvFlag(step.flag) !== 'true') errors.push(`${step.flag} not true in .env`);

  const audit = getServiceAudit(step);
  if (audit.enabled === false) errors.push('audit enabled=false');

  const metrics = getMetricsSnapshot();
  const execLatency = await measurePipelineLatency();

  return {
    health,
    deepHealth: deep,
    audit,
    metrics,
    execLatencyMs: execLatency,
    errors,
    passed: errors.length === 0
  };
}

async function measurePipelineLatency() {
  try {
    const execPath = path.join(BACKEND_ROOT, 'src/services/eventGovernanceExecutionService.js');
    delete require.cache[require.resolve(execPath)];
    const exec = require(execPath);
    const event = {
      companyId: '00000000-0000-0000-0000-0000000000aa',
      eventType: 'promotion02_probe',
      category: 'operational',
      severity: 'medium',
      sourceModule: 'promotion02',
      payload: { probe: true }
    };
    const t0 = process.hrtime.bigint();
    await exec.evaluatePrepareAndExecute(event);
    return Math.round(Number(process.hrtime.bigint() - t0) / 1e6 * 100) / 100;
  } catch (e) {
    return { error: e.message };
  }
}

function loadState() {
  const p = path.join(EVIDENCE_DIR, 'activation-state.json');
  if (!fs.existsSync(p)) return { baseline: null, steps: [], globalDecision: null };
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveState(state) {
  ensureDir(EVIDENCE_DIR);
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'activation-state.json'), JSON.stringify(state, null, 2));
}

async function runBaseline() {
  ensureDir(EVIDENCE_DIR);
  const baseline = await collectBaseline();
  const state = loadState();
  state.baseline = baseline;
  state.baselineAt = baseline.capturedAt;
  saveState(state);
  const file = path.join(EVIDENCE_DIR, `baseline-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(baseline, null, 2));
  console.log(JSON.stringify({ ok: true, baselineFile: file, pm2: baseline.pm2 }));
  return baseline;
}

async function rollbackStep(step) {
  console.log(`  ↩ rollback ${step.flag}=false`);
  setEnvFlag(step.flag, false);
  const restartMs = pm2Restart();
  await new Promise((r) => setTimeout(r, RESTART_WAIT_MS));
  await waitForHealth();
  return { restartMs, flag: step.flag, value: false };
}

async function activateStep(step, state) {
  const prev = getEnvFlag(step.flag) || 'false';
  console.log(`\n▶ Activating ${step.flag} (was ${prev})`);

  setEnvFlag(step.flag, true);
  const restartMs = pm2Restart();
  await new Promise((r) => setTimeout(r, RESTART_WAIT_MS));
  const healthWait = await waitForHealth();
  const validation = await validateStep(step, state.baseline);

  const record = {
    stepId: step.id,
    flag: step.flag,
    previousValue: prev,
    newValue: 'true',
    restartMs,
    healthWaitMs: healthWait.ms,
    validation,
    decision: validation.passed ? 'ONLINE' : 'REVERTIDO',
    at: new Date().toISOString()
  };

  if (!validation.passed) {
    console.error(`  ❌ FAILED: ${validation.errors.join(', ')}`);
    record.rollback = await rollbackStep(step);
    record.decision = 'REVERTIDO';
    record.nc = {
      id: `NC-P02-${step.id.toUpperCase()}`,
      severity: 'Alta',
      message: `Regressão na ativação ${step.flag}: ${validation.errors.join('; ')}`,
      status: 'OPEN'
    };
  } else {
    console.log(`  ✅ ONLINE ${step.id} (restart ${restartMs}ms, pipeline ${validation.execLatencyMs}ms)`);
  }

  state.steps.push(record);
  saveState(state);
  fs.writeFileSync(path.join(EVIDENCE_DIR, `step-${step.id}-${Date.now()}.json`), JSON.stringify(record, null, 2));
  return record;
}

async function runExecute() {
  if (process.env.PROMOTION_02_EXECUTE !== '1') {
    console.error('Defina PROMOTION_02_EXECUTE=1 para executar ativação real.');
    process.exit(2);
  }

  ensureDir(EVIDENCE_DIR);
  const backupPath = `${ENV_PATH}.pre-promotion-02-${Date.now()}`;
  fs.copyFileSync(ENV_PATH, backupPath);
  console.log(`Backup .env → ${backupPath}`);

  let state = loadState();
  if (!state.baseline) {
    console.log('Capturando baseline...');
    state.baseline = await collectBaseline();
    state.baselineAt = state.baseline.capturedAt;
    saveState(state);
  }

  const completed = new Set(state.steps.filter((s) => s.decision === 'ONLINE').map((s) => s.stepId));
  const blocked = state.steps.find((s) => s.decision === 'REVERTIDO');

  if (blocked) {
    console.error(`Sequência bloqueada após ${blocked.stepId}. Resolva NC antes de continuar.`);
    process.exit(1);
  }

  for (const step of STEPS) {
    if (completed.has(step.id)) {
      console.log(`⏭ skip ${step.id} (já ONLINE)`);
      continue;
    }
    const record = await activateStep(step, state);
    state = loadState();
    if (record.decision === 'REVERTIDO') {
      state.globalDecision = 'PROMOTION BLOCKED';
      saveState(state);
      generateReport(state);
      process.exit(1);
    }
  }

  const online = state.steps.filter((s) => s.decision === 'ONLINE').length;
  state.globalDecision = online === STEPS.length ? 'PROMOTION SUCCESSFUL' : 'PARTIAL PROMOTION';
  saveState(state);
  generateReport(state);
  console.log(`\n✅ ${state.globalDecision} (${online}/${STEPS.length} ONLINE)`);
}

function generateReport(state) {
  if (!state) state = loadState();
  const lines = [
    '# PROMOTION-02 — Relatório de Ativação Controlada',
    '',
    `**Gerado:** ${new Date().toISOString()}`,
    `**Decisão global:** ${state.globalDecision || 'EM PROGRESSO'}`,
    '',
    '---',
    '',
    '## Baseline',
    '',
    state.baseline
      ? `- Health: ${state.baseline.health?.status} (${state.baseline.health?.ms}ms)`
      : '- Não capturada',
    state.baseline?.deepHealth ? `- Deep health ready: ${state.baseline.deepHealth.json?.ready}` : '',
    state.baseline?.pm2 ? `- PM2 ${state.baseline.pm2.name}: restarts=${state.baseline.pm2.restarts}` : '',
    '',
    '## Ativações graduais',
    '',
    '| # | Componente | Flag | Restart | Pipeline ms | Decisão |',
    '|---|------------|------|---------|-------------|---------|'
  ];

  state.steps.forEach((s, i) => {
    lines.push(
      `| ${i + 1} | ${s.stepId} | ${s.flag} | ${s.restartMs}ms | ${s.validation?.execLatencyMs ?? '-'} | **${s.decision}** |`
    );
  });

  lines.push('', '## NCs', '');
  const ncs = state.steps.filter((s) => s.nc).map((s) => s.nc);
  if (!ncs.length) lines.push('Nenhuma NC aberta nesta execução.');
  else ncs.forEach((nc) => lines.push(`- **${nc.id}** (${nc.severity}): ${nc.message}`));

  lines.push('', '## Flags proibidas (não activadas)', '');
  FORBIDDEN_FLAGS.forEach((f) => lines.push(`- \`${f}\` = ${getEnvFlag(f) || 'false'}`));

  lines.push('', '## Recomendação produção', '');
  if (state.globalDecision === 'PROMOTION SUCCESSFUL') {
    lines.push('Replicar mesma sequência gradual em produção após janela de manutenção.');
  } else if (state.globalDecision === 'PROMOTION BLOCKED') {
    lines.push('**Não promover para produção** até resolução das NCs.');
  } else {
    lines.push('Completar ativação em staging antes de produção.');
  }

  lines.push('', `Evidências: \`docs/evidence/promotion-02/\``);
  fs.writeFileSync(REPORT_PATH, lines.join('\n'));
  console.log(`Report: ${REPORT_PATH}`);
}

async function main() {
  const arg = process.argv[2] || '--help';
  if (arg === '--baseline') await runBaseline();
  else if (arg === '--execute') await runExecute();
  else if (arg === '--report') generateReport(loadState());
  else {
    console.log(`Uso:
  --baseline   Captura baseline
  --execute    Ativação gradual (requer PROMOTION_02_EXECUTE=1)
  --report     Gera relatório a partir do state`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
