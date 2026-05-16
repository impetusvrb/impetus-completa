'use strict';

/**
 * ENTERPRISE READINESS — Fase 3.1
 * Replay Integrity Validator
 *
 * Valida: ordering, causation chain, correlation chain, deduplicação, shadow replay consistency.
 */

/**
 * Valida a integridade de ordering numa sequência de eventos.
 * @param {object[]} events — must have .payload.seq
 * @returns {{ valid: boolean, violations: string[] }}
 */
function validateOrdering(events) {
  const violations = [];
  for (let i = 1; i < events.length; i++) {
    if (events[i].payload.seq < events[i - 1].payload.seq) {
      violations.push(`seq ${events[i].payload.seq} < previous ${events[i - 1].payload.seq} at index ${i}`);
    }
  }
  return { valid: violations.length === 0, violations };
}

/**
 * Valida a cadeia de causation: ev[i].causation_id === ev[i-1].correlation_id
 * @param {object[]} events
 */
function validateCausationChain(events) {
  const violations = [];
  for (let i = 1; i < events.length; i++) {
    if (events[i].causation_id !== events[i - 1].correlation_id) {
      violations.push(`event[${i}].causation_id=${events[i].causation_id} ≠ event[${i-1}].correlation_id=${events[i-1].correlation_id}`);
    }
  }
  return { valid: violations.length === 0, violations };
}

/**
 * Valida ausência de duplicados numa sequência.
 * @param {object[]} events
 */
function validateDeduplication(events) {
  const seen = new Set();
  const duplicates = [];
  for (const ev of events) {
    if (seen.has(ev.id)) { duplicates.push(ev.id); } else { seen.add(ev.id); }
  }
  return { valid: duplicates.length === 0, duplicates };
}

/**
 * Valida consistência entre replay original e replay shadow.
 * @param {object[]} original
 * @param {object[]} shadow
 */
function validateShadowConsistency(original, shadow) {
  if (original.length !== shadow.length) {
    return { consistent: false, reason: `length mismatch: ${original.length} vs ${shadow.length}` };
  }
  const divergences = [];
  for (let i = 0; i < original.length; i++) {
    if (original[i].id !== shadow[i].id) {
      divergences.push({ index: i, original_id: original[i].id, shadow_id: shadow[i].id });
    }
  }
  return { consistent: divergences.length === 0, divergences };
}

/**
 * Relatório completo de integridade.
 * @param {object[]} events
 * @param {object[]} [shadowEvents]
 */
function fullIntegrityReport(events, shadowEvents) {
  return {
    ordering: validateOrdering(events),
    causation_chain: validateCausationChain(events),
    deduplication: validateDeduplication(events),
    shadow_consistency: shadowEvents
      ? validateShadowConsistency(events, shadowEvents)
      : { consistent: true, reason: 'no_shadow_provided' },
    event_count: events.length
  };
}

module.exports = { validateOrdering, validateCausationChain, validateDeduplication, validateShadowConsistency, fullIntegrityReport };
