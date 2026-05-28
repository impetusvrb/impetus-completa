'use strict';

/**
 * PROMPT 30 — Enterprise locale / i18n / timezone API
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireHierarchy } = require('../middleware/auth');
const flags = require('../enterpriseLocale/config/enterpriseLocaleFlags');
const facade = require('../enterpriseLocale/facade/enterpriseLocaleFacade');
const i18n = require('../enterpriseLocale/engine/i18nCatalogRuntime');
const timezoneEngine = require('../enterpriseLocale/engine/timezoneEngine');
const multiCurrency = require('../enterpriseLocale/services/multiCurrencyService');
const localeCatalog = require('../enterpriseLocale/catalog/localeCatalog');
const regionCatalog = require('../enterpriseLocale/catalog/regionCatalog');
const currencyCatalog = require('../enterpriseLocale/catalog/currencyCatalog');

router.get('/health', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, health: facade.getHealth() });
});

router.get('/context', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    let uiPrefs = {};
    if (req.user?.id) {
      const userAccountService = require('../services/userAccountService');
      const bundle = await userAccountService.getAccountBundle(req.user.id);
      uiPrefs = bundle?.ui_prefs || {};
    }
    const ctx = facade.resolveUserLocaleContext(req.user, uiPrefs);
    res.json({ ok: true, context: ctx });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/catalogs', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    locales: localeCatalog.listLocales(),
    regions: regionCatalog.listRegions(),
    currencies: currencyCatalog.listCurrencies(),
    mode: flags.localeEngineMode()
  });
});

router.get('/translate/:key', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  const locale = req.query.locale || flags.defaultLocale();
  res.json({
    ok: true,
    key: req.params.key,
    text: i18n.translate(req.params.key, locale),
    locale: localeCatalog.normalizeLocale(locale)
  });
});

router.post('/format/datetime', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  const utc = req.body?.utc || req.body?.timestamp;
  const tz = req.body?.timezone || flags.defaultTimezone();
  const locale = req.body?.locale || flags.defaultLocale();
  res.json({
    ok: true,
    ...facade.formatDisplayBundle(utc, { timezone: tz, locale })
  });
});

router.post('/format/currency', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  const amount = req.body?.amount;
  const currency = req.body?.currency || flags.defaultCurrency();
  const locale = req.body?.locale || flags.defaultLocale();
  res.json({
    ok: true,
    formatted: multiCurrency.formatMoney(amount, currency, locale),
    currency,
    locale: localeCatalog.normalizeLocale(locale)
  });
});

router.post('/currency/convert', requireAuth, requireHierarchy(3), (req, res) => {
  res.set('Cache-Control', 'no-store');
  const result = multiCurrency.convertAmount(
    req.body?.amount,
    req.body?.from || 'BRL',
    req.body?.to || 'EUR'
  );
  res.json({ ok: result.ok !== false, ...result });
});

router.get('/residency/evaluate', requireAuth, requireHierarchy(3), (req, res) => {
  res.set('Cache-Control', 'no-store');
  const residency = require('../enterpriseLocale/policies/dataResidencyPolicy');
  res.json({
    ok: true,
    evaluation: residency.evaluateResidency({
      regionCode: req.query.region_code,
      targetRegion: req.query.target_region,
      operation: req.query.operation || 'read'
    })
  });
});

router.get('/gdpr/alignment', requireAuth, requireHierarchy(3), (req, res) => {
  res.set('Cache-Control', 'no-store');
  const gdpr = require('../enterpriseLocale/policies/gdprAlignmentPolicy');
  res.json({
    ok: true,
    alignment: gdpr.buildGdprAlignmentPack(req.query.region_code || 'BR')
  });
});

module.exports = router;
