'use strict';

/**
 * Verificação pós-promoção PROMPT 27 (modo on) — sem alterar runtime de chat.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const PILOT = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';

async function main() {
  const flags = require('../src/legacyDeprecation/config/deprecationGovernanceFlags');
  const router = require('../src/legacyDeprecation/governance/legacyCompatibilityRouter');
  const registry = require('../src/legacyDeprecation/governance/legacyDeprecationRegistry');

  const health = router.getHealth();
  const checks = [];

  checks.push(['mode_on', flags.deprecationMode() === 'on']);
  checks.push(['governance_active', flags.isDeprecationGovernanceActive()]);
  checks.push(['enforcement_allowed', flags.allowsEnforcement()]);
  checks.push(['audit_persist', flags.shouldPersistAudit()]);
  checks.push(['pilot_configured', flags.pilotTenants().length >= 3]);
  checks.push(['catalog_no_removal', registry.listEntries().every((e) => e.removal_allowed === false)]);

  const smoke = router.recordLegacyInvocation('chat_ai_service_legacy', {
    companyId: PILOT,
    caller_hint: 'promotion_verify_script'
  });
  checks.push(['smoke_recorded', smoke.recorded === true]);
  checks.push(['smoke_redirect_flag', smoke.redirect === true]);

  let auditRows = [];
  try {
    const audit = require('../src/legacyDeprecation/observability/deprecationAuditService');
    auditRows = await audit.listRecent(PILOT, 5);
    checks.push(['audit_query_ok', Array.isArray(auditRows)]);
    checks.push(
      ['audit_has_on_row', auditRows.some((r) => r.mode === 'on' && r.legacy_id === 'chat_ai_service_legacy')]
    );
  } catch (e) {
    checks.push(['audit_query_ok', false]);
    checks.push(['audit_has_on_row', false]);
  }

  const loader = require('../src/services/chatAIService.loader');
  checks.push(['loader_export', typeof loader.handleAIMessage === 'function']);
  checks.push(['loader_mentions', typeof loader.mentionsAI === 'function']);

  const failed = checks.filter(([, ok]) => !ok);
  console.log(
    JSON.stringify(
      {
        event: 'LEGACY_DEPRECATION_PROMOTION_VERIFY',
        ts: new Date().toISOString(),
        mode: flags.deprecationMode(),
        health,
        checks: Object.fromEntries(checks),
        recent_audit: auditRows.slice(0, 3).map((r) => ({
          legacy_id: r.legacy_id,
          mode: r.mode,
          caller_hint: r.caller_hint,
          created_at: r.created_at
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
