'use strict';

/**
 * F49-C — IOE Continuous Ingestion Activation Checkpoint
 * READ ONLY · CHECKPOINT ONLY · sem activação automática
 *
 * Valida pré-requisitos antes de operação industrial contínua.
 * Não altera env vars, não reinicia PM2, não activa workers.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

const LAYER = 'IOE_CONTINUOUS_INGESTION_CHECKPOINT';

const ENV_KEYS = Object.freeze({
  outbox_worker: 'IMPETUS_AIOI_OUTBOX_WORKER_ENABLED',
  continuous_runtime: 'IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED',
  event_pipeline: 'IMPETUS_EVENT_PIPELINE_ENABLED',
  aioi_enabled: 'IMPETUS_AIOI_ENABLED'
});

const BOOT_MARKERS = Object.freeze([
  'EVENT_PIPELINE_BOOT',
  'AIOI_OUTBOX_WORKER_BOOT',
  'AIOI_CONTINUOUS_WORKER_BOOT'
]);

const DEFAULT_PM2_OUT_LOG = '/root/.pm2/logs/impetus-backend-out.log';
const DEFAULT_ENV_PATH = path.join(__dirname, '../../../.env');
const DEFAULT_API_BASE = 'http://127.0.0.1:4000';

function _envTruthy(value) {
  return String(value ?? '').trim().toLowerCase() === 'true';
}

/**
 * Lê variáveis do ficheiro .env sem alterar process.env (read-only).
 * @param {string} envPath
 * @returns {Record<string, string>}
 */
function readEnvFile(envPath = DEFAULT_ENV_PATH) {
  const resolved = path.resolve(envPath);
  if (!fs.existsSync(resolved)) {
    return { _file_exists: 'false', _path: resolved };
  }

  const vars = { _file_exists: 'true', _path: resolved };
  const content = fs.readFileSync(resolved, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
  return vars;
}

/**
 * Resolve valor efectivo: process.env tem precedência sobre ficheiro .env.
 */
function resolveEnvValue(key, envFileVars = {}) {
  if (process.env[key] !== undefined) return process.env[key];
  if (envFileVars[key] !== undefined) return envFileVars[key];
  return undefined;
}

/**
 * F49-C Item 1 & 2 — verificação de env vars obrigatórias.
 */
function checkEnvConfiguration(envFileVars = readEnvFile()) {
  const outboxRaw = resolveEnvValue(ENV_KEYS.outbox_worker, envFileVars);
  const continuousRaw = resolveEnvValue(ENV_KEYS.continuous_runtime, envFileVars);
  const pipelineRaw = resolveEnvValue(ENV_KEYS.event_pipeline, envFileVars);
  const aioiRaw = resolveEnvValue(ENV_KEYS.aioi_enabled, envFileVars);

  const outbox_worker_enabled = _envTruthy(outboxRaw);
  const continuous_ingestion_enabled = _envTruthy(continuousRaw);
  const event_pipeline_env_enabled = _envTruthy(pipelineRaw);
  const aioi_enabled = _envTruthy(aioiRaw);

  return {
    item_1_outbox_worker: {
      key: ENV_KEYS.outbox_worker,
      configured_value: outboxRaw ?? '(unset → default false)',
      required: 'true',
      passed: outbox_worker_enabled
    },
    item_2_continuous_runtime: {
      key: ENV_KEYS.continuous_runtime,
      configured_value: continuousRaw ?? '(unset → default false)',
      required: 'true',
      passed: continuous_ingestion_enabled
    },
    item_event_pipeline_env: {
      key: ENV_KEYS.event_pipeline,
      configured_value: pipelineRaw ?? '(unset → default false)',
      required: 'true',
      passed: event_pipeline_env_enabled
    },
    aioi_master_flag: {
      key: ENV_KEYS.aioi_enabled,
      configured_value: aioiRaw ?? '(unset → default false)',
      recommended: 'true',
      passed: aioi_enabled
    },
    env_file: {
      path: envFileVars._path,
      exists: envFileVars._file_exists === 'true'
    },
    summary: {
      outbox_worker_enabled,
      continuous_ingestion_enabled,
      event_pipeline_env_enabled,
      aioi_enabled
    }
  };
}

/**
 * Extrai última linha de boot por marcador — lê só o tail do log (evita OOM em logs GB+).
 */
function parseBootLogEvidence(logPath = DEFAULT_PM2_OUT_LOG) {
  const resolved = path.resolve(logPath);
  if (!fs.existsSync(resolved)) {
    return {
      log_path: resolved,
      log_exists: false,
      markers: {},
      event_pipeline_boot_ok: false
    };
  }

  let content = '';
  try {
    const safePath = resolved.replace(/'/g, "'\\''");
    content = execSync(`tail -n 8000 '${safePath}'`, {
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024
    });
  } catch (e) {
    return {
      log_path: resolved,
      log_exists: true,
      read_error: e.message,
      markers: {},
      event_pipeline_boot_ok: false
    };
  }

  const lines = content.split('\n');
  const markers = {};

  for (const marker of BOOT_MARKERS) {
    let lastLine = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes(`[${marker}]`)) {
        lastLine = lines[i].trim();
        break;
      }
    }
    markers[marker] = lastLine;
  }

  let eventPipelineBoot = { ok: false, reason: 'not_found_in_log' };
  const epLine = markers.EVENT_PIPELINE_BOOT;
  if (epLine) {
    const jsonMatch = epLine.match(/\{.*\}/);
    if (jsonMatch) {
      try {
        eventPipelineBoot = JSON.parse(jsonMatch[0]);
      } catch {
        eventPipelineBoot = { ok: false, reason: 'parse_error', raw: epLine };
      }
    }
  }

  const outboxDisabled = markers.AIOI_OUTBOX_WORKER_BOOT?.includes('Worker desativado');
  const continuousDisabled = markers.AIOI_CONTINUOUS_WORKER_BOOT?.includes('Worker desativado');

  return {
    log_path: resolved,
    log_exists: true,
    markers,
    event_pipeline_boot: eventPipelineBoot,
    event_pipeline_boot_ok: eventPipelineBoot.ok === true,
    outbox_worker_boot_active: !outboxDisabled && !!markers.AIOI_OUTBOX_WORKER_BOOT,
    continuous_worker_boot_active: !continuousDisabled && !!markers.AIOI_CONTINUOUS_WORKER_BOOT,
    item_3_event_pipeline_boot: {
      required: { EVENT_PIPELINE_BOOT: { ok: true } },
      actual: eventPipelineBoot,
      passed: eventPipelineBoot.ok === true
    }
  };
}

