'use strict';

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../../db');
const flags = require('../config/mfaFlags');

const CODE_COUNT = 10;

function _generateCodes() {
  const codes = [];
  for (let i = 0; i < CODE_COUNT; i += 1) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

async function generateBackupCodes(userId, companyId) {
  if (!flags.isBackupCodesEnabled()) return { ok: false, code: 'BACKUP_DISABLED' };

  await db.query(
    'DELETE FROM user_mfa_backup_codes WHERE user_id = $1::uuid AND used_at IS NULL',
    [userId]
  );

  const plain = _generateCodes();
  for (const code of plain) {
    const hash = await bcrypt.hash(code, 10);
    await db.query(
      `INSERT INTO user_mfa_backup_codes (user_id, company_id, code_hash)
       VALUES ($1::uuid, $2::uuid, $3)`,
      [userId, companyId, hash]
    );
  }

  return { ok: true, codes: plain, count: plain.length, one_time: true };
}

async function verifyBackupCode(userId, code) {
  if (!flags.isBackupCodesEnabled()) return { ok: false, code: 'BACKUP_DISABLED' };

  const r = await db.query(
    `SELECT id, code_hash FROM user_mfa_backup_codes
     WHERE user_id = $1::uuid AND used_at IS NULL`,
    [userId]
  );

  for (const row of r.rows) {
    const match = await bcrypt.compare(String(code).replace(/\s/g, '').toUpperCase(), row.code_hash);
    if (match) {
      await db.query(
        'UPDATE user_mfa_backup_codes SET used_at = now() WHERE id = $1::uuid',
        [row.id]
      );
      return { ok: true };
    }
  }
  return { ok: false, code: 'BACKUP_INVALID' };
}

async function remainingCount(userId) {
  const r = await db.query(
    `SELECT COUNT(*)::int AS cnt FROM user_mfa_backup_codes
     WHERE user_id = $1::uuid AND used_at IS NULL`,
    [userId]
  );
  return r.rows[0]?.cnt || 0;
}

module.exports = {
  generateBackupCodes,
  verifyBackupCode,
  remainingCount,
};
