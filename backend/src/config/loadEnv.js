'use strict';

/**
 * Carregamento de variáveis de ambiente — IMPETUS_HOME/config/.env + fallback legado.
 * CERT-ONPREM-DATA-01
 */

const fs = require('fs');
const path = require('path');

let _loaded = false;

function loadImpetusEnv() {
  if (_loaded) return;
  _loaded = true;

  const dotenv = require('dotenv');
  const home = require('./impetusHome');

  dotenv.config();

  const legacy = home.legacyEnvFilePath();
  if (fs.existsSync(legacy)) {
    dotenv.config({ path: legacy, override: false });
  }

  const primary = home.envFilePath();
  if (fs.existsSync(primary) && path.normalize(primary) !== path.normalize(legacy)) {
    dotenv.config({ path: primary, override: true });
  } else if (fs.existsSync(legacy)) {
    dotenv.config({ path: legacy, override: true });
  }
}

module.exports = {
  loadImpetusEnv,
};
