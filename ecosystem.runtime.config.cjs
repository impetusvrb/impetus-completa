'use strict';

/**
 * MB-006 — adaptador de execução sobre o ecosystem certificado.
 *
 * Mantém ecosystem.config.js intocado e limita os alinhamentos a:
 * - resolução do script backend a partir do cwd;
 * - perfil development explícito no admin portal;
 * - bloqueio de namespaces backend nos processos web estáticos.
 */
const certified = require('./ecosystem.config.js');

const WEB_PROCESS_ENV_FILTERS = Object.freeze([
  'IMPETUS_',
  'DATABASE_',
  'DB_',
  'PG',
  'JWT_',
  'OIDC_',
  'OPENAI_',
  'ANTHROPIC_',
  'AWS_',
  'SMTP_',
  'REDIS_',
  'SECRET',
  'TOKEN',
  'PASSWORD',
  'PASS',
  'API_',
  'PRIVATE_',
  'ENCRYPTION_',
  'ENC_',
  'CREDENTIAL',
  'AUTHORIZATION',
  'COOKIE',
  'SESSION'
]);

module.exports = {
  ...certified,
  apps: certified.apps.map((app) => {
    if (app.name === 'impetus-backend') {
      return {
        ...app,
        script: './src/server.js',
        // O shutdown interno possui watchdog de 12 s; PM2 deve aguardar além dele.
        kill_timeout: 15000
      };
    }

    if (app.name === 'impetus-frontend' || app.name === 'impetus-admin-portal') {
      return {
        ...app,
        filter_env: WEB_PROCESS_ENV_FILTERS,
        env: {
          ...app.env,
          NODE_ENV: 'development'
        }
      };
    }

    return { ...app };
  })
};
