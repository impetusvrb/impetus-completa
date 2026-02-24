#!/usr/bin/env node
/**
 * Script de health check para monitoramento (cron, UptimeRobot, etc)
 * Uso: node -r dotenv/config scripts/health-check.js [BASE_URL]
 * Exit 0 = healthy, 1 = unhealthy
 *
 * Exemplo cron (verificar a cada 5 min):
 * */5 * * * * cd /path/backend && node -r dotenv/config scripts/health-check.js http://localhost:4000
 */
require('dotenv').config();
const http = require('http');

const BASE = process.argv[2] || process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
const url = `${BASE.replace(/\/$/, '')}/health`;

function check() {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (ch) => (data += ch));
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.ok && j.db === 'connected') {
            resolve();
          } else {
            reject(new Error(j.error || `status=${j.status} db=${j.db}`));
          }
        } catch (e) {
          reject(new Error('Resposta inválida'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

check()
  .then(() => {
    console.log('[HEALTH] OK');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[HEALTH] FAIL:', err.message);
    process.exit(1);
  });
