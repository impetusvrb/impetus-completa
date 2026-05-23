'use strict';

const crypto = require('crypto');

function stableHash(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 16);
}

function validateProductionRuntimeStability(snapshotA = {}, snapshotB = {}) {
  const h1 = stableHash(snapshotA);
  const h2 = stableHash(snapshotB);
  return {
    runtime_stable: h1 === h2,
    hash_a: h1,
    hash_b: h2,
    oscillation: h1 !== h2,
    mutation_detected: snapshotA.global_replace !== snapshotB.global_replace
  };
}

module.exports = { validateProductionRuntimeStability, stableHash };
