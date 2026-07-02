#!/usr/bin/env node
'use strict';

/** Health Enterprise — backend + layout. CERT-ONPREM-DATA-01 */

require('../../src/config/loadEnv').loadImpetusEnv();

const http = require('http');
const home = require('../../src/config/impetusHome');

const PORT = process.env.PORT || 4000;
const HOST = process.env.LISTEN_HOST || '127.0.0.1';

function getHealth() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://${HOST}:${PORT}/health`, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

(async () => {
  home.ensureEnterpriseDirs();
  console.log('[health-enterprise] layout:', home.isEnterpriseLayout() ? 'enterprise' : 'legacy');
  try {
    const h = await getHealth();
    if (h.status === 200 && h.body && h.body.status === 'ok') {
      console.log('[health-enterprise] backend OK', h.body.service || '');
      process.exit(0);
    }
    console.error('[health-enterprise] backend resposta inesperada', h.status, h.body);
    process.exit(1);
  } catch (e) {
    console.error('[health-enterprise] backend indisponível:', e.message);
    process.exit(1);
  }
})();
