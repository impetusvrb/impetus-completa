/**
 * IMPETUS — PM2 ecosystem Backend (Container Docker)
 * CERT-ONPREM-CONTAINER-01
 *
 * Adaptador de empacotamento — NÃO substitui ecosystem.config.js certificado (host PM2).
 * Mesmo script, mesmos parâmetros de runtime; apenas paths e logs ajustados ao layout container.
 *
 * Host PM2 oficial: /ecosystem.config.js
 */
module.exports = {
  apps: [
    {
      name: 'impetus-backend',
      script: './src/server.js',
      cwd: '/app/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      kill_timeout: 12000,
      listen_timeout: 15000,
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
        LISTEN_HOST: '0.0.0.0',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      error_file: '/opt/impetus/logs/backend/error.log',
      out_file: '/opt/impetus/logs/backend/out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
    },
  ],
};
