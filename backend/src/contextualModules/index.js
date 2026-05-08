'use strict';

/**
 * Contextual Module Layer — Façade (Phase 6)
 * ==========================================
 *
 *   enhanceVisibleModulesWithContext(legacyVisibleModules, user, opts)
 *     → { visibleModules, contextualModules, meta }
 *
 * Comportamento por modo (resolvido por modulePromotionGuard):
 *
 *   - off     : visibleModules = legacy (intacto), contextualModules = []
 *   - shadow  : visibleModules = legacy (intacto), contextualModules computado
 *               e devolvido (frontend ignora — chave aditiva). Telemetria
 *               regista o diff.
 *   - enrich  : visibleModules = união(legacy, orchestrated.menu_keys)
 *   - replace : visibleModules = orchestrated.menu_keys ∪ universals (sempre)
 *               com fallback automático para `enrich` se o validator
 *               sinalizar high-severity.
 *
 * GARANTIAS:
 *
 *   - nunca lança: qualquer erro interno → devolve legacy (modo `off`)
 *     e regista failure no circuit-breaker.
 *   - nunca remove módulos do array `visibleModules` salvo em modo
 *     `replace` (que ainda preserva universals).
 *   - sempre devolve um array `visibleModules` (não muta o input).
 *   - sempre devolve um array `contextualModules` (mesmo que vazio).
 */

const { buildContextualIdentity } = require('../dashboardEngineV2/identity/identityResolver');
const orchestrator = require('./moduleOrchestrator');
const validator = require('./moduleValidator');
const telemetry = require('./moduleTelemetry');
const guard = require('./modulePromotionGuard');
const registry = require('./moduleRegistry');

let _learningHooks = null;
function _getLearningHooks() {
  if (_learningHooks !== null) return _learningHooks;
  try { _learningHooks = require('../dashboardEngineV2/learning/learningHooks'); }
  catch (_) { _learningHooks = false; }
  return _learningHooks;
}

const UNIVERSAL_MENU_KEYS = registry.getAllModules()
  .filter((m) => m.universal === true && m.menu_key)
  .map((m) => m.menu_key);

function _hrtimeMs(start) {
  if (!start) return null;
  const diff = process.hrtime(start);
  return Math.round((diff[0] * 1e9 + diff[1]) / 1e6);
}

function _uniqueArray(arr) {
  const seen = new Set();
  const out = [];
  for (const v of arr) if (v && !seen.has(v)) { seen.add(v); out.push(v); }
  return out;
}

function _emitTrace(name, payload) {
  try {
    const verbose = String(process.env.IMPETUS_CONTEXTUAL_MODULES_LOG_LEVEL || 'normal').toLowerCase();
    if (verbose === 'silent') return;
    const line = `[CONTEXTUAL_MODULES] ${name} ` + JSON.stringify(payload);
    if (verbose === 'verbose') console.log(line);
    else if (name === 'failure' || name === 'circuit') console.warn(line);
  } catch (_) { /* never throw */ }
}

/**
 * Calcula o "diff" entre o array legacy e os menu_keys propostos.
 */
function _diffMenuKeys(legacy, contextual) {
  const lset = new Set(legacy);
  const cset = new Set(contextual);
  const added = [];
  const removed = [];
  for (const k of cset) if (!lset.has(k)) added.push(k);
  for (const k of lset) if (!cset.has(k)) removed.push(k);
  return { added: added.sort(), removed: removed.sort(), legacy_size: lset.size, contextual_size: cset.size };
}

/**
 * Façade principal. Não lança em circunstância alguma.
 */
