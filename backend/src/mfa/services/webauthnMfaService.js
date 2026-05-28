'use strict';

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const db = require('../../db');
const flags = require('../config/mfaFlags');

function _rp() {
  return {
    rpName: 'IMPETUS',
    rpID: flags.rpId(),
    origin: flags.rpOrigin(),
  };
}

async function listCredentials(userId) {
  const r = await db.query(
    `SELECT id, credential_id, device_name, counter, created_at, last_used_at
     FROM user_mfa_webauthn_credentials WHERE user_id = $1::uuid`,
    [userId]
  );
  return r.rows;
}

async function registrationOptions(user, userName) {
  if (!flags.isWebAuthnEnabled()) throw new Error('WEBAUTHN_DISABLED');

  const existing = await listCredentials(user.id);
  const { rpName, rpID } = _rp();

  const userIdBytes = Buffer.from(String(user.id).replace(/-/g, ''), 'hex');
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: userIdBytes,
    userName: userName || user.email,
    userDisplayName: user.name || user.email,
    attestationType: 'none',
    excludeCredentials: existing.map((c) => ({
      id: Buffer.from(c.credential_id, 'base64url'),
      type: 'public-key',
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  return options;
}

async function verifyRegistration(user, response, expectedChallenge, deviceName = 'Security Key') {
  const { rpID, origin } = _rp();
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, code: 'WEBAUTHN_REGISTRATION_FAILED' };
  }

  const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
  const credIdB64 = Buffer.from(credentialID).toString('base64url');

  await db.query(
    `INSERT INTO user_mfa_webauthn_credentials
     (user_id, company_id, credential_id, public_key, counter, device_name)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)`,
    [user.id, user.company_id, credIdB64, credentialPublicKey, counter, deviceName]
  );

  await db.query(
    `INSERT INTO user_mfa_enrollments (user_id, company_id, webauthn_enabled, enrolled_at)
     VALUES ($1::uuid, $2::uuid, true, now())
     ON CONFLICT (user_id) DO UPDATE SET
       webauthn_enabled = true,
       enrolled_at = COALESCE(user_mfa_enrollments.enrolled_at, now()),
       updated_at = now()`,
    [user.id, user.company_id]
  );

  return { ok: true, credential_id: credIdB64 };
}

async function authenticationOptions(userId) {
  if (!flags.isWebAuthnEnabled()) throw new Error('WEBAUTHN_DISABLED');

  const creds = await db.query(
    'SELECT credential_id, transports FROM user_mfa_webauthn_credentials WHERE user_id = $1::uuid',
    [userId]
  );

  const { rpID } = _rp();
  return generateAuthenticationOptions({
    rpID,
    allowCredentials: creds.rows.map((c) => ({
      id: Buffer.from(c.credential_id, 'base64url'),
      type: 'public-key',
      transports: c.transports || undefined,
    })),
    userVerification: 'preferred',
  });
}

async function verifyAuthentication(userId, response, expectedChallenge) {
  const { rpID, origin } = _rp();
  const credId = response.id;
  const r = await db.query(
    `SELECT * FROM user_mfa_webauthn_credentials
     WHERE user_id = $1::uuid AND credential_id = $2`,
    [userId, credId]
  );
  const cred = r.rows[0];
  if (!cred) return { ok: false, code: 'CREDENTIAL_NOT_FOUND' };

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    authenticator: {
      credentialID: Buffer.from(cred.credential_id, 'base64url'),
      credentialPublicKey: cred.public_key,
      counter: Number(cred.counter) || 0,
    },
    requireUserVerification: false,
  });

  if (!verification.verified) return { ok: false, code: 'WEBAUTHN_AUTH_FAILED' };

  await db.query(
    `UPDATE user_mfa_webauthn_credentials
     SET counter = $2, last_used_at = now() WHERE id = $1::uuid`,
    [cred.id, verification.authenticationInfo.newCounter]
  );

  await db.query(
    'UPDATE user_mfa_enrollments SET last_verified_at = now() WHERE user_id = $1::uuid',
    [userId]
  );

  return { ok: true };
}

module.exports = {
  listCredentials,
  registrationOptions,
  verifyRegistration,
  authenticationOptions,
  verifyAuthentication,
};
