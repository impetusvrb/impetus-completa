/**
 * IMPETUS — PM2 ecosystem Frontend (Container Docker)
 * CERT-ONPREM-CONTAINER-01
 *
 * Adaptador de empacotamento — NÃO substitui ecosystem.config.js certificado (host PM2).
 * Mesmo comando npm run preview:prod; paths/logs ajustados ao container.
 *
 * Host PM2 oficial: /ecosystem.config.js
 */
module.exports = {
  apps: [
    {
      name: 'impetus-frontend',
      script: 'npm',
      args: 'run preview:prod',
      cwd: '/app/frontend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      kill_timeout: 12000,
      env: {
        NODE_ENV: 'development',
        SERVE_DIST_HOST: '0.0.0.0',
        SERVE_DIST_PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        SERVE_DIST_PORT: 3000,
      },
      error_file: '/opt/impetus/logs/frontend/error.log',
      out_file: '/opt/impetus/logs/frontend/out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
    },
  ],
};
