/**
 * PM2 - Process Manager para produção
 * Uso: pm2 start ecosystem.config.cjs
 *
 * Garante restart automático em caso de crash e alta disponibilidade
 * em ambiente industrial.
 */
module.exports = {
  apps: [{
    name: 'impetus-backend',
    script: 'src/index.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: { NODE_ENV: 'development' },
    env_production: { NODE_ENV: 'production' },
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
