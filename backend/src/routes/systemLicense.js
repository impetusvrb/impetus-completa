'use strict';

/**
 * API de status de licença (admin / diagnóstico).
 * CERT-LICENSE-01
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireTenantAdminRole } = require('../middleware/auth');
const { validateLicense, invalidateCache, isValidationEnabled, resolveValidationMode } = require('../services/license');
const { getCapabilitiesPayload } = require('../services/license/licenseCapabilities');
const { getMetricsSnapshot } = require('../services/license/licenseObservability');
const local = require('../services/license/enterpriseLicenseLocal');
const fs = require('fs');
const path = require('path');
const home = require('../config/impetusHome');

router.get('/status', requireAuth, requireTenantAdminRole, async (req, res) => {
  try {
    const result = await validateLicense(false);
    res.json({
      ok: true,
      enabled: isValidationEnabled(),
      mode: resolveValidationMode(),
      installation_id: local.getOrCreateInstallationId(),
      license_file: local.licenseFilePath(),
      license_file_exists: fs.existsSync(local.licenseFilePath()),
      grace_period_days: local.gracePeriodDays(),
      state: result.state,
      valid: result.valid,
      operational: result.operational,
      reason: result.reason,
      plan: result.plan,
      company_id: result.companyId,
      company_name: result.companyName,
      expires_at: result.expiresAt,
      grace_ends_at: result.graceEndsAt,
      days_until_expiry: result.daysUntilExpiry,
      max_users: result.maxUsers,
      capabilities: getCapabilitiesPayload(result),
      metrics: getMetricsSnapshot(),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'Erro ao consultar licença' });
  }
});

router.post('/refresh', requireAuth, requireTenantAdminRole, async (req, res) => {
  invalidateCache();
  const result = await validateLicense(true);
  res.json({ ok: true, state: result.state, valid: result.valid, operational: result.operational });
});

router.post('/import', requireAuth, requireTenantAdminRole, express.json({ limit: '256kb' }), (req, res) => {
  try {
    const doc = req.body;
    if (!doc || typeof doc !== 'object' || !doc.signature) {
      return res.status(400).json({ ok: false, error: 'Corpo deve ser licença JSON assinada' });
    }
    const dir = home.licensesDir();
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, 'impetus.license.json');
    fs.writeFileSync(dest, `${JSON.stringify(doc, null, 2)}\n`, { mode: 0o640 });
    invalidateCache();
    const evaluated = local.evaluateLicenseDocument(doc);
    res.json({
      ok: true,
      path: dest,
      state: evaluated.state,
      valid: evaluated.valid,
      operational: evaluated.operational,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'Falha ao importar licença' });
  }
});

module.exports = router;
