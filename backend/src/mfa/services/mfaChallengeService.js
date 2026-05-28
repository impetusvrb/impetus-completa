'use strict';

const crypto = require('crypto');
const db = require('../../db');
const flags = require('../config/mfaFlags');
const gov = require('../governance/mfaGovernanceService');
const policySvc = require('./mfaPolicyService');
const totpSvc = require('./totpMfaService');
const backupSvc = require('./backupRecoveryService');
const webauthnSvc = require('./webauthnMfaService');
const deviceTrust = require('./deviceTrustService');
const cryptoSvc = require('./mfaCryptoService');
const tracing = require('../observability/mfaAuditTracing');
const sessionBridge = require('../../federation/services/federationSessionBridge');

const _pendingWebauthn = new Map();

function _reqMeta(req) {
  return {
    ip: req.ip || req.headers?.['x-forwarded-for'],
    user_agent: req.headers?.['user-agent'],
    accept_language: req.headers?.['accept-language'],
  };
}

async function evaluateAfterPassword(user, req = {}) {
  if (!flags.isMfaEnabled() || !gov.isActiveForTenant(user.company_id)) {
    return { challenge: false, reason: 'mfa_inactive' };
  }

  const policy = await policySvc.getPolicy(user.company_id);
  const enrollment = await totpSvc.getEnrollment(user.id);
  const reqMeta = _reqMeta(req);

  const trusted = await deviceTrust.isDeviceTrusted(user.id, reqMeta, user.company_id);
  if (trusted) {
    return { challenge: false, reason: 'trusted_device' };
  }

  const requirement = await policySvc.userRequiresMfa(
    { ...user, is_tenant_admin: user.is_tenant_admin },
    policy,
    enrollment
  );

  const trace = await tracing.startTrace({
    user_id: user.id,
    company_id: user.company_id,
  });

  if (gov.isShadowOnly(requirement.effectiveMode)) {
    await tracing.recordEvent(trace, 'login_shadow_skip', 'shadow', {
      method: 'password',
      effectiveMode: requirement.effectiveMode,
      ...reqMeta,
    });
    return { challenge: false, reason: 'shadow_mode', effectiveMode: requirement.effectiveMode };
  }

  if (!requirement.required) {
    if (gov.shouldAuditOnly(requirement.effectiveMode)) {
      await tracing.recordEvent(trace, 'login_audit_skip_challenge', 'audit', {
        reason: requirement.reason,
        effectiveMode: requirement.effectiveMode,
        ...reqMeta,
      });
    }
    return {
      challenge: false,
      reason: requirement.reason,
      effectiveMode: requirement.effectiveMode,
      enroll_recommended: requirement.enroll_recommended,
    };
  }

  const methods = [];
  if (flags.isTotpEnabled() && enrollment?.totp_enabled) methods.push('totp');
  if (flags.isWebAuthnEnabled() && enrollment?.webauthn_enabled) methods.push('webauthn');
  if (flags.isBackupCodesEnabled()) methods.push('backup');

  if (!methods.length) {
    return { challenge: false, reason: 'no_methods_enrolled', enroll_recommended: true };
  }

  if (gov.shouldAuditOnly(requirement.effectiveMode)) {
    await tracing.recordEvent(trace, 'login_audit_would_challenge', 'audit', {
      methods,
      effectiveMode: requirement.effectiveMode,
      ...reqMeta,
    });
    return {
      challenge: false,
      reason: 'audit_mode_no_block',
      effectiveMode: requirement.effectiveMode,
      would_challenge: true,
      methods,
    };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = cryptoSvc.hashToken(rawToken);
  const expires = new Date(Date.now() + flags.challengeTtlMinutes() * 60000);

  await db.query(
    `INSERT INTO mfa_challenges
     (challenge_token_hash, user_id, company_id, methods_allowed, ip_address, user_agent, device_fingerprint_hash, expires_at)
     VALUES ($1, $2::uuid, $3::uuid, $4, $5::inet, $6, $7, $8)`,
    [
      tokenHash,
      user.id,
      user.company_id,
      methods,
      reqMeta.ip || null,
      reqMeta.user_agent || null,
      cryptoSvc.hashDeviceFingerprint(reqMeta),
      expires,
    ]
  );

  await tracing.recordEvent(trace, 'challenge_issued', 'ok', { methods, ...reqMeta });

  return {
    challenge: true,
    mfa_required: true,
    mfa_challenge_token: rawToken,
    methods,
    expires_at: expires.toISOString(),
    trace_id: trace.trace_id,
    effectiveMode: requirement.effectiveMode,
  };
}

async function _loadChallenge(rawToken) {
  const hash = cryptoSvc.hashToken(rawToken);
  const r = await db.query(
    `SELECT * FROM mfa_challenges
     WHERE challenge_token_hash = $1 AND expires_at > now() AND completed_at IS NULL`,
    [hash]
  );
  return r.rows[0] || null;
}

async function verifyChallenge(rawToken, method, payload = {}, req = {}) {
  const challenge = await _loadChallenge(rawToken);
  if (!challenge) return { ok: false, code: 'CHALLENGE_EXPIRED' };

  const trace = await tracing.startTrace({
    trace_id: payload.trace_id,
    user_id: challenge.user_id,
    company_id: challenge.company_id,
  });

  const reqMeta = _reqMeta(req);
  let verified = false;

  if (method === 'totp') {
    const r = await totpSvc.verifyUserTotp(challenge.user_id, payload.code);
    verified = r.ok;
  } else if (method === 'backup') {
    const r = await backupSvc.verifyBackupCode(challenge.user_id, payload.code);
    verified = r.ok;
  } else if (method === 'webauthn') {
    const expected = _pendingWebauthn.get(challenge.user_id);
    const r = await webauthnSvc.verifyAuthentication(
      challenge.user_id,
      payload.credential,
      expected
    );
    verified = r.ok;
    _pendingWebauthn.delete(challenge.user_id);
  } else {
    return { ok: false, code: 'METHOD_NOT_ALLOWED' };
  }

  if (!verified) {
    await tracing.recordEvent(trace, 'challenge_failed', 'denied', { method, ...reqMeta });
    return { ok: false, code: 'MFA_VERIFICATION_FAILED' };
  }

  await db.query(
    `UPDATE mfa_challenges SET completed_at = now(), outcome = 'ok' WHERE id = $1::uuid`,
    [challenge.id]
  );

  const user = await sessionBridge.loadUserForLogin(challenge.user_id);
  if (!user) return { ok: false, code: 'USER_NOT_FOUND' };

  if (payload.trust_device) {
    await deviceTrust.trustDevice(user.id, user.company_id, reqMeta, payload.device_label);
  }

  const session = await sessionBridge.issueSessionForUser(user, { mfa: true, mfa_method: method });

  await tracing.recordEvent(trace, 'challenge_completed', 'ok', { method, ...reqMeta });

  return { ok: true, ...session, mfa_verified: true, method };
}

async function webauthnChallengeForLogin(rawToken) {
  const challenge = await _loadChallenge(rawToken);
  if (!challenge) return { ok: false, code: 'CHALLENGE_EXPIRED' };
  const options = await webauthnSvc.authenticationOptions(challenge.user_id);
  _pendingWebauthn.set(challenge.user_id, options.challenge);
  return { ok: true, options };
}

module.exports = {
  evaluateAfterPassword,
  verifyChallenge,
  webauthnChallengeForLogin,
};
