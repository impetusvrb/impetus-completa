'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const gov = require('../mfa/governance/mfaGovernanceService');
const challengeSvc = require('../mfa/services/mfaChallengeService');
const totpSvc = require('../mfa/services/totpMfaService');
const backupSvc = require('../mfa/services/backupRecoveryService');
const webauthnSvc = require('../mfa/services/webauthnMfaService');
const policySvc = require('../mfa/services/mfaPolicyService');
const deviceTrust = require('../mfa/services/deviceTrustService');
const flags = require('../mfa/config/mfaFlags');

router.get('/status', (req, res) => {
  res.json({ ok: true, mfa: gov.getDiagnostics() });
});

router.post('/verify', async (req, res) => {
  try {
    const { mfa_challenge_token, method, code, credential, trust_device, device_label, trace_id } = req.body || {};
    if (!mfa_challenge_token || !method) {
      return res.status(400).json({ ok: false, code: 'MFA_TOKEN_REQUIRED' });
    }
    const out = await challengeSvc.verifyChallenge(
      mfa_challenge_token,
      method,
      { code, credential, trust_device, device_label, trace_id },
      req
    );
    if (!out.ok) return res.status(401).json(out);
    return res.json(out);
  } catch (e) {
    console.error('[MFA_VERIFY]', e?.message);
    return res.status(500).json({ ok: false, error: e?.message });
  }
});

router.post('/webauthn/authentication-options', async (req, res) => {
  try {
    const { mfa_challenge_token } = req.body || {};
    const out = await challengeSvc.webauthnChallengeForLogin(mfa_challenge_token);
    if (!out.ok) return res.status(400).json(out);
    return res.json(out);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message });
  }
});

router.get('/policy', requireAuth, async (req, res) => {
  try {
    const policy = await policySvc.getPolicy(req.user.company_id);
    const enrollment = await totpSvc.getEnrollment(req.user.id);
    const requirement = await policySvc.userRequiresMfa(req.user, policy, enrollment);
    res.json({
      ok: true,
      policy,
      enrollment: {
        totp_enabled: !!enrollment?.totp_enabled,
        webauthn_enabled: !!enrollment?.webauthn_enabled,
        enrolled_at: enrollment?.enrolled_at,
      },
      requirement,
      backup_codes_remaining: await backupSvc.remainingCount(req.user.id),
      webauthn_credentials: await webauthnSvc.listCredentials(req.user.id),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

router.post('/enroll/totp/begin', requireAuth, async (req, res) => {
  if (!flags.isTotpEnabled()) return res.status(403).json({ ok: false, code: 'TOTP_DISABLED' });
  const { secret, uri } = totpSvc.keyuri(req.user.email);
  await totpSvc.saveTotpSecret(req.user.id, req.user.company_id, secret);
  res.json({ ok: true, otpauth_uri: uri, secret_preview: `${secret.slice(0, 4)}…`, manual_entry: true });
});

router.post('/enroll/totp/confirm', requireAuth, async (req, res) => {
  const out = await totpSvc.confirmTotp(req.user.id, req.body?.code);
  if (!out.ok) return res.status(400).json(out);
  const codes = await backupSvc.generateBackupCodes(req.user.id, req.user.company_id);
  res.json({ ok: true, backup_codes: codes.codes, warning: 'Guarde os códigos — exibidos uma vez' });
});

const _regChallenges = new Map();

router.post('/enroll/webauthn/registration-options', requireAuth, async (req, res) => {
  try {
    const options = await webauthnSvc.registrationOptions(req.user, req.user.email);
    _regChallenges.set(req.user.id, options.challenge);
    res.json({ ok: true, options });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

router.post('/enroll/webauthn/registration-verify', requireAuth, async (req, res) => {
  try {
    const response = req.body;
    response.challenge = _regChallenges.get(req.user.id);
    const out = await webauthnSvc.verifyRegistration(
      req.user,
      response,
      _regChallenges.get(req.user.id),
      req.body?.device_name
    );
    _regChallenges.delete(req.user.id);
    if (!out.ok) return res.status(400).json(out);
    res.json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

router.post('/backup/regenerate', requireAuth, async (req, res) => {
  const out = await backupSvc.generateBackupCodes(req.user.id, req.user.company_id);
  if (!out.ok) return res.status(403).json(out);
  res.json({ ok: true, codes: out.codes, count: out.count });
});

router.post('/devices/revoke-all', requireAuth, async (req, res) => {
  const out = await deviceTrust.revokeAllDevices(req.user.id);
  res.json(out);
});

module.exports = router;
