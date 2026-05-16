'use strict';

const fs = require('fs');
const path = require('path');
const { check, phaseResult } = require('./common/readinessResult');

const REPO = path.resolve(__dirname, '../../../..');
const BACKEND = path.resolve(__dirname, '../../..');

function validate() {
  const checks = [];
  const main = path.join(BACKEND, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(main, 'utf8'));
  checks.push(check('backend_main_points_to_server', pkg.main === 'src/server.js'));

  const entry = path.join(BACKEND, 'src/server.js');
  checks.push(check('server_entry_exists', fs.existsSync(entry)));

  const pm2Hints = fs.existsSync(path.join(REPO, 'RESTART_SAFETY_AUDIT.md'));
  checks.push(
    check(
      'repo_has_pm2_ops_doc',
      pm2Hints,
      'warn',
      pm2Hints ? 'ok' : 'Falta RESTART_SAFETY_AUDIT.md na raiz — documentar procedimento PM2.'
    )
  );

  const hasEco =
    fs.existsSync(path.join(REPO, 'ecosystem.config.cjs')) || fs.existsSync(path.join(REPO, 'ecosystem.config.js'));
  checks.push(
    check(
      'pm2_process_config_in_repo',
      hasEco,
      'warn',
      hasEco ? 'ok' : 'ecosystem PM2 não encontrado na raiz — validar configuração no host de deploy.'
    )
  );

  checks.push(
    check(
      'graceful_shutdown_not_validated_here',
      false,
      'warn',
      'SIGTERM/SIGINT e drains devem ser validados no processo PM2 real (fora deste suite estático).'
    )
  );

  return phaseResult('P16', 'PM2 / Runtime Stability (signals)', checks);
}

module.exports = { validate };
