'use strict';

const crypto = require('crypto');

function stableHash(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 16);
}

function validateEnvironmentalRuntimeStability(a = {}, b = {}) {
  const h1 = stableHash(a);
  const h2 = stableHash(b);
  return { environmental_runtime_stable: h1 === h2, hash_a: h1, hash_b: h2 };
}

module.exports = { validateEnvironmentalRuntimeStability, stableHash };
