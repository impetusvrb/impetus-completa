#!/usr/bin/env node
'use strict';

/**
 * Execução manual da IA proativa (padrões de falha + lembretes).
 * Substituto do antigo scripts/proactive-ai-worker.js.
 *
 * Uso: npm run proactive-ai
 */

require('../src/config/loadEnv').loadImpetusEnv();

const proactiveAI = require('../src/jobs/proactiveAI');

(async () => {
  const [patterns, reminders] = await Promise.all([
    proactiveAI.runFailurePatternCheck(),
    proactiveAI.remindIncompleteEvents(),
  ]);
  const ok = patterns.ok !== false && reminders.ok !== false;
  console.log(JSON.stringify({ ok, patterns, reminders }, null, 2));
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error('[proactive-ai-worker]', e.message);
  process.exit(1);
});