function enhanceVisibleModulesWithContext(legacyVisibleModules, user, opts) {
  const t0 = process.hrtime();
  const legacy = Array.isArray(legacyVisibleModules) ? legacyVisibleModules.slice() : [];
  const safeUser = user || {};
  let mode = 'off';
  let directiveDetail = null;

  // Defaults seguros
  let resultVisible = legacy.slice();
  let resultContextual = [];
  let validatorOut = null;
  let orchestrated = null;
  let identity = null;
  let fallback = false;
  let overloaded = false;
  let diff = null;

  try {
    identity = buildContextualIdentity(safeUser);

    // Pré-decisão: orquestrar pode ser caro? não é. Mas se circuito aberto / off,
    // pulamos para minimizar custo — exceto em shadow precisamos calcular.
    const directive = guard.resolveMode({
      area: identity.area,
      function_type: identity.function_type,
      company_id: identity.company_id,
      user_id: identity.user_id
    });
    mode = directive.mode;
    directiveDetail = directive;

    if (mode === 'off') {
      // contextualizamos meta mínima e saímos
      resultVisible = legacy.slice();
      resultContextual = [];
    } else {
      orchestrated = orchestrator.orchestrate(identity);
      validatorOut = validator.validateComposition({
        identity,
        allowed_module_ids: orchestrated.allowed_module_ids
      });
      overloaded = orchestrated.overloaded === true;

      // Reavalia mode com validator (downgrade replace→enrich se trust baixo)
      const directive2 = guard.resolveMode({
        area: identity.area,
        function_type: identity.function_type,
        company_id: identity.company_id,
        user_id: identity.user_id,
        validator: validatorOut
      });
      mode = directive2.mode;
      directiveDetail = directive2;

      // Em modo shadow: visibleModules permanece legacy
      if (mode === 'shadow') {
        resultVisible = legacy.slice();
        resultContextual = orchestrated.contextual_modules.slice();
      } else if (mode === 'enrich') {
        const union = _uniqueArray(legacy.concat(orchestrated.menu_keys));
        // garantia universals
        resultVisible = _uniqueArray(union.concat(UNIVERSAL_MENU_KEYS));
        resultContextual = orchestrated.contextual_modules.slice();
      } else if (mode === 'replace') {
        // se há high severity, downgrade automático para enrich
        if (validatorOut && validatorOut.counts && validatorOut.counts.high > 0) {
          const union = _uniqueArray(legacy.concat(orchestrated.menu_keys));
          resultVisible = _uniqueArray(union.concat(UNIVERSAL_MENU_KEYS));
          resultContextual = orchestrated.contextual_modules.slice();
          fallback = true;
          mode = 'enrich_after_replace_fallback';
          directiveDetail = { ...directiveDetail, fallback_reason: 'high_severity_findings' };
        } else {
          resultVisible = _uniqueArray(orchestrated.menu_keys.concat(UNIVERSAL_MENU_KEYS));
          resultContextual = orchestrated.contextual_modules.slice();
        }
      } else {
        // unknown mode: defensive
        resultVisible = legacy.slice();
        resultContextual = [];
      }

      diff = _diffMenuKeys(legacy, orchestrated.menu_keys);
    }

    guard.recordSuccess();
  } catch (err) {
    guard.recordFailure('enhance');
    fallback = true;
    mode = 'off';
    resultVisible = legacy.slice();
    resultContextual = [];
    _emitTrace('failure', { error: err && err.message ? err.message : String(err) });
  }

  const latencyMs = _hrtimeMs(t0);

  // Telemetria
  try {
    telemetry.recordResolution({
      user_id: identity?.user_id ?? safeUser.id ?? null,
      company_id: identity?.company_id ?? safeUser.company_id ?? null,
      area: identity?.area ?? null,
      function_type: identity?.function_type ?? null,
      mode,
      legacy_count: legacy.length,
      contextual_count: resultContextual.length,
      allowed_module_ids: orchestrated?.allowed_module_ids || [],
      denied: orchestrated?.denied || [],
      validator: validatorOut
        ? { valid: validatorOut.valid, trust_score: validatorOut.trust_score, counts: validatorOut.counts }
        : null,
      latency_ms: latencyMs,
      fallback,
      overloaded,
      diff
    });
  } catch (_) { /* never break flow */ }

  // Hook ML futuro (no-op estrutural)
  try {
    const lh = _getLearningHooks();
    if (lh && typeof lh.notifyWidgetSelection === 'function') {
      // reutilizamos um hook existente: apenas como emissor estrutural
      lh.notifyWidgetSelection({
        kind: 'contextual_module_resolution',
        user_id: identity?.user_id ?? null,
        function_type: identity?.function_type ?? null,
        area: identity?.area ?? null,
        allowed_module_ids: orchestrated?.allowed_module_ids || [],
        mode
      });
    }
  } catch (_) { /* never break */ }

  // Trace estruturado opcional
  if (opts?.trace !== false) {
    _emitTrace('resolve', {
      mode,
      area: identity?.area ?? null,
      function_type: identity?.function_type ?? null,
      latency_ms: latencyMs,
      validator: validatorOut?.counts ?? null
    });
  }

  return {
    visibleModules: resultVisible,
    contextualModules: resultContextual,
    meta: {
      mode,
      directive: directiveDetail,
      validator: validatorOut,
      orchestrator: orchestrated
        ? {
            allowed: orchestrated.allowed_module_ids,
            denied: orchestrated.denied,
            critical_required: orchestrated.critical_required,
            forbidden_required: orchestrated.forbidden_required,
            overloaded: orchestrated.overloaded,
            trace: orchestrated.trace
          }
        : null,
      identity_summary: identity
        ? {
            area: identity.area,
            function_type: identity.function_type,
            hierarchy_level: identity.hierarchy_level,
            primary_axis: identity.primary_axis,
            scope: identity.scope
          }
        : null,
      diff,
      latency_ms: latencyMs,
      fallback,
      circuit: guard.getCircuitState()
    }
  };
}

function getTelemetrySummary(opts) {
  return telemetry.summary(opts || {});
}

function recordUsage(entry) {
  return telemetry.recordUsage(entry);
}

module.exports = {
  enhanceVisibleModulesWithContext,
  getTelemetrySummary,
  recordUsage,
  // sub-modules expostos para tests/admin
  registry,
  orchestrator,
  validator,
  guard,
  telemetry,
  flags: require('./moduleFlags'),
  capabilities: require('./moduleCapabilities')
};
