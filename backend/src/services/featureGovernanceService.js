'use strict';

/**
 * IMPETUS — Feature Governance Service (Enterprise Hardening Bloco 11)
 *
 * Responsabilidades:
 *   1. Snapshot imutável das flags relevantes no arranque (boot).
 *   2. Validação de combinações inválidas conhecidas (ex.: pipeline strict
 *      sem orquestrador habilitado).
 *   3. Cache do snapshot — leituras em hot path não recorrem ao env.
 *   4. Dependency graph mínimo (declarativo) que pode crescer no tempo.
 *
 * Aditivo: não substitui os reads de `process.env` existentes. É um
 * **observador** que produz relatório / aviso no boot. Consumidores podem
 * optar por consultar `getFlag(name)` em vez de `process.env` quando
 * quiserem comportamento cacheado.
 */

const KNOWN_FLAGS = [
  // Hardening blocos 1–12
  'IMPETUS_INTERNAL_ROUTES_ENABLED',
  'IMPETUS_INTERNAL_ROUTES_DEV_OPEN',
  'IMPETUS_INTERNAL_IP_ALLOWLIST',
  'IMPETUS_ALLOW_TOKEN_IN_QUERY',
  'IMPETUS_STRICT_TENANT_FROM_DB',
  'IMPETUS_LOGIN_REQUIRE_SESSION_PERSISTENCE',
  'IMPETUS_JWT_FAIL_CLOSED_PLACEHOLDER',
  'IMPETUS_MIGRATION_ADVISORY_LOCK',
  'IMPETUS_MIGRATION_LOCK_TIMEOUT_MS',
  'IMPETUS_MIGRATION_LOCK_NAMESPACE',
  'IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS',
  'IMPETUS_ALLOW_PARTIAL_ENV',
  // Pipeline cognitivo (existentes)
  'IMPETUS_STRICT_AI_PIPELINE',
  'IMPETUS_ENFORCE_AI_ORCHESTRATOR_GATE',
  'IMPETUS_ENFORCE_GEMINI_INGRESS',
  'IMPETUS_ENFORCE_GEMINI_INGRESS_GLOBAL',
  'IMPETUS_GEMINI_INGRESS_ENABLED',
  'UNIFIED_DECISION_ENGINE',
  'UNIFIED_DECISION_USE_TRIADE',
  'USE_DECISION_FACADE',
  // Contextual / Motor A/B
  'IMPETUS_CONTEXTUAL_MODULES',
  'IMPETUS_CONTEXTUAL_SYSTEM_ADMIN',
  'IMPETUS_DASHBOARD_ENGINE_V2',
  'IMPETUS_GOVERNANCE_ENABLED',
  'IMPETUS_EVENT_PIPELINE_ENABLED',
  'IMPETUS_EVENT_PIPELINE_SHADOW',
  // Enterprise authority
  'IMPETUS_COGNITIVE_AUTHORITY_ROUTER_ENABLED',
  'AI_POLICY_ENGINE_ENABLED',
  // Support recovery
  'IMPETUS_SUPPORT_RECOVERY_ENABLED',
  // Observabilidade
  'SYSTEM_METRICS_CRON_ENABLED',
  'OPERATIONAL_BRAIN_CRON_ENABLED',
  'DATA_LIFECYCLE_CRON_ENABLED',
  'ENABLE_NEXUS_TOKEN_BILLING_CRON',
  // Auth
  'JWT_SECRET',
  'IMPETUS_ADMIN_JWT_SECRET',
  'ALLOWED_ORIGINS',
  // Plataforma
  'NODE_ENV',
  'PORT'
];

const SENSITIVE_FLAGS = new Set([
  'JWT_SECRET',
  'IMPETUS_ADMIN_JWT_SECRET',
  'HEALTH_DETAIL_KEY'
]);

/**
 * Regras declarativas de combinação inválida.
 * Cada regra: { id, severity: 'error'|'warn', when: () => boolean, message: string }
 * Não bloqueia o boot por defeito — apenas regista. Em produção, severidade
 * 'error' poderá ser amplificada por process.exit no futuro (gate aditivo).
 */
