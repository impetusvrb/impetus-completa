'use strict';

/**
 * AUD-NOTIFICATION-CENTER-02-FIX — cenários frontend (static / integração leve)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '../../..');

function read(rel) {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅  ${label}`);
  } catch (e) {
    failed++;
    console.error(`  ❌  ${label}\n       ${e.message}`);
  }
}

console.log('\n  AUD-NC-02-FIX frontend scenarios\n');

test('F1 — Hook useNotificationCenter existe e exporta refresh/markRead', () => {
  const src = read('src/hooks/useNotificationCenter.js');
  assert(src.includes('export function useNotificationCenter'));
  assert(src.includes('app_notification'));
  assert(src.includes('markRead'));
});

test('F2 — Layout dropdown lista notificações com meta sent_at', () => {
  const src = read('src/components/Layout.jsx');
  assert(src.includes('header-dropdown__notif-list'));
  assert(src.includes('toLocaleString'));
});

test('F3 — api.js notifications client completo', () => {
  const src = read('src/services/api.js');
  assert(src.includes("api.get('/app-communications/notifications/unread-count')"));
  assert(src.includes('notifications/${id}/read'));
});

test('F4 — getSocket exportado para partilha com NC', () => {
  const src = read('src/chat-module/hooks/useChatSocket.js');
  assert(src.includes('export function getSocket'));
});

console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
