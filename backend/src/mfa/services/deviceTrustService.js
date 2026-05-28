'use strict';

const db = require('../../db');
const flags = require('../config/mfaFlags');
const cryptoSvc = require('./mfaCryptoService');
const policySvc = require('./mfaPolicyService');

async function isDeviceTrusted(userId, reqMeta = {}, companyId) {
  if (!flags.isDeviceTrustEnabled()) return false;

  const fp = cryptoSvc.hashDeviceFingerprint(reqMeta);
  const r = await db.query(
    `SELECT id FROM user_mfa_trusted_devices
     WHERE user_id = $1::uuid AND device_fingerprint_hash = $2 AND trust_until > now()`,
    [userId, fp]
  );
  if (r.rows[0]) {
    await db.query(
      'UPDATE user_mfa_trusted_devices SET last_seen_at = now() WHERE id = $1::uuid',
      [r.rows[0].id]
    );
    return true;
  }
  return false;
}

async function trustDevice(userId, companyId, reqMeta = {}, label = 'Trusted device') {
  if (!flags.isDeviceTrustEnabled()) return { ok: false };

  const policy = await policySvc.getPolicy(companyId);
  const days = policy.device_trust_days || flags.deviceTrustDays();
  const fp = cryptoSvc.hashDeviceFingerprint(reqMeta);
  const trustUntil = new Date(Date.now() + days * 86400000);

  await db.query(
    `INSERT INTO user_mfa_trusted_devices
     (user_id, company_id, device_fingerprint_hash, device_label, trust_until)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5)
     ON CONFLICT (user_id, device_fingerprint_hash)
     DO UPDATE SET trust_until = EXCLUDED.trust_until, last_seen_at = now(), device_label = EXCLUDED.device_label`,
    [userId, companyId, fp, label, trustUntil]
  );

  return { ok: true, trust_until: trustUntil.toISOString(), days };
}

async function revokeAllDevices(userId) {
  await db.query('DELETE FROM user_mfa_trusted_devices WHERE user_id = $1::uuid', [userId]);
  return { ok: true };
}

module.exports = {
  isDeviceTrusted,
  trustDevice,
  revokeAllDevices,
};
