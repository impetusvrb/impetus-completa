'use strict';

const express = require('express');
const router = express.Router();
const gov = require('../federation/governance/federationGovernanceService');
const oidc = require('../federation/services/oidcFederationService');
const saml = require('../federation/services/samlFederationService');
const configSvc = require('../federation/services/federationConfigService');

router.get('/status', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    federation: gov.getDiagnostics(),
    timestamp: new Date().toISOString(),
  });
});

router.get('/oidc/:companyId/login', async (req, res) => {
  try {
    const out = await oidc.startOidcLogin(req.params.companyId, req.query.provider_id, req);
    if (!out.ok) return res.status(400).json(out);
    return res.redirect(out.redirect_url);
  } catch (e) {
    console.error('[FEDERATION_OIDC_LOGIN]', e?.message);
    return res.status(500).json({ ok: false, code: 'OIDC_LOGIN_ERROR', error: e?.message });
  }
});

router.get('/oidc/callback', async (req, res) => {
  try {
    const out = await oidc.handleOidcCallback(req.query, req);
    if (out.redirect_url) return res.redirect(out.redirect_url);
    return res.status(out.ok ? 200 : 400).json(out);
  } catch (e) {
    console.error('[FEDERATION_OIDC_CALLBACK]', e?.message);
    return res.status(500).json({ ok: false, error: e?.message });
  }
});

router.get('/saml/:companyId/login', async (req, res) => {
  try {
    const out = await saml.startSamlLogin(req.params.companyId, req.query.provider_id, req);
    if (!out.ok) return res.status(400).json(out);
    return res.redirect(out.redirect_url);
  } catch (e) {
    console.error('[FEDERATION_SAML_LOGIN]', e?.message);
    return res.status(500).json({ ok: false, error: e?.message });
  }
});

router.post('/saml/acs', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const out = await saml.handleSamlAcs(req.body, req);
    if (out.redirect_url) return res.redirect(out.redirect_url);
    return res.status(out.ok ? 200 : 400).json(out);
  } catch (e) {
    console.error('[FEDERATION_SAML_ACS]', e?.message);
    return res.status(500).json({ ok: false, error: e?.message });
  }
});

router.get('/saml/metadata/:companyId', async (req, res) => {
  try {
    const provider = await configSvc.getPrimaryProvider(req.params.companyId, 'saml');
    const xml = saml.getSpMetadata(req.params.companyId, provider);
    res.set('Content-Type', 'application/xml');
    return res.send(xml);
  } catch (e) {
    return res.status(500).send('<!-- metadata error -->');
  }
});

module.exports = router;
