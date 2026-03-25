#!/usr/bin/env node
/**
 * Testa o proxy /impetus-realtime: JWT + mensagem da OpenAI (session.updated ou erro explícito).
 * Uso: node scripts/test-realtime-ws.js
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });

const jwt = require('jsonwebtoken');
const WebSocket = require('ws');

const PORT = process.env.PORT || 4000;
const SECRET = process.env.JWT_SECRET || 'impetus_super_secreto_2026';
const HOST = process.env.REALTIME_TEST_HOST || '127.0.0.1';

const token = jwt.sign({ id: 999999, email: 'realtime-test@impetus.local' }, SECRET, {
  expiresIn: '5m'
});

const url = `ws://${HOST}:${PORT}/impetus-realtime?token=${encodeURIComponent(token)}`;

function main() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch (_) {}
      reject(new Error('Timeout: nenhuma mensagem em 20s'));
    }, 20000);

    const finish = (fn) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch (_) {}
      fn();
    };

    ws.on('open', () => {
      console.log('[OK] WebSocket cliente conectado ao proxy');
    });

    ws.on('message', (data) => {
      let j;
      try {
        j = JSON.parse(String(data));
      } catch {
        console.log('[RAW]', String(data).slice(0, 200));
        return;
      }
      const t = j.type || '';
      console.log('[EVENT]', t, t === 'error' ? JSON.stringify(j.error || j) : '');
      if (t === 'error') {
        finish(() => resolve({ ok: false, event: t, body: j }));
        return;
      }
      if (
        t === 'session.updated' ||
        t === 'session.created' ||
        (typeof t === 'string' && t.startsWith('session.'))
      ) {
        finish(() => resolve({ ok: true, event: t }));
      }
    });

    ws.on('error', (e) => {
      finish(() => reject(e));
    });

    ws.on('close', (code, reason) => {
      if (settled) return;
      if (code && code !== 1000 && code !== 1005) {
        finish(() => reject(new Error(`close ${code} ${String(reason || '')}`)));
      }
    });
  });
}

main()
  .then((r) => {
    if (r.ok === false) {
      console.error('[FALHA] OpenAI/devolveu erro:', JSON.stringify(r.body, null, 2));
      process.exit(1);
    }
    console.log('[SUCESSO] Proxy Realtime OK — evento:', r.event);
    process.exit(0);
  })
  .catch((e) => {
    console.error('[FALHA]', e.message || e);
    process.exit(1);
  });
