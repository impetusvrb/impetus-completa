'use strict';

/**
 * Carregamento de variáveis de ambiente — IMPETUS_HOME/config/.env + fallback legado.
 * CERT-ONPREM-DATA-01
 */

const fs = require('fs');
const path = require('path');

let _loaded = false;

function loadEnvFiles(paths, environment = process.env) {
  const dotenv = require('dotenv');
  const merged = {};
  const seen = new Set();

  for (const candidate of paths) {
    const normalized = path.normalize(candidate);
    if (seen.has(normalized) || !fs.existsSync(candidate)) continue;
    seen.add(normalized);
    Object.assign(merged, dotenv.parse(fs.readFileSync(candidate)));
  }

  for (const [key, value] of Object.entries(merged)) {
    if (!Object.prototype.hasOwnProperty.call(environment, key)) {
      environment[key] = value;
    }
  }

  return environment;
}

function loadImpetusEnv() {
  if (_loaded) return;
  _loaded = true;

  const home = require('./impetusHome');
  const legacy = home.legacyEnvFilePath();
  const primary = home.envFilePath();

  // Ordem crescente de precedência: cwd < legado < primário < process.env.
  loadEnvFiles([path.resolve(process.cwd(), '.env'), legacy, primary]);
}

module.exports = {
  loadImpetusEnv,
  loadEnvFiles,
};
