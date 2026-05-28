'use strict';

const crypto = require('crypto');

function _encryptionKey() {
  return (
    process.env.IMPETUS_MFA_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'MFA_DEV_KEY_NOT_FOR_PROD'
  ).slice(0, 32).padEnd(32, '0');
}

function encryptSecret(plain) {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(_encryptionKey());
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decryptSecret(blob) {
  if (!blob) return null;
  const buf = Buffer.from(blob, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const key = Buffer.from(_encryptionKey());
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

function hashDeviceFingerprint(parts = {}) {
  const payload = JSON.stringify({
    ua: parts.user_agent || '',
    ip: parts.ip || '',
    lang: parts.accept_language || '',
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

module.exports = {
  encryptSecret,
  decryptSecret,
  hashToken,
  hashDeviceFingerprint,
};
