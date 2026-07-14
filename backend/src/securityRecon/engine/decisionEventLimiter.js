'use strict';

const flags = require('../config/securityReconFlags');

/** Dedup de publicação ANTI_RECON_DECISION — evita amplificação. */
const lastPublished = new Map();
const PUBLISH_COOLDOWN_MS = 60000;
const MAX_KEYS = 10000;

function keyFor(decision) {
  return `${decision.clientIp}:${decision.decision}`;
}

function prune() {
  if (lastPublished.size <= MAX_KEYS) return;
  const cutoff = Date.now() - PUBLISH_COOLDOWN_MS * 2;
  for (const [k, ts] of lastPublished) {
    if (ts < cutoff) lastPublished.delete(k);
  }
}

/**
 * Publica decisão somente em transição de estado ou após cooldown.
 * @returns {boolean} true se deve publicar
 */
function shouldPublishDecision(decision, previousBehaviorState) {
  if (!decision) return false;
  if (previousBehaviorState && previousBehaviorState !== decision.decision) {
    return true;
  }

  const k = keyFor(decision);
  const now = Date.now();
  const last = lastPublished.get(k) || 0;
  if (now - last < PUBLISH_COOLDOWN_MS) return false;

  lastPublished.set(k, now);
  prune();
  return true;
}

function markPublished(decision) {
  lastPublished.set(keyFor(decision), Date.now());
}

function clearAll() {
  lastPublished.clear();
}

module.exports = {
  shouldPublishDecision,
  markPublished,
  clearAll,
  PUBLISH_COOLDOWN_MS
};
