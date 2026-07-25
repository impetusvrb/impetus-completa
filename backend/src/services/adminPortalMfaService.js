'use strict';

const crypto = require('crypto');
const { authenticator } = require('otplib');
const db = require('../db');
const cryptoSvc = require('../mfa/services/mfaCryptoService');

authenticator.options = { window: 1 };

function _enabled() {
  const v = process.env.IMPETUS_ADMIN_PORTAL_MFA_ENABLED;
  return v === 'true' || v === '1' || v === 'on';
}

function beginEnrollment(email) {
  const secret = authenticator.generateSecret();
  const uri = authenticator.keyuri(email, 'IMPETUS Equipa', secret);
  return { secret, uri };
}

async function savePendingSecret(adminUserId, secret) {
  const enc = cryptoSvc.encryptSecret(secret);
  await db.query(
    `UPDATE admin_users SET totp_secret_encrypted = $2, totp_enabled = false, updated_at = now() WHERE id = $1::uuid`,
    [adminUserId, enc]
  );
}

async function confirmEnrollment(adminUserId, code) {
  const r = await db.query(
    'SELECT totp_secret_encrypted FROM admin_users WHERE id = $1::uuid',
    [adminUserId]
  );
  const enc = r.rows[0]?.totp_secret_encrypted;
  if (!enc) return { ok: false, code: 'TOTP_NOT_SETUP' };
  const secret = cryptoSvc.decryptSecret(enc);
  const ok = authenticator.verify({ token: String(code).replace(/\s/g, ''), secret });
  if (!ok) return { ok: false, code: 'TOTP_INVALID' };
  await db.query(
    `UPDATE admin_users SET totp_enabled = true, totp_enrolled_at = now(), updated_at = now() WHERE id = $1::uuid`,
    [adminUserId]
  );
  return { ok: true };
}

async function isMfaRequired(adminUserId) {
  if (!_enabled()) return false;
  const r = await db.query(
    'SELECT totp_enabled FROM admin_users WHERE id = $1::uuid',
    [adminUserId]
  );
  return !!r.rows[0]?.totp_enabled;
}

async function verifyCode(adminUserId, code) {
  const r = await db.query(
    'SELECT totp_secret_encrypted, totp_enabled FROM admin_users WHERE id = $1::uuid',
    [adminUserId]
  );
  const row = r.rows[0];
  if (!row?.totp_enabled || !row.totp_secret_encrypted) return { ok: false, code: 'MFA_NOT_ENROLLED' };
  const secret = cryptoSvc.decryptSecret(row.totp_secret_encrypted);
  const ok = authenticator.verify({ token: String(code).replace(/\s/g, ''), secret });
  return ok ? { ok: true } : { ok: false, code: 'TOTP_INVALID' };
}

function issueMfaChallenge(adminUserId) {
  const raw = crypto.randomBytes(24).toString('hex');
  const exp = Date.now() + 10 * 60 * 1000;
  return { token: raw, adminUserId, exp };
}

const _pending = new Map();

function storeChallenge(challenge) {
  _pending.set(challenge.token, { adminUserId: challenge.adminUserId, exp: challenge.exp });
}

function consumeChallenge(token) {
  const row = _pending.get(token);
  _pending.delete(token);
  if (!row || row.exp < Date.now()) return null;
  return row.adminUserId;
}

module.exports = {
  isEnabled: _enabled,
  beginEnrollment,
  savePendingSecret,
  confirmEnrollment,
  isMfaRequired,
  verifyCode,
  issueMfaChallenge,
  storeChallenge,
  consumeChallenge,
};
