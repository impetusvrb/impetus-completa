'use strict';

/**
 * IMPETUS — Authority Resolution Service (Enterprise Hardening Bloco 7)
 *
 * Camada **observadora** que normaliza meta-dados de autoridade num
 * envelope canónico. NÃO substitui o conselho cognitivo nem o gateway
 * V2; apenas garante que cada resposta finalizada acarreta um campo
 * `meta.authority` mínimo e consistente:
 *
 *   {
 *     deciding_authority: 'orchestrator' | 'council' | 'gateway_v2' | 'policy' | 'fallback' | string,
 *     engine: 'A' | 'B' | 'fallback' | 'unknown',
 *     degraded: boolean,
 *     fallback_reason: string | null,
 *     trace_id: string | null,
 *     precedence: ['policy','governance','authority_router','orchestrator','council','fallback'],
 *     resolved_at: ISO string
 *   }
 *
 * Aditivo: callers podem invocar `decorate(envelope, hints)` antes de
 * devolver a resposta HTTP. Comportamento legado é preservado se o
 * caller não usar este serviço.
 *
 * Não toca em dados de negócio nem em `synthesis.content`. Apenas grava
 * meta-dados auditáveis.
 */

const PRECEDENCE_ORDER = Object.freeze([
  'policy',
  'governance',
  'authority_router',
  'orchestrator',
  'council',
  'fallback'
]);

function _coalesce(...values) {
  for (const v of values) {
    if (v != null && v !== '') return v;
  }
  return null;
}

function _normalizeEngine(input) {
  const s = String(input || '').toLowerCase();
  if (s === 'a' || s === 'motor_a' || s === 'engine_a' || s === 'motora') return 'A';
  if (s === 'b' || s === 'motor_b' || s === 'engine_b' || s === 'motorb') return 'B';
  if (s === 'fallback' || s === 'fallback_engine') return 'fallback';
  return 'unknown';
}

function _normalizeAuthority(input) {
  const s = String(input || '').toLowerCase();
  if (!s) return 'unknown';
  if (s.includes('council')) return 'council';
  if (s.includes('orchestrator')) return 'orchestrator';
  if (s.includes('gateway_v2') || s === 'b' || s.includes('motor_b')) return 'gateway_v2';
  if (s.includes('policy')) return 'policy';
  if (s.includes('governance')) return 'governance';
  if (s.includes('fallback')) return 'fallback';
  return s;
}

/**
 * Resolve metadata canónica a partir de hints heterogéneos.
 * @param {object} hints — { deciding_authority, engine, degraded, fallback_reason, trace_id, dossier, gatewayMeta, policyResult }
 * @returns {object} authorityMeta
 */
function resolveAuthorityMeta(hints = {}) {
  const trace = _coalesce(
    hints.trace_id,
    hints.dossier?.meta?.trace_id,
    hints.gatewayMeta?.trace_id
  );
  const decidingRaw = _coalesce(
    hints.deciding_authority,
    hints.dossier?.meta?.deciding_authority,
    hints.dossier?.meta?.authority,
    hints.gatewayMeta?.deciding_authority
  );
  const engineRaw = _coalesce(
    hints.engine,
    hints.dossier?.meta?.engine,
    hints.gatewayMeta?.engine
  );
  const degraded = !!(
    hints.degraded ||
    hints.dossier?.meta?.degraded ||
    hints.gatewayMeta?.degraded
  );
  const fallbackReason = _coalesce(
    hints.fallback_reason,
    hints.dossier?.meta?.fallback_reason,
    hints.gatewayMeta?.fallback_reason
  );
  const decidingAuthority = _normalizeAuthority(
    decidingRaw || (fallbackReason ? 'fallback' : (engineRaw ? engineRaw : null))
  );
  const engine = _normalizeEngine(engineRaw || (decidingAuthority === 'fallback' ? 'fallback' : null));
  return {
    deciding_authority: decidingAuthority,
    engine,
    degraded,
    fallback_reason: fallbackReason || null,
    trace_id: trace || null,
    precedence: PRECEDENCE_ORDER,
    resolved_at: new Date().toISOString()
  };
}

/**
 * Decora um envelope de resposta com `meta.authority`. Não altera campos
 * existentes nem o `content`/`synthesis`. Idempotente.
 */
function decorate(envelope, hints = {}) {
  if (!envelope || typeof envelope !== 'object') return envelope;
  const out = envelope;
  const meta = out.meta && typeof out.meta === 'object' ? out.meta : (out.meta = {});
  const existing = meta.authority && typeof meta.authority === 'object' ? meta.authority : null;
  // Se já existe e está completa, não sobrepõe; apenas garante presença mínima.
  if (existing && existing.deciding_authority && existing.engine) {
    if (!existing.precedence) existing.precedence = PRECEDENCE_ORDER;
    if (!existing.resolved_at) existing.resolved_at = new Date().toISOString();
    return out;
  }
  meta.authority = resolveAuthorityMeta({
    ...hints,
    dossier: hints.dossier || meta.dossier || null,
    gatewayMeta: hints.gatewayMeta || meta.gateway || null
  });
  return out;
}

/**
 * Detecta inconsistências entre engines/authorities reportados em diferentes
 * fontes (gateway vs dossier vs explanation). Retorna lista de conflitos.
 */
function detectConflicts(envelope) {
  const conflicts = [];
  if (!envelope || typeof envelope !== 'object') return conflicts;
  const a = envelope?.meta?.authority?.deciding_authority || null;
  const b = envelope?.meta?.dossier?.meta?.deciding_authority || null;
  const c = envelope?.meta?.gateway?.deciding_authority || null;
  const list = [a, b, c].filter(Boolean);
  if (list.length >= 2 && new Set(list.map((s) => String(s).toLowerCase())).size > 1) {
    conflicts.push({ code: 'AUTHORITY_DIVERGENCE', values: list });
  }
  return conflicts;
}

module.exports = {
  PRECEDENCE_ORDER,
  resolveAuthorityMeta,
  decorate,
  detectConflicts
};
