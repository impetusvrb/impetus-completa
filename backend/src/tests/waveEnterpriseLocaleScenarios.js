'use strict';

/**
 * PROMPT 30 — Enterprise locale engine scenarios.
 */

const ENV_KEYS = ['IMPETUS_ENTERPRISE_LOCALE_MODE', 'IMPETUS_ENTERPRISE_LOCALE_ENABLED'];

let passed = 0;
let failed = 0;
const saved = {};

function saveEnv() {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
}
function restoreEnv() {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
}
function assert(label, cond) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}
function clearCache() {
  for (const k of Object.keys(require.cache)) {
    if (k.includes('enterpriseLocale')) delete require.cache[k];
  }
}

(async () => {
  console.log('\n══ PROMPT 30 — ENTERPRISE LOCALE ENGINE ══\n');
  saveEnv();
  try {
    process.env.IMPETUS_ENTERPRISE_LOCALE_MODE = 'on';
    process.env.IMPETUS_ENTERPRISE_LOCALE_ENABLED = 'true';
    clearCache();

    const facade = require('../enterpriseLocale/facade/enterpriseLocaleFacade');
    const tz = require('../enterpriseLocale/engine/timezoneEngine');
    const i18n = require('../enterpriseLocale/engine/i18nCatalogRuntime');
    const fx = require('../enterpriseLocale/services/multiCurrencyService');

    assert('L30.1 health', facade.getHealth().active === true);
    const merged = facade.mergeUiPrefs({ locale: 'en-US' });
    assert('L30.2 merge locale', merged.locale === 'en-US');
    assert('L30.3 merge tz valid', tz.isValidTimezone(merged.timezone));

    const ctx = facade.resolveUserLocaleContext(
      { id: 'u1', company_id: 'c1' },
      { locale: 'es-ES', timezone: 'Europe/Lisbon', region_code: 'EU', currency: 'EUR' }
    );
    assert('L30.4 context active', ctx.active === true);
    assert('L30.5 region EU', ctx.region_code === 'EU');
    assert('L30.6 gdpr pack', ctx.gdpr.framework === 'gdpr');

    const utc = '2026-05-28T12:00:00.000Z';
    const fmt = facade.formatDisplayBundle(utc, { timezone: 'Europe/Lisbon', locale: 'pt-BR' });
    assert('L30.7 format local', !!fmt.local);

    assert('L30.8 i18n en', i18n.translate('common.save', 'en-US') === 'Save');
    assert('L30.9 i18n fallback', i18n.translate('unknown.key', 'en-US') === 'unknown.key');

    const money = fx.formatMoney(1234.5, 'BRL', 'pt-BR');
    assert('L30.10 currency format', money.includes('1'));

    const conv = fx.convertAmount(100, 'BRL', 'EUR');
    assert('L30.11 convert', conv.ok === true);

    require('../db');
    const audit = require('../enterpriseLocale/observability/enterpriseLocaleAuditService');
    await audit.recordAudit({
      companyId: '21dd3cee-2efa-4936-908f-9ff1ba04e2a3',
      userId: '21dd3cee-2efa-4936-908f-9ff1ba04e2a3',
      action: 'wave30-test',
      locale: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      regionCode: 'BR',
      currency: 'BRL'
    });

    process.env.IMPETUS_ENTERPRISE_LOCALE_MODE = 'off';
    process.env.IMPETUS_ENTERPRISE_LOCALE_ENABLED = 'false';
    clearCache();
    const off = require('../enterpriseLocale/config/enterpriseLocaleFlags');
    assert('L30.12 off', off.isLocaleEngineActive() === false);
  } catch (e) {
    failed++;
    console.error('FATAL', e?.message, e?.stack);
  } finally {
    restoreEnv();
  }
  console.log(`\n══ ${passed} passed, ${failed} failed ══\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
