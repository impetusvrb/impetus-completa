'use strict';

/**
 * SEC-21C — Rollback + snapshots (read-only).
 */

const fs = require('fs');
const path = require('path');

const DOCS = path.resolve(__dirname, '../../../docs');

function validateRollback() {
  const blocking = [];
  const sec21Rollback = path.join(DOCS, 'evidence/sec-21/rollback-env.snapshot.json');
  const sec21Activation = path.join(DOCS, 'evidence/sec-21/activation-latest.json');
  const promotionTarget = path.join(DOCS, 'evidence/sec-21/promotion-target.env');

  const snapshotExists = fs.existsSync(sec21Rollback);
  const activationEvidence = fs.existsSync(sec21Activation);
  const promotionReady = fs.existsSync(promotionTarget);

  let snapshotValid = false;
  if (snapshotExists) {
    try {
      const snap = JSON.parse(fs.readFileSync(sec21Rollback, 'utf8'));
      snapshotValid = !!(snap.flags || snap.env || Object.keys(snap).length > 0);
    } catch (_e) {
      snapshotValid = false;
    }
  }

  let restorePossible = snapshotExists && promotionReady;
  const rollbackReady = snapshotExists && snapshotValid && promotionReady;

  if (!snapshotExists) blocking.push({ code: 'ROLLBACK_SNAPSHOT_MISSING' });
  if (!snapshotValid) blocking.push({ code: 'ROLLBACK_SNAPSHOT_INVALID' });
  if (!promotionReady) blocking.push({ code: 'PROMOTION_TARGET_MISSING' });
  if (!activationEvidence) blocking.push({ code: 'SEC21_ACTIVATION_EVIDENCE_MISSING' });

  return {
    ok: rollbackReady,
    blocking: blocking.length > 0,
    rollbackReady,
    restorePossible,
    snapshotExists,
    snapshotValid,
    activationEvidence,
    promotionReady,
    rollbackPath: sec21Rollback,
    blockingFindings: blocking
  };
}

module.exports = { validateRollback };
