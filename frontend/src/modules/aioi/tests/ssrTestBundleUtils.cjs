'use strict';

/**
 * Test-only SSR bundle loader — paths únicos por PID para evitar colisão em regressões aninhadas.
 */

const fs = require('fs');
const path = require('path');

function requireBundledModule(rootDir, label, bundleText) {
  const modPath = path.join(rootDir, `.test-ssr-${label}-${process.pid}-${Date.now()}.cjs`);
  fs.writeFileSync(modPath, bundleText);
  try {
    return require(modPath);
  } finally {
    try {
      delete require.cache[require.resolve(modPath)];
    } catch (_) {
      /* ignore */
    }
    try {
      fs.unlinkSync(modPath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
}

module.exports = { requireBundledModule };
