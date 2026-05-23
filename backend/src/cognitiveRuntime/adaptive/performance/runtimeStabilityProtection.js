'use strict';

const crypto = require('crypto');

function protectRuntimeStability(a = {}, b = {}) {
  const h1 = crypto.createHash('sha256').update(JSON.stringify(a)).digest('hex').slice(0, 12);
  const h2 = crypto.createHash('sha256').update(JSON.stringify(b)).digest('hex').slice(0, 12);
  return { deterministic: h1 === h2, hash_a: h1, hash_b: h2 };
}

module.exports = { protectRuntimeStability };
