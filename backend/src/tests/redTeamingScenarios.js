'use strict';

/**
 * Ponto de entrada alternativo para a bateria Red Team (ISO 42001 / NIST AI RMF).
 * Executar: node src/tests/redTeamingScenarios.js
 */

const { runAll } = require('./securityScenarios');

runAll().catch((e) => {
  console.error('[redTeamingScenarios]', e);
  process.exit(1);
});