const RULES = [
  {
    id: 'STRICT_AI_PIPELINE_REQUIRES_GATE',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_STRICT_AI_PIPELINE || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_ENFORCE_AI_ORCHESTRATOR_GATE || '').toLowerCase() === 'false',
    message:
      'STRICT_AI_PIPELINE=true sem ENFORCE_AI_ORCHESTRATOR_GATE — gate efectivo pode não ser aplicado.'
  },
  {
    id: 'INTERNAL_DEV_OPEN_IN_PROD',
    severity: 'error',
    when: () =>
      String(process.env.NODE_ENV || '').toLowerCase() === 'production' &&
      String(process.env.IMPETUS_INTERNAL_ROUTES_DEV_OPEN || '').toLowerCase() === 'true',
    message:
      'IMPETUS_INTERNAL_ROUTES_DEV_OPEN=true em produção — rotas internas seriam acessíveis sem auth. Corrija imediatamente.'
  },
  {
    id: 'ALLOW_TOKEN_IN_QUERY_IN_PROD',
    severity: 'warn',
    when: () =>
      String(process.env.NODE_ENV || '').toLowerCase() === 'production' &&
      String(process.env.IMPETUS_ALLOW_TOKEN_IN_QUERY || '').toLowerCase() === 'true',
    message:
      'IMPETUS_ALLOW_TOKEN_IN_QUERY=true em produção — tokens podem vazar via logs / Referer.'
  },
  {
    id: 'STRICT_TENANT_DISABLED',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_STRICT_TENANT_FROM_DB || 'true').toLowerCase() === 'false',
    message:
      'IMPETUS_STRICT_TENANT_FROM_DB=false — JWT pode preencher company_id ausente na BD (vetor multi-tenant).'
  },
  {
    id: 'CONTEXTUAL_REPLACE_WITHOUT_FALLBACK',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_CONTEXTUAL_MODULES || '').toLowerCase() === 'replace',
    message:
      'IMPETUS_CONTEXTUAL_MODULES=replace activo — confirme que registry cobre todos os perfis ou activará "apagão" para utilizadores não mapeados.'
  },
  {
    id: 'EVENT_PIPELINE_SHADOW_WITHOUT_ENABLED',
    severity: 'warn',
    when: () =>
      String(process.env.IMPETUS_EVENT_PIPELINE_SHADOW || '').toLowerCase() === 'true' &&
      String(process.env.IMPETUS_EVENT_PIPELINE_ENABLED || '').toLowerCase() !== 'true',
    message:
      'IMPETUS_EVENT_PIPELINE_SHADOW=true sem IMPETUS_EVENT_PIPELINE_ENABLED=true — shadow não é amostrado.'
  }
];

let _snapshot = null;
let _validation = null;

function _maskValue(name, value) {
  if (value == null) return null;
  if (SENSITIVE_FLAGS.has(name)) {
    const s = String(value);
    if (!s) return '';
    return `[redacted:${s.length}chars]`;
  }
  return String(value);
}

function buildSnapshot() {
  const out = {};
  for (const f of KNOWN_FLAGS) {
    if (process.env[f] != null) out[f] = _maskValue(f, process.env[f]);
  }
  out.__captured_at = new Date().toISOString();
  return out;
}

function validate(snapshot) {
  const results = [];
  for (const r of RULES) {
    try {
      if (r.when()) {
        results.push({ id: r.id, severity: r.severity, message: r.message });
      }
    } catch (_e) {
      /* ignore */
    }
  }
  return { ok: results.every((r) => r.severity !== 'error'), findings: results };
}

/**
 * Captura o snapshot uma vez (idempotente em hot reload defensivo) e valida.
 * Devolve o relatório para o caller (server.js) decidir como apresentar.
 */
function bootstrap() {
  if (_snapshot && _validation) return { snapshot: _snapshot, validation: _validation };
  _snapshot = buildSnapshot();
  _validation = validate(_snapshot);
  try {
    console.info(
      '[FEATURE_GOVERNANCE_SNAPSHOT]',
      JSON.stringify({
        event: 'FEATURE_GOVERNANCE_SNAPSHOT',
        flags_set_count: Object.keys(_snapshot).length - 1,
        findings: _validation.findings
      })
    );
    for (const f of _validation.findings) {
      if (f.severity === 'error') {
        console.error('[FEATURE_GOVERNANCE_ERROR]', JSON.stringify(f));
      } else {
        console.warn('[FEATURE_GOVERNANCE_WARN]', JSON.stringify(f));
      }
    }
  } catch (_e) {
    /* ignore */
  }
  return { snapshot: _snapshot, validation: _validation };
}

/**
 * Leitura cacheada para hot path. Defaults preservados.
 */
function getFlag(name, fallback = undefined) {
  if (!_snapshot) bootstrap();
  if (Object.prototype.hasOwnProperty.call(_snapshot, name)) return _snapshot[name];
  if (process.env[name] != null) return process.env[name];
  return fallback;
}

function getValidation() {
  if (!_validation) bootstrap();
  return _validation;
}

function getSnapshot() {
  if (!_snapshot) bootstrap();
  return { ..._snapshot };
}

module.exports = {
  bootstrap,
  getFlag,
  getSnapshot,
  getValidation,
  KNOWN_FLAGS
};
