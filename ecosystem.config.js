/**
 * IMPETUS — PM2 ecosystem config (produção)
 * 
 * Uso:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 restart ecosystem.config.js --env production --update-env
 */
module.exports = {
  apps: [
    {
      name: 'impetus-backend',
      script: './src/server.js',
      cwd: __dirname + '/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      // Reinicia antes do OOM V8 (~1.5G heap). Evita processo zumbi sem responder (502/504 no login admin).
      max_memory_restart: '1200M',
      // Heap via node_args (não NODE_OPTIONS em env — PM2 já aplicou como script args e invalidou o limite).
      node_args: '--max-old-space-size=1536',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      kill_timeout: 8000,
      listen_timeout: 15000,
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
        LISTEN_HOST: '0.0.0.0',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        LISTEN_HOST: '127.0.0.1',
        // Flags APPSEC-01 obrigatórias em produção (evitam dump PM2 stale bloquear o boot).
        LICENSE_VALIDATION_ENABLED: 'true',
        ADMIN_PORTAL_DEBUG_INVITE_LINK: 'false',
        NEXUS_CREDIT_WALLET: 'true',
        NEXUS_BILLING_ENGINE_V4: 'true',
        NEXUS_WALLET_ENFORCE: 'true',
      },
      error_file: '/root/.pm2/logs/impetus-backend-error.log',
      out_file: '/root/.pm2/logs/impetus-backend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
    },
    {
      name: 'impetus-frontend',
      script: 'npm',
      args: 'run preview:prod',
      cwd: __dirname + '/frontend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      env: {
        NODE_ENV: 'development',
        SERVE_DIST_HOST: '0.0.0.0',
        SERVE_DIST_PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        SERVE_DIST_HOST: '127.0.0.1',
        SERVE_DIST_PORT: 3000,
      },
      error_file: '/root/.pm2/logs/impetus-frontend-error.log',
      out_file: '/root/.pm2/logs/impetus-frontend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
    },
    {
      name: 'impetus-admin-portal',
      script: 'npm',
      args: 'run preview:prod',
      cwd: __dirname + '/admin-portal',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: '/root/.pm2/logs/impetus-admin-portal-error.log',
      out_file: '/root/.pm2/logs/impetus-admin-portal-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
    },
  ],
};
