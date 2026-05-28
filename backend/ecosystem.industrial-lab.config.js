/**
 * PM2 — serviços lab industrial no MESMO host (127.0.0.1).
 * Mosquitto: systemd (mosquitto.service)
 * Uso: pm2 start ecosystem.industrial-lab.config.js
 */
module.exports = {
  apps: [
    {
      name: 'impetus-lab-modbus',
      script: 'scripts/industrial-lab-modbus-server.py',
      interpreter: 'python3',
      cwd: '/var/www/impetus-completa/backend',
      autorestart: true,
      max_restarts: 20,
    },
    {
      name: 'impetus-lab-opcua',
      script: 'scripts/industrial-lab-opcua-server.js',
      cwd: '/var/www/impetus-completa/backend',
      autorestart: true,
      max_restarts: 20,
    },
    {
      name: 'impetus-edge-agent-lab',
      script: 'scripts/edge-agent-physical-lab.js',
      cwd: '/var/www/impetus-completa/backend',
      autorestart: true,
      max_restarts: 20,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'impetus-lab-oidc',
      script: 'scripts/industrial-lab-oidc-provider.js',
      cwd: '/var/www/impetus-completa/backend',
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        IMPETUS_LAB_OIDC_PORT: '8080',
      },
    },
    {
      name: 'impetus-lab-smtp',
      script: 'scripts/industrial-lab-smtp.js',
      cwd: '/var/www/impetus-completa/backend',
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        IMPETUS_LAB_SMTP_PORT: '1025',
        IMPETUS_LAB_SMTP_WEB_PORT: '1080',
      },
    },
  ],
};
