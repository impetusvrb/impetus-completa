'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../db');

let schemaReady = false;

function isEnabled() {
  return process.env.IMPETUS_ADMIN_DEVICE_TRUST_ENABLED === 'true';
}

function mode() {
  return (process.env.IMPETUS_ADMIN_DEVICE_TRUST_MODE || 'enforce').toLowerCase();
}

function isEnforce() {
  return isEnabled() && mode() === 'enforce';
}

function hashDevice(parts = {}) {
  const payload = JSON.stringify({
    device_id: String(parts.device_id || '').trim(),
    ua: String(parts.user_agent || '').slice(0, 256)
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf) return String(xf).split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || '';
}

function ipMatchesPattern(ip, pattern) {
  const p = String(pattern || '').trim();
  const addr = String(ip || '').trim();
  if (!p || !addr) return false;
  if (p === addr) return true;
  if (p.endsWith('.*') && addr.startsWith(p.slice(0, -1))) return true;
  if (p.endsWith(':*') && addr.startsWith(p.slice(0, -1))) return true;
  if (p.includes('/') && addr.includes(':') === p.includes(':')) {
    try {
      return cidrMatch(addr, p);
    } catch {
      return false;
    }
  }
  return false;
}

function cidrMatch(ip, cidr) {
  if (!cidr.includes('/')) return ip === cidr;
  const [base, bitsStr] = cidr.split('/');
  const bits = Number(bitsStr);
  if (ip.includes(':')) {
    return ipv6PrefixMatch(ip, base, bits);
  }
  const ipN = ipv4ToInt(ip);
  const baseN = ipv4ToInt(base);
  if (ipN == null || baseN == null) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipN & mask) === (baseN & mask);
}

function ipv4ToInt(ip) {
  const p = ip.split('.');
  if (p.length !== 4) return null;
  let n = 0;
  for (const x of p) {
    const v = Number(x);
    if (v < 0 || v > 255) return null;
    n = (n << 8) + v;
  }
  return n >>> 0;
}

function ipv6PrefixMatch(ip, base, bits) {
  const norm = (a) => a.toLowerCase().split(':').map((h) => h || '0');
  const expand = (parts) => {
    const missing = 8 - parts.filter(Boolean).length;
    const out = [];
    let skipped = false;
    for (const h of parts) {
      if (!h && !skipped) {
        for (let i = 0; i < missing; i += 1) out.push('0');
        skipped = true;
      } else if (h) out.push(h.padStart(4, '0'));
    }
    while (out.length < 8) out.push('0');
    return out.slice(0, 8);
  };
  const a = expand(norm(ip));
  const b = expand(norm(base));
  const fullHex = (arr) => arr.map((h) => parseInt(h, 16));
  const ai = fullHex(a);
  const bi = fullHex(b);
  let remaining = bits;
  for (let i = 0; i < 8 && remaining > 0; i += 1) {
    const take = Math.min(16, remaining);
    const mask = take === 16 ? 0xffff : (~0 << (16 - take)) & 0xffff;
    if ((ai[i] & mask) !== (bi[i] & mask)) return false;
    remaining -= take;
  }
  return true;
}

function envTrustedPatterns() {
  const raw = process.env.IMPETUS_TRUSTED_CIDRS || process.env.IMPETUS_ADMIN_TRUSTED_CIDRS || '';
  const extra = [
    '170.246.*',
    '186.225.*',
    '2804:2484:*',
    '2804:2980:*',
    '127.0.0.1',
    '::1'
  ];
  const fromEnv = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...fromEnv, ...extra])];
}

