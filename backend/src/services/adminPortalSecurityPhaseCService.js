'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const SIM_DIR = '/var/lib/impetus/security-simulation';
const SIM_LATEST = path.join(SIM_DIR, 'latest.json');
const PROMOTION_DIR = '/var/lib/impetus/sec-promotion-assist';
const PROMOTION_QUEUE = path.join(PROMOTION_DIR, 'queue.json');

const PROD_PM2 = ['impetus-backend', 'impetus-frontend', 'impetus-admin-portal'];
const LAB_PM2 = [
  'impetus-lab-modbus',
  'impetus-lab-opcua',
  'impetus-lab-oidc',
  'impetus-lab-smtp',
  'impetus-edge-agent-lab'
];

const SEC_ASSIST_MODULES = Object.freeze([
  { phase: 'SEC-14', key: 'securityAdaptiveBlocking', flag: 'SECURITY_ADAPTIVE_BLOCKING' },
  { phase: 'SEC-15', key: 'securityAntiScanner', flag: 'SECURITY_ANTI_SCANNER' },
  { phase: 'SEC-16', key: 'securityThreatDeception', flag: 'SECURITY_THREAT_DECEPTION' },
  { phase: 'SEC-17', key: 'securityExfiltrationDetection', flag: 'SECURITY_EXFILTRATION_DETECTION' },
  { phase: 'SEC-18', key: 'securityRuntimeProtection', flag: 'SECURITY_RUNTIME_PROTECTION' }
]);

const PREWARM_LABELS = Object.freeze({
  enable_rate_limiting: 'Aumentar rate limit nginx',
  enable_captcha: 'Activar Turnstile / CAPTCHA',
  limit_admin_access: 'Restringir acesso admin',
  restrict_admin_apis: 'Endurecer APIs administrativas',
  hide_sensitive_endpoints: 'Ocultar endpoints sensíveis',
  reduce_attack_surface: 'Reduzir superfície de ataque',
  isolate_uploads: 'Isolar uploads',
  disable_public_documentation: 'Desactivar docs públicos'
});

async function execSafe(cmd, args, ms = 8000) {
  try {
    const { stdout } = await execFileAsync(cmd, args, { timeout: ms, maxBuffer: 4 * 1024 * 1024 });
    return String(stdout || '').trim();
  } catch {
    return '';
  }
}