/**
 * GET HTTP JSON helper (read-only).
 */
function httpGetJson(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ ok: false, status: res.statusCode, error: 'parse_error', raw: body.slice(0, 500) });
        }
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
  });
}

/**
 * Estado runtime via API (processo PM2 activo).
 */
async function checkLiveRuntime(apiBase = DEFAULT_API_BASE) {
  const healthUrl = `${apiBase.replace(/\/$/, '')}/api/aioi/runtime/health`;
  const health = await httpGetJson(healthUrl);

  if (!health.ok || !health.data) {
    return {
      api_reachable: false,
      error: health.error || `HTTP ${health.status}`,
      continuous_worker_running: false,
      outbox_worker_running: null
    };
  }

  return {
    api_reachable: true,
    continuous_worker_enabled: health.data.continuous_worker_enabled === true,
    continuous_worker_running: health.data.worker_running === true,
    worker_status: health.data.status,
    run_count: health.data.run_count,
    last_run_at: health.data.last_run_at,
    outbox_pending: health.data.outbox_pending,
    outbox_failed: health.data.outbox_failed
  };
}

/**
 * F49-C Items 4 & 5 — evidência de IOE e outbox recentes (read-only DB).
 */
async function checkIngestionEvidence(db, { windowMinutes = 30 } = {}) {
  if (!db?.query && !db?.pool?.query) {
    return {
      db_available: false,
      error: 'db_not_provided'
    };
  }

  const query = db.query ? db.query.bind(db) : db.pool.query.bind(db.pool);

  const [ioeBefore, ioeRecent, outboxBefore, outboxRecent, ioeLast, outboxLast] = await Promise.all([
    query(`SELECT COUNT(*)::int AS cnt FROM industrial_operational_events`),
    query(`
      SELECT COUNT(*)::int AS cnt FROM industrial_operational_events
      WHERE created_at > NOW() - ($1::text || ' minutes')::interval
    `, [String(windowMinutes)]),
    query(`SELECT COUNT(*)::int AS cnt FROM aioi_outbox`),
    query(`
      SELECT COUNT(*)::int AS cnt FROM aioi_outbox
      WHERE created_at > NOW() - ($1::text || ' minutes')::interval
    `, [String(windowMinutes)]),
    query(`SELECT MAX(created_at) AS ts FROM industrial_operational_events`),
    query(`
      SELECT MAX(created_at) AS created, MAX(processed_at) AS processed
      FROM aioi_outbox
    `)
  ]);

  const ioeNewCount = ioeRecent.rows[0]?.cnt ?? 0;
  const outboxNewCount = outboxRecent.rows[0]?.cnt ?? 0;

  return {
    db_available: true,
    window_minutes: windowMinutes,
    item_4_new_ioe_generated: {
      required: 'count > 0 within observation window after activation',
      recent_count: ioeNewCount,
      total: ioeBefore.rows[0]?.cnt ?? 0,
      last_event_at: ioeLast.rows[0]?.ts,
      passed: ioeNewCount > 0
    },
    item_5_outbox_delivery: {
      required: 'new aioi_outbox rows + delivery path active',
      recent_outbox_count: outboxNewCount,
      total: outboxBefore.rows[0]?.cnt ?? 0,
      last_outbox_created: outboxLast.rows[0]?.created,
      last_outbox_processed: outboxLast.rows[0]?.processed,
      passed: outboxNewCount > 0
    }
  };
}

