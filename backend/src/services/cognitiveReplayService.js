'use strict';

/**
 * Replay cognitivo temporal — só leitura, sem IA, sem mutar estado operacional.
 * Requer IMPETUS_COGNITIVE_REPLAY_ENABLED e persistência DB activa.
 */

const cognitiveDbPersistence = require('./cognitiveDbPersistenceService');

const MAX_PAYLOAD_CHARS = 50000;

const SENSITIVE_KEY =
  /^(password|passwd|pwd|secret|token|authorization|cookie|api[_-]?key|apikey|credit[_-]?card|private[_-]?key)$/i;

function isReplayEnabled() {
  return String(process.env.IMPETUS_COGNITIVE_REPLAY_ENABLED ?? '')
    .trim()
    .toLowerCase() === 'true';
}

function redactForReplay(value, depth = 0) {
  if (depth > 18) return '[MAX_DEPTH]';
  if (value == null) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((x) => redactForReplay(x, depth + 1));
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(String(k))) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = redactForReplay(v, depth + 1);
    }
  }
  return out;
}

function truncatePayloadTree(obj) {
  try {
    const s = JSON.stringify(obj);
    if (s.length <= MAX_PAYLOAD_CHARS) return obj;
    return {
      _truncated: true,
      approx_bytes: s.length,
      preview: s.slice(0, 12000) + '…'
    };
  } catch (_e) {
    return { _truncated: true, error: 'unserializable' };
  }
}

function sanitizePersistedPayload(payload) {
  if (payload == null) return {};
  const asObj = typeof payload === 'object' && !Array.isArray(payload) ? payload : { value: payload };
  const redacted = redactForReplay(asObj);
  return truncatePayloadTree(redacted);
}

/**
 * @param {string} interactionId
 * @param {string|null|undefined} companyId — isolamento tenant (UUID)
 */
async function replayInteraction(interactionId, companyId = null) {
  if (!isReplayEnabled()) {
    return { error: 'REPLAY_DISABLED' };
  }
  if (!cognitiveDbPersistence.isCognitiveDbEnabled()) {
    return { error: 'COGNITIVE_DB_DISABLED' };
  }

  try {
    const interaction = await cognitiveDbPersistence.getInteractionById(interactionId, companyId);

    if (!interaction) {
      try {
        console.log('[COGNITIVE_REPLAY_ERROR]', { code: 'INTERACTION_NOT_FOUND', id: interactionId });
      } catch (_e) {}
      return { error: 'INTERACTION_NOT_FOUND' };
    }

    const context = sanitizePersistedPayload(interaction.payload);

    const out = {
      interactionId: interaction.id,
      timestamp: interaction.created_at,
      context,
      reconstructed_state: {
        confidence: interaction.confidence,
        data_state: interaction.data_state,
        module: interaction.module
      }
    };

    try {
      console.log('[COGNITIVE_REPLAY]', { interactionId: out.interactionId });
    } catch (_e) {}

    return out;
  } catch (err) {
    try {
      console.warn('[COGNITIVE_REPLAY_ERROR]', { message: err?.message || err });
    } catch (_e) {}
    return { error: 'REPLAY_FAILED' };
  }
}

/**
 * @param {object} replay — saída de replayInteraction (sem error)
 * @param {{ confidence?: number|null, data_state?: string|null }} current
 */
function compareReplayWithCurrent(replay, current = {}) {
  if (!replay || replay.error || !replay.reconstructed_state) {
    return { error: 'INVALID_REPLAY' };
  }

  const rc = replay.reconstructed_state.confidence;
  const cc = current.confidence;
  let confidence_delta = null;
  if (
    rc != null &&
    cc != null &&
    Number.isFinite(Number(rc)) &&
    Number.isFinite(Number(cc))
  ) {
    confidence_delta = Number(cc) - Number(rc);
  }

  return {
    confidence_delta,
    data_state_changed: replay.reconstructed_state.data_state !== current.data_state
  };
}

/**
 * @param {string} dateIso
 */
async function getCognitiveSnapshotAt(dateIso) {
  if (!isReplayEnabled()) {
    return { error: 'REPLAY_DISABLED' };
  }
  if (!cognitiveDbPersistence.isCognitiveDbEnabled()) {
    return { error: 'COGNITIVE_DB_DISABLED' };
  }

  try {
    const snap = await cognitiveDbPersistence.getCognitiveSnapshotAt(dateIso);
    if (snap.error === 'INVALID_DATE' || snap.error === true) {
      try {
        console.warn('[COGNITIVE_REPLAY_ERROR]', { op: 'getCognitiveSnapshotAt', detail: snap.error });
      } catch (_e) {}
      return snap;
    }
    try {
      console.log('[COGNITIVE_SNAPSHOT]', {
        asOf: snap.asOf || dateIso,
        interactions: snap.interactions,
        proposals: snap.proposals,
        autonomousEvents: snap.autonomousEvents
      });
    } catch (_e) {}
    return snap;
  } catch (err) {
    try {
      console.warn('[COGNITIVE_REPLAY_ERROR]', { op: 'getCognitiveSnapshotAt', message: err?.message });
    } catch (_e) {}
    return {
      interactions: 0,
      proposals: 0,
      autonomousEvents: 0,
      enabled: true,
      error: true
    };
  }
}

module.exports = {
  isReplayEnabled,
  replayInteraction,
  compareReplayWithCurrent,
  getCognitiveSnapshotAt,
  redactForReplay,
  truncatePayloadTree
};
