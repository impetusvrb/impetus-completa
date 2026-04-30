'use strict';

/**
 * Rollout controlado (canary) + fail-safe + circuit breaker para chatAIService.consolidated
 *
 * Ativação segura + rollout determinístico (todas obrigatórias para tentar consolidado):
 *   CHAT_ENABLE_CONSOLIDATED=true
 *   CHAT_SAFE_MODE=true
 *   CHAT_ROLLOUT_PERCENT=0–100 (omitido → 0; bucket: hash(conversationId) < percent)
 *
 * Rollback: desativar CHAT_ENABLE_CONSOLIDATED ou CHAT_SAFE_MODE; CHAT_ROLLOUT_PERCENT=0 — reiniciar processo.
 *
 * // [REVIEW_REQUIRED] handleAIMessage(conversationId, …) não inclui userId; a chave de bucket usa
 * // conversationId (1.º argumento) até o contrato expor userId sem quebrar callers.
 *
 * // PROMOVER CONSOLIDADO SE:
 * // - taxa de erro <= legado
 * // - tempo médio <= legado
 * // - sem novos tipos de erro
 * // - comportamento consistente
 *
 * // REVERTER SE:
 * // - aumento de erros
 * // - latência pior
 * // - respostas inconsistentes
 */

let failureCount = 0;
let circuitOpen = false;

let legacyModule;
let consolidatedModule = null;
let consolidatedLoadAttempted = false;
let consolidatedLoadFailed = false;
let loggedConsolidatedReady = false;
let loggedSafeBlocked = false;

const chatMetricsService = require('./chatMetricsService');

function rolloutPercentConfigured() {
  const raw = Number(process.env.CHAT_ROLLOUT_PERCENT || 0);
  if (!Number.isFinite(raw)) return 0;
  return Math.min(100, Math.max(0, raw));
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 100);
}

/** conversationId como chave; determinístico; sem key → false (fail-safe). */
function shouldUseConsolidated(key) {
  if (key == null || key === '') return false;

  const pct = rolloutPercentConfigured();
  if (pct <= 0) return false;

  const h = simpleHash(String(key));
  return h < pct;
}

function maybeLogSafeBlocked() {
  if (loggedSafeBlocked) return;
  if (process.env.CHAT_ENABLE_CONSOLIDATED === 'true' && process.env.CHAT_SAFE_MODE !== 'true') {
    loggedSafeBlocked = true;
    console.info('[CHAT_SAFE_BLOCKED]', 'safe mode não ativo; consolidado ignorado');
  }
}

function logRolloutDecision(key, version, selected) {
  console.info('[CHAT_ROLLOUT_DECISION]', {
    key: key == null || key === '' ? null : String(key),
    percent: rolloutPercentConfigured(),
    selected,
    version
  });
}

function isSafeModeOn() {
  return process.env.CHAT_SAFE_MODE === 'true';
}

function recordConsolidatedFailure() {
  failureCount += 1;
  if (failureCount >= 5 && !circuitOpen) {
    circuitOpen = true;
    console.warn('[CHAT_CIRCUIT_OPEN]', 'consolidado desativado após falhas repetidas');
  }
}

function recordConsolidatedSuccess() {
  const hadFailures = failureCount > 0;
  failureCount = 0;
  if (circuitOpen) {
    circuitOpen = false;
  }
  if (hadFailures) {
    console.info('[CHAT_CIRCUIT_RESET]', 'execução consolidada bem-sucedida após falhas');
  }
}

function isValidChatModule(mod) {
  return mod && typeof mod.handleAIMessage === 'function' && typeof mod.mentionsAI === 'function';
}

function isInvalidAIMessageResult(result) {
  if (result instanceof Error) return true;
  if (result === null) return true;
  return false;
}

function getConsolidated() {
  if (consolidatedLoadFailed) return null;
  if (consolidatedModule && isValidChatModule(consolidatedModule)) return consolidatedModule;
  if (consolidatedLoadAttempted && !consolidatedModule) return null;
  consolidatedLoadAttempted = true;
  try {
    consolidatedModule = require('./chatAIService.consolidated');
    if (!isValidChatModule(consolidatedModule)) {
      console.warn('[CHAT_FAILOVER]', 'Consolidado carregado mas inválido');
      consolidatedModule = null;
      consolidatedLoadFailed = true;
      return null;
    }
    if (!loggedConsolidatedReady) {
      console.info('[CHAT_SERVICE]', 'Módulo CONSOLIDADO disponível');
      loggedConsolidatedReady = true;
    }
    return consolidatedModule;
  } catch (err) {
    consolidatedLoadFailed = true;
    console.warn('[CHAT_FAILOVER]', 'Falha ao carregar consolidado', err?.message ?? err);
    return null;
  }
}

legacyModule = require('./chatAIService');
if (!isValidChatModule(legacyModule)) {
  console.warn('[CHAT_SERVICE_INVALID]', 'Serviço legacy inválido');
}

function wantsConsolidatedForKey(rolloutKey) {
  return (
    process.env.CHAT_ENABLE_CONSOLIDATED === 'true' && shouldUseConsolidated(rolloutKey)
  );
}

