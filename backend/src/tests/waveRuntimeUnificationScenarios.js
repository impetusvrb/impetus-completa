'use strict';

/**
 * PROMPT 28 — Runtime unification scenarios.
 */

const ENV_KEYS = [
  'IMPETUS_RUNTIME_UNIFICATION_MODE',
  'IMPETUS_RUNTIME_UNIFICATION_ENABLED',
  'IMPETUS_RUNTIME_UNIFICATION_PILOT_TENANTS'
];

const PILOT = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';

let passed = 0;
let failed = 0;
const savedEnv = {};

function saveEnv() {
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
}
function restoreEnv() {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
}
function assert(label, condition) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}
function clearCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('runtimeUnification')) delete require.cache[key];
  }
}

(async () => {
  console.log('\n══ PROMPT 28 — RUNTIME UNIFICATION (SZ5) ══\n');
  saveEnv();

  try {
    process.env.IMPETUS_RUNTIME_UNIFICATION_MODE = 'shadow';
    process.env.IMPETUS_RUNTIME_UNIFICATION_ENABLED = 'true';
    process.env.IMPETUS_RUNTIME_UNIFICATION_PILOT_TENANTS = PILOT;
    clearCache();

    const flags = require('../runtimeUnification/config/runtimeUnificationFlags');
    const channels = require('../runtimeUnification/governance/channelRegistry');
    const facade = require('../runtimeUnification/facade/unifiedSz5RuntimeFacade');
    const shadow = require('../runtimeUnification/shadow/runtimeShadowComparator');

    assert('R28.1 active', flags.isUnificationActive() === true);
    assert('R28.2 shadow', flags.isShadowMode() === true);
    assert('R28.3 no serve unified in shadow', flags.shouldServeUnifiedBlock() === false);
    assert('R28.4 pilot', flags.isPilotTenant(PILOT) === true);
    assert('R28.5 five channels', channels.listChannels().length === 5);
    assert('R28.6 no removal', channels.listChannels().every((c) => c.removal_allowed === false));

    const cmp = shadow.compareBlocks('fact a', 'fact b');
    assert('R28.7 shadow comparator', cmp.divergent === true);

    const health = facade.getHealth();
    assert('R28.8 health active', health.active === true);
    assert('R28.9 sz5 in health', health.sz5?.phase === 'SZ5');

    const user = { id: PILOT, company_id: PILOT, role: 'admin' };
    const mem = await facade.buildChannelContext({
      channel: channels.CHANNELS.MEMORY,
      user,
      callerHint: 'test_memory'
    });
    assert('R28.10 memory channel ok', mem.ok === true);
    assert('R28.11 memory block', (mem.block || '').includes('MEMÓRIA'));

    const orch = await facade.buildChannelContext({
      channel: channels.CHANNELS.ORCHESTRATION,
      user,
      callerHint: 'test_orch'
    });
    assert('R28.12 orchestration observe-only', (orch.block || '').includes('observe-only'));

    console.log('\n── Modo on (merge SZ5 + legado, pilot) ──');
    require('../db');
    process.env.IMPETUS_RUNTIME_UNIFICATION_MODE = 'on';
    clearCache();
    const facadeOn = require('../runtimeUnification/facade/unifiedSz5RuntimeFacade');
    const flagsOn = require('../runtimeUnification/config/runtimeUnificationFlags');
    assert('R28.13 on serve unified', flagsOn.shouldServeUnifiedBlock() === true);

    const voice = await facadeOn.buildChannelContext({
      channel: 'voice',
      user,
      message: 'resumo chat',
      callerHint: 'test_voice'
    });
    assert('R28.14 voice ok', voice.ok === true);
    assert('R28.15 explainability channel', voice.explainability?.channel === 'voice');

    console.log('\n── Modo audit ──');
    process.env.IMPETUS_RUNTIME_UNIFICATION_MODE = 'audit';
    clearCache();
    const auditSvc = require('../runtimeUnification/observability/runtimeUnificationAuditService');
    const row = await auditSvc.recordAudit({
      companyId: PILOT,
      channel: 'text',
      source: 'legacy',
      sz5FactCount: 0,
      legacyBlockChars: 10,
      unifiedBlockChars: 10,
      callerHint: 'wave28-test',
      explainability: { test: true }
    });
    assert('R28.16 audit persist', row.persisted === true || row.table_missing === true);

    console.log('\n── Modo off (rollback) ──');
    process.env.IMPETUS_RUNTIME_UNIFICATION_MODE = 'off';
    process.env.IMPETUS_RUNTIME_UNIFICATION_ENABLED = 'false';
    clearCache();
    const flagsOff = require('../runtimeUnification/config/runtimeUnificationFlags');
    assert('R28.17 off inactive', flagsOff.isUnificationActive() === false);

    const bridge = require('../runtimeUnification/bridge/chatContextBridge');
    assert('R28.18 bridge channels', !!bridge.CHANNELS.VOICE);
  } catch (err) {
    failed++;
    console.error('  ❌ FATAL:', err?.message || err);
  } finally {
    restoreEnv();
  }

  console.log(`\n══ Resultado: ${passed} passed, ${failed} failed ══\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