async function ensureSchema() {
  if (schemaReady) return;
  const sqlPath = path.join(__dirname, '../models/admin_portal_device_trust_migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await db.query(sql);
  schemaReady = true;
  await seedGlobalTrustedIps();
}

async function seedGlobalTrustedIps() {
  for (const pattern of envTrustedPatterns()) {
    const exists = await db.query(
      `SELECT id FROM admin_trusted_ips
       WHERE admin_user_id IS NULL AND ip_pattern = $1 AND status = 'approved' LIMIT 1`,
      [pattern]
    );
    if (!exists.rows.length) {
      await db.query(
        `INSERT INTO admin_trusted_ips (admin_user_id, ip_pattern, label, status)
         VALUES (NULL, $1, $2, 'approved')`,
        [pattern, 'Equipa IMPETUS (auto)']
      );
    }
  }
}

async function isIpAuthorized(adminUserId, ip) {
  await ensureSchema();
  const patterns = envTrustedPatterns();
  const dbRows = await db.query(
    `SELECT ip_pattern FROM admin_trusted_ips
     WHERE status = 'approved' AND (admin_user_id IS NULL OR admin_user_id = $1::uuid)`,
    [adminUserId]
  );
  for (const row of dbRows.rows) patterns.push(row.ip_pattern);
  return patterns.some((p) => ipMatchesPattern(ip, p));
}

async function getApprovedDevice(adminUserId, fingerprintHash) {
  const r = await db.query(
    `SELECT id, device_label, last_ip, status FROM admin_trusted_devices
     WHERE admin_user_id = $1::uuid AND device_fingerprint_hash = $2 AND status = 'approved'`,
    [adminUserId, fingerprintHash]
  );
  return r.rows[0] || null;
}

async function upsertPendingDevice(adminUserId, meta) {
  const fp = hashDevice(meta);
  const r = await db.query(
    `INSERT INTO admin_trusted_devices
       (admin_user_id, device_fingerprint_hash, device_id, device_label, user_agent, last_ip, status)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, 'pending')
     ON CONFLICT (admin_user_id, device_fingerprint_hash)
     DO UPDATE SET
       last_ip = EXCLUDED.last_ip,
       user_agent = EXCLUDED.user_agent,
       updated_at = now()
     RETURNING id, status`,
    [
      adminUserId,
      fp,
      meta.device_id || null,
      meta.device_label || meta.device_id || 'Dispositivo novo',
      meta.user_agent || null,
      meta.ip || null
    ]
  );
  return { ...r.rows[0], fingerprint: fp };
}

async function touchApprovedDevice(adminUserId, fingerprintHash, ip) {
  await db.query(
    `UPDATE admin_trusted_devices
     SET last_seen_at = now(), last_ip = $3, updated_at = now()
     WHERE admin_user_id = $1::uuid AND device_fingerprint_hash = $2 AND status = 'approved'`,
    [adminUserId, fingerprintHash, ip]
  );
}

async function autoApproveDevice(adminUserId, meta, approvedBy = null) {
  const fp = hashDevice(meta);
  await db.query(
    `INSERT INTO admin_trusted_devices
       (admin_user_id, device_fingerprint_hash, device_id, device_label, user_agent, last_ip, status, approved_by, last_seen_at)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, 'approved', $7, now())
     ON CONFLICT (admin_user_id, device_fingerprint_hash)
     DO UPDATE SET status = 'approved', last_seen_at = now(), last_ip = EXCLUDED.last_ip, updated_at = now()`,
    [
      adminUserId,
      fp,
      meta.device_id || null,
      meta.device_label || 'Dispositivo aprovado automaticamente',
      meta.user_agent || null,
      meta.ip || null,
      approvedBy
    ]
  );
  return fp;
}

/**
 * Valida IP + dispositivo antes de emitir token.
 * @returns {{ ok: true } | { ok: false, code: string, error: string, pending_id?: string }}
 */
async function assertLoginAuthorized(adminUser, req, body = {}) {
  if (!isEnabled()) return { ok: true, skipped: true };

  await ensureSchema();
  const ip = clientIp(req);
  const meta = {
    device_id: body.device_id,
    device_label: body.device_label,
    user_agent: req.headers['user-agent'] || '',
    ip
  };
  const fp = hashDevice(meta);

  const ipOk = await isIpAuthorized(adminUser.id, ip);
  const device = await getApprovedDevice(adminUser.id, fp);

  if (device) {
    if (!ipOk && isEnforce()) {
      return {
        ok: false,
        code: 'ADMIN_IP_NOT_AUTHORIZED',
        error: 'IP não autorizado para esta conta. Contacte o administrador IMPETUS.',
        ip
      };
    }
    await touchApprovedDevice(adminUser.id, fp, ip);
    return { ok: true, ip, device_id: device.id };
  }

  if (!ipOk) {
    if (isEnforce()) {
      const pending = await upsertPendingDevice(adminUser.id, meta);
      return {
        ok: false,
        code: 'ADMIN_IP_NOT_AUTHORIZED',
        error: 'IP ou rede não autorizada. Pedido registado para aprovação.',
        ip,
        pending_id: pending.id,
        device_pending: pending.status === 'pending'
      };
    }
    return { ok: true, observe: true, warning: 'ip_not_trusted' };
  }

  // IP da equipa OK, dispositivo novo — criar pedido pendente (não derruba software)
  const pending = await upsertPendingDevice(adminUser.id, meta);

  // super_admin em IP da equipa → auto-aprovar (evita bloqueio do único gestor)
  if (adminUser.perfil === 'super_admin' && ipOk) {
    await autoApproveDevice(adminUser.id, meta, adminUser.id);
    return { ok: true, auto_approved: true, ip };
  }

  if (isEnforce()) {
    return {
      ok: false,
      code: 'ADMIN_DEVICE_PENDING',
      error: 'Dispositivo não autorizado. Aguarde aprovação de um super administrador.',
      pending_id: pending.id,
      ip,
      device_pending: true
    };
  }

  return { ok: true, observe: true, pending_id: pending.id };
}

async function listDevices(adminUserId = null) {
  await ensureSchema();
  const r = adminUserId
    ? await db.query(
        `SELECT d.*, u.email AS admin_email, u.nome AS admin_nome
         FROM admin_trusted_devices d
         JOIN admin_users u ON u.id = d.admin_user_id
         WHERE d.admin_user_id = $1::uuid
         ORDER BY d.updated_at DESC`,
        [adminUserId]
      )
    : await db.query(
        `SELECT d.*, u.email AS admin_email, u.nome AS admin_nome
         FROM admin_trusted_devices d
         JOIN admin_users u ON u.id = d.admin_user_id
         ORDER BY d.updated_at DESC LIMIT 100`
      );
  return r.rows;
}

async function listIps(adminUserId = null) {
  await ensureSchema();
  const r = adminUserId
    ? await db.query(
        `SELECT * FROM admin_trusted_ips
         WHERE admin_user_id IS NULL OR admin_user_id = $1::uuid
         ORDER BY created_at DESC`,
        [adminUserId]
      )
    : await db.query(`SELECT * FROM admin_trusted_ips ORDER BY created_at DESC LIMIT 100`);
  return r.rows;
}

async function approveDevice(deviceId, approverId) {
  const r = await db.query(
    `UPDATE admin_trusted_devices
     SET status = 'approved', approved_by = $2::uuid, updated_at = now(), last_seen_at = now()
     WHERE id = $1::uuid AND status IN ('pending', 'revoked')
     RETURNING *`,
    [deviceId, approverId]
  );
  return r.rows[0] || null;
}

async function revokeDevice(deviceId) {
  const r = await db.query(
    `UPDATE admin_trusted_devices SET status = 'revoked', updated_at = now()
     WHERE id = $1::uuid RETURNING *`,
    [deviceId]
  );
  return r.rows[0] || null;
}

async function addTrustedIp({ adminUserId, ipPattern, label, approverId }) {
  const r = await db.query(
    `INSERT INTO admin_trusted_ips (admin_user_id, ip_pattern, label, status, approved_by)
     VALUES ($1, $2, $3, 'approved', $4)
     RETURNING *`,
    [adminUserId || null, ipPattern, label || null, approverId || null]
  );
  return r.rows[0];
}

module.exports = {
  isEnabled,
  isEnforce,
  ensureSchema,
  hashDevice,
  clientIp,
  ipMatchesPattern,
  assertLoginAuthorized,
  listDevices,
  listIps,
  approveDevice,
  revokeDevice,
  addTrustedIp,
  envTrustedPatterns
};