/** Resolve qual implementação usar para esta chamada (sem alterar contrato público). */
function pickModuleForRequest(rolloutKey) {
  maybeLogSafeBlocked();

  if (process.env.CHAT_ENABLE_CONSOLIDATED !== 'true') {
    logRolloutDecision(rolloutKey, 'legacy', false);
    return { mod: legacyModule, version: 'legacy' };
  }

  if (!isSafeModeOn()) {
    logRolloutDecision(rolloutKey, 'legacy', false);
    return { mod: legacyModule, version: 'legacy' };
  }

  if (circuitOpen) {
    logRolloutDecision(rolloutKey, 'legacy', false);
    return { mod: legacyModule, version: 'legacy' };
  }

  if (!shouldUseConsolidated(rolloutKey)) {
    logRolloutDecision(rolloutKey, 'legacy', false);
    return { mod: legacyModule, version: 'legacy' };
  }

  const c = getConsolidated();
  if (c && isValidChatModule(c)) {
    logRolloutDecision(rolloutKey, 'consolidated', true);
    return { mod: c, version: 'consolidated' };
  }

  recordConsolidatedFailure();
  console.warn('[CHAT_FAILOVER]', 'Consolidado indisponível, usando legacy');
  logRolloutDecision(rolloutKey, 'legacy', true);
  return { mod: legacyModule, version: 'legacy' };
}

/** mentionsAI: consolidado só com CHAT_ENABLE + CHAT_SAFE_MODE + rollout; sem conversationId → legacy. */
function mentionsAIWrapped(content) {
  maybeLogSafeBlocked();

  if (!isSafeModeOn()) {
    return legacyModule.mentionsAI(content);
  }

  if (!wantsConsolidatedForKey(null)) {
    return legacyModule.mentionsAI(content);
  }

  if (circuitOpen) {
    return legacyModule.mentionsAI(content);
  }

  try {
    const c = getConsolidated();
    if (!c || !isValidChatModule(c)) {
      console.warn('[CHAT_FAILOVER]', 'mentionsAI: consolidado indisponível');
      return legacyModule.mentionsAI(content);
    }
    const out = c.mentionsAI(content);
    if (typeof out !== 'boolean') {
      throw new Error('mentionsAI consolidado retorno inválido');
    }
    return out;
  } catch (e) {
    console.warn('[CHAT_FAILOVER]', e?.message ?? String(e));
    return legacyModule.mentionsAI(content);
  }
}

function logMetricSuccess(version, start) {
  const durationMs = Date.now() - start;
  console.info('[CHAT_METRIC]', {
    version,
    duration_ms: durationMs,
    success: true
  });

  if (durationMs > 5000) {
    console.warn('[CHAT_SLOW_RESPONSE]', JSON.stringify({ version, duration_ms: durationMs }));
  }
}

function logMetricError(version, start, err) {
  const durationMs = Date.now() - start;
  console.warn('[CHAT_METRIC_ERROR]', {
    version,
    duration_ms: durationMs,
    error: err?.message ?? String(err)
  });
  console.warn('[CHAT_FAILURE]', JSON.stringify({ version, duration_ms: durationMs }));

  if (durationMs > 5000) {
    console.warn('[CHAT_SLOW_RESPONSE]', JSON.stringify({ version, duration_ms: durationMs }));
  }
}

async function handleAIMessageWrapped(...args) {
  const requestStart = Date.now();
  const rolloutKey = args[0] || null;

  maybeLogSafeBlocked();

  let picked = pickModuleForRequest(rolloutKey);

  console.info('[CHAT_FLOW]', {
    pipeline: picked.version,
    conversationId: rolloutKey != null && rolloutKey !== '' ? String(rolloutKey) : null
  });

  if (picked.version === 'consolidated') {
    const execConsolidatedStart = Date.now();
    try {
      const result = await picked.mod.handleAIMessage(...args);
      if (isInvalidAIMessageResult(result)) {
        throw new Error('Retorno inválido do consolidado');
      }
      recordConsolidatedSuccess();
      chatMetricsService.recordSuccess('consolidated', Date.now() - execConsolidatedStart);
      logMetricSuccess('consolidated', requestStart);
      return result;
    } catch (err) {
      chatMetricsService.recordError('consolidated', Date.now() - execConsolidatedStart);
      console.warn('[CHAT_FAILOVER]', err?.message ?? String(err));
      recordConsolidatedFailure();
      picked = { mod: legacyModule, version: 'legacy' };
    }
  }

  const execLegacyStart = Date.now();
  try {
    const result = await picked.mod.handleAIMessage(...args);
    chatMetricsService.recordSuccess(picked.version, Date.now() - execLegacyStart);
    logMetricSuccess(picked.version, requestStart);
    return result;
  } catch (err) {
    chatMetricsService.recordError(picked.version, Date.now() - execLegacyStart);
    logMetricError(picked.version, requestStart, err);
    throw err;
  }
}

module.exports = {
  handleAIMessage: handleAIMessageWrapped,
  mentionsAI: mentionsAIWrapped
};
