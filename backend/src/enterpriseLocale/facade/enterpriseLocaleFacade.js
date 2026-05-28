'use strict';

/**
 * PROMPT 30 — Facade unificada i18n + timezone + residency + currency.
 */

const flags = require('../config/enterpriseLocaleFlags');
const localeCatalog = require('../catalog/localeCatalog');
const regionCatalog = require('../catalog/regionCatalog');
const currencyCatalog = require('../catalog/currencyCatalog');
const timezoneEngine = require('../engine/timezoneEngine');
const i18n = require('../engine/i18nCatalogRuntime');
const residency = require('../policies/dataResidencyPolicy');
const gdpr = require('../policies/gdprAlignmentPolicy');
const multiCurrency = require('../services/multiCurrencyService');
const audit = require('../observability/enterpriseLocaleAuditService');

const DEFAULT_UI_LOCALE_FIELDS = Object.freeze({
  locale: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  region_code: 'BR',
  currency: 'BRL'
});

function _log(event, data) {
  try {
    console.info(
      '[ENTERPRISE_LOCALE]',
      JSON.stringify({ event, ts: new Date().toISOString(), mode: flags.localeEngineMode(), ...data })
    );
  } catch (_e) {}
}

function mergeUiPrefs(uiPrefs = {}) {
  const base = { ...DEFAULT_UI_LOCALE_FIELDS, ...uiPrefs };
  base.locale = localeCatalog.normalizeLocale(base.locale);
  base.timezone = timezoneEngine.normalizeTimezone(base.timezone);
  base.region_code = regionCatalog.getRegion(base.region_code).code;
  base.currency = currencyCatalog.getCurrency(base.currency).code;
  return base;
}

function resolveUserLocaleContext(user = {}, uiPrefs = {}) {
  if (!flags.isLocaleEngineActive()) {
    return {
      active: false,
      locale: 'pt-BR',
      timezone: flags.defaultTimezone(),
      region_code: flags.defaultRegionCode(),
      currency: flags.defaultCurrency(),
      utc_storage: true
    };
  }

  const merged = mergeUiPrefs(uiPrefs);
  const region = regionCatalog.getRegion(merged.region_code);
  const residencyEval = residency.evaluateResidency({
    regionCode: region.code,
    operation: 'read'
  });
  const gdprPack = gdpr.buildGdprAlignmentPack(region.code);

  const ctx = {
    active: true,
    mode: flags.localeEngineMode(),
    locale: merged.locale,
    timezone: merged.timezone,
    region_code: region.code,
    currency: merged.currency,
    utc_storage: true,
    utc_now: timezoneEngine.nowUtcIso(),
    offset_label: timezoneEngine.getOffsetLabel(merged.timezone),
    region_meta: {
      label: region.label,
      data_residency: region.data_residency,
      storage_zone: region.storage_zone
    },
    residency: residencyEval,
    gdpr: gdprPack,
    catalogs: {
      locales: localeCatalog.listLocales(),
      regions: regionCatalog.listRegions(),
      currencies: currencyCatalog.listCurrencies()
    },
    invariants: {
      backward_compatible_default: 'pt-BR',
      motor_a_intact: true,
      engine_v2_intact: true
    }
  };

  _log('context_resolved', {
    user_id: user.id,
    company_id: user.company_id,
    locale: ctx.locale,
    timezone: ctx.timezone
  });

  if (flags.shouldPersistAudit()) {
    audit
      .recordAudit({
        companyId: user.company_id,
        userId: user.id,
        action: 'context_resolve',
        locale: ctx.locale,
        timezone: ctx.timezone,
        regionCode: ctx.region_code,
        currency: ctx.currency,
        payload: { residency: residencyEval }
      })
      .catch(() => {});
  }

  return ctx;
}

function getHealth() {
  return {
    mode: flags.localeEngineMode(),
    active: flags.isLocaleEngineActive(),
    default_locale: flags.defaultLocale(),
    default_timezone: flags.defaultTimezone(),
    default_region: flags.defaultRegionCode(),
    default_currency: flags.defaultCurrency(),
    locales: localeCatalog.listLocales().length,
    regions: regionCatalog.listRegions().length,
    currencies: currencyCatalog.listCurrencies().length
  };
}

function formatDisplayBundle(utcInstant, userContext = {}) {
  return {
    utc: timezoneEngine.toStorageUtc(utcInstant),
    local: timezoneEngine.formatForUser(utcInstant, {
      timezone: userContext.timezone,
      locale: userContext.locale
    }),
    timezone: userContext.timezone,
    locale: userContext.locale
  };
}

module.exports = {
  DEFAULT_UI_LOCALE_FIELDS,
  mergeUiPrefs,
  resolveUserLocaleContext,
  getHealth,
  formatDisplayBundle,
  translate: i18n.translate,
  formatMoney: multiCurrency.formatMoney,
  convertAmount: multiCurrency.convertAmount
};
