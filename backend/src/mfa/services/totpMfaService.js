'use strict';

const { authenticator } = require('otplib');
const db = require('../../db');
const cryptoSvc = require('./mfaCryptoService');

authenticator.options = { window: 1 };

function generateSecret() {
  return authenticator.generateSecret();
}

function verifyToken(secret, token) {
  if (!secret || !token) return false;
  return authenticator.verify({ token: String(token).replace(/\s/g, ''), secret });
}

function keyuri(email, issuer = 'IMPETUS') {
  const secret = generateSecret();
  return {
    secret,
    uri: authenticator.keyuri(email, issuer, secret),
  };
}

async function getEnrollment(userId) {
  const r = await db.query(
    'SELECT * FROM user_mfa_enrollments WHERE user_id = $1::uuid',
    [userId]
  );
  return r.rows[0] || null;
}

async function saveTotpSecret(userId, companyId, secret) {
  const enc = cryptoSvc.encryptSecret(secret);
  await db.query(
    `INSERT INTO user_mfa_enrollments (user_id, company_id, totp_secret_encrypted, totp_enabled)
     VALUES ($1::uuid, $2::uuid, $3, false)
     ON CONFLICT (user_id) DO UPDATE SET
       totp_secret_encrypted = EXCLUDED.totp_secret_encrypted,
       company_id = EXCLUDED.company_id,
       updated_at = now()`,
    [userId, companyId, enc]
  );
}

async function confirmTotp(userId, token) {
  const row = await getEnrollment(userId);
  if (!row?.totp_secret_encrypted) return { ok: false, code: 'TOTP_NOT_SETUP' };
  const secret = cryptoSvc.decryptSecret(row.totp_secret_encrypted);
  if (!verifyToken(secret, token)) return { ok: false, code: 'TOTP_INVALID' };
  await db.query(
    `UPDATE user_mfa_enrollments SET totp_enabled = true, enrolled_at = COALESCE(enrolled_at, now()),
     updated_at = now() WHERE user_id = $1::uuid`,
    [userId]
  );
  return { ok: true };
}

async function verifyUserTotp(userId, token) {
  const row = await getEnrollment(userId);
  if (!row?.totp_enabled || !row.totp_secret_encrypted) return { ok: false, code: 'TOTP_NOT_ENABLED' };
  const secret = cryptoSvc.decryptSecret(row.totp_secret_encrypted);
  const valid = verifyToken(secret, token);
  if (valid) {
    await db.query(
      'UPDATE user_mfa_enrollments SET last_verified_at = now() WHERE user_id = $1::uuid',
      [userId]
    );
  }
  return { ok: valid, code: valid ? null : 'TOTP_INVALID' };
}

module.exports = {
  generateSecret,
  verifyToken,
  keyuri,
  getEnrollment,
  saveTotpSecret,
  confirmTotp,
  verifyUserTotp,
};