/**
 * Estado in-process dos workers (quando invocado dentro do servidor).
 */
function checkInProcessWorkers() {
  try {
    const outboxWorker = require('../aioi/aioiOutboxWorkerService');
    const continuousWorker = require('../aioi/runtime/aioiContinuousWorkerService');
    const eventPipeline = require('../eventPipelineBootstrapService');

    const outboxStatus = outboxWorker.getWorkerStatus();
    const continuousStatus = continuousWorker.getWorkerStatus();
    const pipelineWouldBoot = String(process.env.IMPETUS_EVENT_PIPELINE_ENABLED || 'false').toLowerCase() === 'true';

    return {
      available: true,
      outbox_worker: outboxStatus,
      continuous_worker: continuousStatus,
      event_pipeline_env_enabled: pipelineWouldBoot
    };
  } catch (e) {
    return { available: false, error: e.message };
  }
}

function getPm2ProcessMeta() {
  try {
    const raw = execSync('pm2 jlist', { timeout: 5000, encoding: 'utf8' });
    const list = JSON.parse(raw);
    const be = list.find((p) => p.name === 'impetus-backend');
    if (!be) return { found: false };
    return {
      found: true,
      status: be.pm2_env?.status,
      restarts: be.pm2_env?.restart_time,
      created_at: be.pm2_env?.created_at ? new Date(be.pm2_env.created_at).toISOString() : null,
      uptime_ms: be.pm2_env?.pm_uptime ? Date.now() - be.pm2_env.pm_uptime : null
    };
  } catch (e) {
    return { found: false, error: e.message };
  }
}

/**
 * Gera checkpoint completo F49-C.
 * @param {object} options
 * @param {object} [options.db] — pool/query para evidência IOE/outbox
 * @param {string} [options.envPath]
 * @param {string} [options.logPath]
 * @param {string} [options.apiBase]
 * @param {number} [options.observationWindowMinutes]
 */
