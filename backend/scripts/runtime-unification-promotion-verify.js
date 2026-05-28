'use strict';

/**
 * Verificação pós-promoção PROMPT 28 — shadow → audit → on
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const PILOT = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';

async function main() {
  const flags = require('../src/runtimeUnification/config/runtimeUnificationFlags');
  const facade = require('../src/runtimeUnification/facade/unifiedSz5RuntimeFacade');
  const channels = require('../src/runtimeUnification/governance/channelRegistry');

  const checks = [];
  const mode = flags.unificationMode();

  checks.push(['mode_set', ['shadow', 'audit', 'on'].includes(mode)]);
  checks.push(['governance_active', flags.isUnificationActive()]);
  checks.push(['pilot_configured', flags.pilotTenants().length >= 3]);
  checks.push(['pilot_match', flags.isPilotTenant(PILOT)]);

  if (mode === 'on') {
    checks.push(['serve_unified', flags.shouldServeUnifiedBlock() === true]);
    checks.push(['audit_persist', flags.shouldPersistAudit() === true]);
  }
  if (mode === 'audit') {
    checks.push(['audit_persist', flags.shouldPersistAudit() === true]);
    checks.push(['no_serve_unified', flags.shouldServeUnifiedBlock() === false]);
  }
  if (mode === 'shadow') {
    checks.push(['shadow_no_unified', flags.shouldServeUnifiedBlock() === false]);
  }

  const user = { id: PILOT, company_id: PILOT, role: 'admin' };
  const voice = await facade.buildChannelContext({
    channel: channels.CHANNELS.VOICE,
    user,
    message: 'resumo conversa piloto',
    callerHint: 'promotion_verify_voice'
  });
  checks.push(['voice_build_ok', voice.ok === true]);
  if (mode === 'on') {
    checks.push(['voice_merged_or_sz5', ['merged', 'sz5_unified', 'legacy_fallback'].includes(voice.source)]);
    checks.push(['voice_has_block_or_tables', !!(voice.block || (voice.tables && voice.tables.length))]);
  } else if (mode === 'shadow') {
    checks.push(['voice_legacy_output', voice.source === 'legacy' || voice.source === 'shadow_legacy']);
  }

  let auditRows = [];
  try {
    const audit = require('../src/runtimeUnification/observability/runtimeUnificationAuditService');
    auditRows = await audit.listRecent(PILOT, 8);
    checks.push(['audit_list', Array.isArray(auditRows)]);

    if (mode === 'shadow') {
      checks.push(['audit_write_skipped_shadow', true]);
    } else {
      const row = await audit.recordAudit({
        companyId: PILOT,
        channel: 'panel',
        source: mode === 'on' ? 'merged' : 'legacy',
        sz5FactCount: voice.meta?.fact_count || 0,
        legacyBlockChars: 100,
        unifiedBlockChars: (voice.block || '').length,
        callerHint: 'promotion_verify_script',
        explainability: voice.explainability || {}
      });
      checks.push(['audit_write', row.persisted === true || row.table_missing === true]);
      auditRows = await audit.listRecent(PILOT, 8);
      checks.push([
        'audit_has_mode_row',
        auditRows.some((r) => r.mode === mode && r.caller_hint === 'promotion_verify_script')
      ]);
    }
  } catch (e) {
    checks.push(['audit_list', false]);
    if (mode !== 'shadow') checks.push(['audit_write', false]);
  }

  const bridge = require('../src/runtimeUnification/bridge/chatContextBridge');
  checks.push(['bridge_ok', typeof bridge.resolveChatContextForChannel === 'function']);

  const failed = checks.filter(([, ok]) => !ok);
  console.log(
    JSON.stringify(
      {
        event: 'RUNTIME_UNIFICATION_PROMOTION_VERIFY',
        ts: new Date().toISOString(),
        mode,
        health: facade.getHealth(),
        checks: Object.fromEntries(checks),
        voice_sample: {
          source: voice.source,
          block_chars: (voice.block || '').length,
          explainability_channel: voice.explainability?.channel
        },
        recent_audit: auditRows.slice(0, 4).map((r) => ({
          mode: r.mode,
          channel: r.channel,
          source: r.source,
          caller_hint: r.caller_hint,
          shadow_divergence: r.shadow_divergence
        })),
        ok: failed.length === 0
      },
      null,
      2
    )
  );

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