async function getPm2Processes() {
  const raw = await execSafe('pm2', ['jlist']);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function buildDigitalTwin() {
  const processes = await getPm2Processes();
  const byName = new Map(processes.map((p) => [p.name, p]));

  const prod = PROD_PM2.map((name) => {
    const p = byName.get(name);
    return {
      name,
      role: 'production',
      status: p?.pm2_env?.status || 'missing',
      online: p?.pm2_env?.status === 'online',
      uptime_ms: p?.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : null
    };
  });

  const lab = LAB_PM2.map((name) => {
    const p = byName.get(name);
    return {
      name,
      role: 'homolog_lab',
      status: p?.pm2_env?.status || 'missing',
      online: p?.pm2_env?.status === 'online'
    };
  });

  const prodOnline = prod.filter((p) => p.online).length;
  const labOnline = lab.filter((p) => p.online).length;

  const secFlags = {};
  for (const m of SEC_ASSIST_MODULES) {
    secFlags[m.phase] = process.env[m.flag] === 'true';
  }

  return {
    schema_version: 'digital_twin_v1',
    production: {
      processes: prod,
      online: prodOnline,
      total: prod.length
    },
    homolog_lab: {
      processes: lab,
      online: labOnline,
      total: lab.length,
      note: 'Simulador SEC-19 usa incidentes sintéticos — nunca HTTP em produção'
    },
    parity: {
      prod_online: prodOnline === prod.length,
      lab_available: labOnline > 0,
      twin_ready: labOnline > 0 && prodOnline === prod.length,
      sec_modules_enabled: Object.values(secFlags).filter(Boolean).length
    },
    sec_module_flags: secFlags
  };
}

function buildSecretVaultHealth() {
  try {
    const secretMgmt = require('../securityApplication/secretManagement');
    const result = secretMgmt.validateSecrets({
      backendRoot: path.join(__dirname, '../..')
    });
    return {
      schema_version: 'secret_vault_health_v1',
      ok: result.ok,
      mode: 'env_operational',
      note: 'Vault externo (HashiCorp/CF Secrets) — fase futura; hoje inventário .env',
      inventory: result.inventory,
      errors: result.errors,
      warnings: result.warnings,
      scans_count: (result.scans || []).length,
      rotation_recommendation:
        result.ok && (result.warnings || []).length === 0
          ? 'Segredos presentes — rotação trimestral recomendada'
          : 'Rever backups .env e evidências antes de rotação'
    };
  } catch (e) {
    return { schema_version: 'secret_vault_health_v1', ok: false, error: e.message };
  }
}

function buildPredictiveDefense() {
  try {
    const sec10 = require('../securityActiveDefense');
    const dash = sec10.evaluateDefense?.({ force: true }) || sec10.buildDashboard?.({ force: true });
    if (!dash) return { enabled: false, pre_warm: [] };

    const actions = new Map();
    for (const rec of dash.recommendations || []) {
      for (const a of rec.recommended_actions || []) {
        const key = a.action || a;
        if (!actions.has(key)) {
          actions.set(key, {
            action: key,
            label: PREWARM_LABELS[key] || key,
            priority: a.priority || rec.priority || 'MEDIUM',
            rationale: a.rationale || rec.summary,
            governance: 'semi_automatic'
          });
        }
      }
    }

    return {
      enabled: sec10.isEnabled(),
      mode: process.env.SECURITY_ACTIVE_DEFENSE_MODE || 'observe',
      threat_level: dash.threatLevel,
      current_mode: dash.currentMode,
      attack_patterns: (dash.attackPatterns || []).slice(0, 6).map((p) => p.pattern || p),
      pre_warm: [...actions.values()].slice(0, 8),
      campaigns: (dash.evidence?.campaigns || []).slice(0, 3)
    };
  } catch (e) {
    return { enabled: false, error: e.message, pre_warm: [] };
  }
}

function loadModuleSafe(key) {
  try {
    return require(`../${key}`);
  } catch {
    return null;
  }
}

function extractAssistRecommendations(mod, phase) {
  const items = [];
  if (!mod?.isEnabled?.()) {
    return [{ phase, status: 'disabled', governance: 'observe' }];
  }

  const dash = mod.buildDashboard?.({ force: true }) || mod.getAuditPayload?.();
  const recs =
    dash?.recommendations ||
    dash?.blocking_recommendations ||
    dash?.dashboard?.recommendations ||
    [];

  for (const r of (Array.isArray(recs) ? recs : []).slice(0, 5)) {
    if (r.action === 'no_action') continue;
    items.push({
      id: r.recommendationId || `${phase}-${r.action || r.id || items.length}`,
      phase,
      action: r.action || r.type || 'review',
      priority: r.priority || 'MEDIUM',
      detail: r.recommendationReason || r.reason || r.summary || '',
      ip: r.ip || null,
      governance: 'assist',
      current_mode: process.env.SECURITY_RESPONSE_DEFAULT_MODE || 'advise',
      target_mode: 'assist_with_approval'
    });
  }

  if (items.length === 0) {
    items.push({
      phase,
      status: 'nominal',
      governance: 'observe',
      detail: `${phase} activo — sem recomendações pendentes`
    });
  }

  return items;
}

async function buildPromotionAssist() {
  const modules = [];
  const recommendations = [];

  for (const m of SEC_ASSIST_MODULES) {
    const mod = loadModuleSafe(m.key);
    const enabled = mod?.isEnabled?.() ?? false;
    modules.push({
      phase: m.phase,
      module: m.key,
      enabled,
      flag: m.flag,
      mode: process.env.SECURITY_DRY_RUN_ONLY === 'true' ? 'dry_run' : 'observe'
    });
    if (enabled) {
      recommendations.push(...extractAssistRecommendations(mod, m.phase));
    }
  }

  let queue = { items: [] };
  try {
    await fsp.mkdir(PROMOTION_DIR, { recursive: true });
    queue = JSON.parse(await fsp.readFile(PROMOTION_QUEUE, 'utf8'));
  } catch {
    queue = { schema_version: 'sec_promotion_queue_v1', items: [] };
  }

  const pendingFromModules = recommendations.filter((r) => r.governance === 'assist' && r.action);
  const merged = [...(queue.items || [])];
  const seen = new Set(merged.map((i) => i.id));

  for (const r of pendingFromModules) {
    if (!seen.has(r.id)) {
      merged.push({ ...r, status: 'PENDING', created_at: new Date().toISOString() });
      seen.add(r.id);
    }
  }

  queue.items = merged.slice(0, 30);
  await fsp.writeFile(PROMOTION_QUEUE, JSON.stringify(queue, null, 2));

  return {
    schema_version: 'sec_promotion_assist_v1',
    dry_run: process.env.SECURITY_DRY_RUN_ONLY === 'true',
    manual_approval_required: process.env.SECURITY_MANUAL_APPROVAL_REQUIRED === 'true',
    modules,
    queue: queue.items.filter((i) => i.status === 'PENDING').slice(0, 12),
    promotion_note: 'SEC-14…18 em modo assist — aprovação humana antes de activar bloqueios reais'
  };
}

async function loadSimulationCache() {
  try {
    const raw = await fsp.readFile(SIM_LATEST, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function persistSimulation(result) {
  await fsp.mkdir(SIM_DIR, { recursive: true });
  const payload = {
    event: 'SECURITY_WEEKLY_SIMULATION',
    generated_at: new Date().toISOString(),
    ...result
  };
  await fsp.writeFile(SIM_LATEST, JSON.stringify(payload, null, 2));
  const stamp = path.join(SIM_DIR, `sim-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await fsp.writeFile(stamp, JSON.stringify(payload, null, 2));
  return payload;
}

async function runWeeklySimulation(opts = {}) {
  const cached = await loadSimulationCache();
  const maxAgeMs = opts.force ? 0 : 7 * 86_400_000;
  if (cached?.generated_at && !opts.force) {
    const age = Date.now() - new Date(cached.generated_at).getTime();
    if (age < maxAgeMs) {
      return { ...cached, from_cache: true };
    }
  }

  try {
    const sec19 = require('../securityOperationalCertification');
    const catalog = sec19.simulations?.catalog;
    const result = sec19.runOperationalCertification({
      skipStress: false,
      skipAttacks: false,
      regressionPassing: true
    });

    const scenarios = catalog?.getAllScenarios?.() || [];
    const payload = await persistSimulation({
      from_cache: false,
      certification: {
        decision: result?.certificationDecision,
        readiness_level: result?.readinessLevel,
        operational_score: result?.operationalScore,
        attack_coverage: result?.attackCoverage,
        detection_accuracy: result?.detectionAccuracy
      },
      scenarios_total: scenarios.length || result?.attackCoverage?.totalScenarios || 0,
      environment: 'synthetic_sec19',
      production_http: false
    });

    return payload;
  } catch (e) {
    return {
      ok: false,
      error: e.message,
      from_cache: false
    };
  }
}

function getSimulationSummary(cached) {
  if (!cached) {
    return {
      status: 'not_run',
      message: 'Simulador semanal ainda não executado — cron domingo 03:00 ou botão Executar'
    };
  }

  return {
    status: cached.error ? 'error' : 'ok',
    generated_at: cached.generated_at,
    from_cache: cached.from_cache,
    operational_score: cached.certification?.operational_score,
    readiness_level: cached.certification?.readiness_level,
    decision: cached.certification?.decision,
    scenarios_total: cached.scenarios_total,
    coverage_ratio: cached.certification?.attack_coverage?.coverageRatio,
    detected: cached.certification?.attack_coverage?.detected,
    production_http: false
  };
}

async function approvePromotionItem(itemId, adminEmail, reason) {
  let queue;
  try {
    queue = JSON.parse(await fsp.readFile(PROMOTION_QUEUE, 'utf8'));
  } catch {
    return { ok: false, error: 'Fila não encontrada' };
  }

  const item = (queue.items || []).find((i) => i.id === itemId);
  if (!item) return { ok: false, error: 'Item não encontrado' };

  item.status = 'APPROVED_ASSIST';
  item.approved_at = new Date().toISOString();
  item.approved_by = adminEmail;
  item.approval_reason = reason || 'Promoção assist aprovada';

  await fsp.writeFile(PROMOTION_QUEUE, JSON.stringify(queue, null, 2));
  return {
    ok: true,
    item,
    note: 'Modo assist aprovado — execução real requer SEC-12/controlled execution + rollback plan'
  };
}

async function buildPhaseCPayload(opts = {}) {
  const [digitalTwin, simulationCached, promotion] = await Promise.all([
    buildDigitalTwin(),
    loadSimulationCache(),
    buildPromotionAssist()
  ]);

  const secretVault = buildSecretVaultHealth();
  const predictive = buildPredictiveDefense();

  let simulation = getSimulationSummary(simulationCached);
  if (opts.runSimulation) {
    const fresh = await runWeeklySimulation({ force: true });
    simulation = getSimulationSummary(fresh);
  }

  return {
    schema_version: 'admin_security_phase_c_v1',
    digital_twin: digitalTwin,
    weekly_simulation: simulation,
    secret_vault: secretVault,
    predictive_defense: predictive,
    promotion_assist: promotion
  };
}

module.exports = {
  buildPhaseCPayload,
  buildDigitalTwin,
  buildSecretVaultHealth,
  buildPredictiveDefense,
  buildPromotionAssist,
  runWeeklySimulation,
  approvePromotionItem,
  loadSimulationCache
};