async function generateActivationCheckpoint(options = {}) {
  const envFileVars = readEnvFile(options.envPath);
  const envCheck = checkEnvConfiguration(envFileVars);
  const bootLog = parseBootLogEvidence(options.logPath);
  const liveRuntime = await checkLiveRuntime(options.apiBase);
  const pm2 = getPm2ProcessMeta();

  let ingestionEvidence = { db_available: false, skipped: true };
  if (options.db) {
    ingestionEvidence = await checkIngestionEvidence(options.db, {
      windowMinutes: options.observationWindowMinutes ?? 30
    });
  }

  const inProcess = options.includeInProcessWorkers ? checkInProcessWorkers() : { skipped: true };

  const envReady =
    envCheck.summary.outbox_worker_enabled &&
    envCheck.summary.continuous_ingestion_enabled &&
    envCheck.summary.event_pipeline_env_enabled;

  const bootReady =
    bootLog.event_pipeline_boot_ok &&
    bootLog.outbox_worker_boot_active &&
    bootLog.continuous_worker_boot_active;

  const runtimeReady =
    liveRuntime.api_reachable &&
    liveRuntime.continuous_worker_enabled === true &&
    liveRuntime.continuous_worker_running === true;

  const ingestionReady =
    ingestionEvidence.item_4_new_ioe_generated?.passed === true &&
    ingestionEvidence.item_5_outbox_delivery?.passed === true;

  const preDeployReady = envReady;
  const postRestartReady = envReady && bootReady && runtimeReady;
  const fullyOperational = postRestartReady && ingestionReady;

  const checklist = [
    {
      id: 1,
      label: 'IMPETUS_AIOI_OUTBOX_WORKER_ENABLED=true',
      phase: 'pre_deploy',
      passed: envCheck.item_1_outbox_worker.passed
    },
    {
      id: 2,
      label: 'IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED=true',
      phase: 'pre_deploy',
      passed: envCheck.item_2_continuous_runtime.passed
    },
    {
      id: 3,
      label: 'EVENT_PIPELINE_BOOT ok:true após restart',
      phase: 'post_restart',
      passed: bootLog.item_3_event_pipeline_boot.passed && runtimeReady
    },
    {
      id: 4,
      label: 'Geração de novos IOE',
      phase: 'post_activation',
      passed: ingestionEvidence.item_4_new_ioe_generated?.passed === true
    },
    {
      id: 5,
      label: 'Entrega aioi_outbox + industrial_operational_events',
      phase: 'post_activation',
      passed: ingestionEvidence.item_5_outbox_delivery?.passed === true
    }
  ];

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    auto_activation: false,
    operator_action_required: !fullyOperational,
    generated_at: new Date().toISOString(),

    required_flags: {
      continuous_ingestion_enabled: envCheck.summary.continuous_ingestion_enabled,
      outbox_worker_enabled: envCheck.summary.outbox_worker_enabled,
      event_pipeline_boot_ok: bootLog.event_pipeline_boot_ok
    },

    criteria: {
      continuous_ingestion_ready: fullyOperational,
      event_pipeline_operational: bootLog.event_pipeline_boot_ok && envCheck.summary.event_pipeline_env_enabled,
      pre_deploy_env_ready: preDeployReady,
      post_restart_runtime_ready: postRestartReady
    },

    checklist,
    env_configuration: envCheck,
    boot_log_evidence: bootLog,
    live_runtime: liveRuntime,
    ingestion_evidence: ingestionEvidence,
    pm2_process: pm2,
    in_process_workers: inProcess,

    operator_instructions: {
      note: 'Activacao explicita pelo operador — este checkpoint nao altera env nem reinicia PM2.',
      steps: [
        '1. Definir IMPETUS_AIOI_OUTBOX_WORKER_ENABLED=true no .env',
        '2. Definir IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED=true no .env',
        '3. Definir IMPETUS_EVENT_PIPELINE_ENABLED=true no .env (se pipeline cognitivo necessario)',
        '4. Confirmar IMPETUS_AIOI_ENABLED=true e IMPETUS_AIOI_PILOT_TENANTS configurados',
        '5. Executar pm2 restart impetus-backend --update-env (decisao manual)',
        '6. Re-executar este checkpoint e confirmar Items 3–5'
      ]
    },

    verdict: {
      continuity_audit_completed: true,
      checkpoint_completed: true,
      root_cause_identified: !envReady,
      operational_status_determined: true,
      evidence_report_generated: true,
      activation_blocked_reason: !envReady
        ? 'Workers desactivados por configuracao (F49-B root_cause: worker_stopped)'
        : !postRestartReady
          ? 'Env configurado mas runtime ainda nao reflecte activacao — restart manual pendente'
          : !ingestionReady
            ? 'Runtime activo mas sem novos IOE na janela de observacao'
            : null
    }
  };
}

module.exports = {
  generateActivationCheckpoint,
  checkEnvConfiguration,
  parseBootLogEvidence,
  checkLiveRuntime,
  checkIngestionEvidence,
  readEnvFile,
  ENV_KEYS,
  LAYER
};
