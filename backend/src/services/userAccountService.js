'use strict';

const db = require('../db');
const { hashPassword, verifyPassword } = require('../middleware/auth');

const DEFAULT_NOTIFICATION_PREFS = {
  push_enabled: true,
  sound: true,
  vibration: true,
  banner: true,
  critical_always: false,
  normal_enabled: true,
  notification_history: true,
  focus_mode: false,
  critical_priority_mode: true
};

const DEFAULT_UI_PREFS = {
  theme: 'dark',
  density: 'normal',
  locale: 'pt-BR',
  system_sounds: true,
  animations: true
};

/** @type {Map<string, { code: string, expires: number }>} */
const verifyCodes = new Map();
const VERIFY_TTL_MS = 10 * 60 * 1000;

function parseJson(val, fallback) {
  if (val == null) return { ...fallback };
  if (typeof val === 'object' && !Array.isArray(val)) return { ...fallback, ...val };
  try {
    const o = typeof val === 'string' ? JSON.parse(val) : val;
    return typeof o === 'object' && o && !Array.isArray(o) ? { ...fallback, ...o } : { ...fallback };
  } catch {
    return { ...fallback };
  }
}

function deviceLabelFromUa(ua) {
  if (!ua || typeof ua !== 'string') return 'Navegador';
  const u = ua.toLowerCase();
  if (u.includes('mobile') || u.includes('android')) return 'Mobile / app';
  if (u.includes('chrome')) return 'Chrome';
  if (u.includes('firefox')) return 'Firefox';
  if (u.includes('safari')) return 'Safari';
  if (u.includes('edge')) return 'Edge';
  return 'Web';
}

function computeProfileCompletion(row) {
  const pic = row.foto_perfil || row.avatar_url;
  const checks = [
    ['Nome completo', row.name && String(row.name).trim()],
    ['Telefone', row.phone && String(row.phone).trim()],
    ['E-mail', row.email && String(row.email).trim()],
    ['WhatsApp', row.whatsapp_number && String(row.whatsapp_number).trim()],
    ['Mensagem de status', row.status_message && String(row.status_message).trim()],
    ['Foto de perfil', pic && String(pic).trim()]
  ];
  const missing = checks.filter(([, v]) => !v).map(([label]) => label);
  const percent = Math.round(((checks.length - missing.length) / checks.length) * 100);
  return { percent, missing };
}

async function loadUserRow(userId) {
  const r = await db.query(
    `SELECT u.*, d.name AS department_resolved_name
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id AND d.company_id = u.company_id
     WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [userId]
  );
  return r.rows[0] || null;
}

function buildAccountPayload(row) {
  const notification_prefs = parseJson(row.app_notification_prefs, DEFAULT_NOTIFICATION_PREFS);
  const ui_prefs = parseJson(row.ui_prefs, DEFAULT_UI_PREFS);
  const read_only = {
    role: row.role || null,
    job_title: row.job_title || null,
    department: row.department_resolved_name || row.department || null,
    hierarchy_level: row.hierarchy_level != null ? row.hierarchy_level : null
  };
  const profile = {
    name: row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    whatsapp_number: row.whatsapp_number || row.whatsapp || '',
    status_message: row.status_message || '',
    foto_perfil: row.foto_perfil || null,
    avatar_url: row.avatar_url || row.foto_perfil || null,
    read_only
  };
  const verification = {
    email_verified: !!row.email_verified_at,
    whatsapp_verified: !!row.whatsapp_verified_at,
    email_verified_at: row.email_verified_at || null,
    whatsapp_verified_at: row.whatsapp_verified_at || null
  };
  return {
    profile,
    verification,
    notification_prefs,
    ui_prefs,
    profile_completion: computeProfileCompletion(row)
  };
}

async function getAccountBundle(userId) {
  const row = await loadUserRow(userId);
  if (!row) return null;
  const base = buildAccountPayload(row);
  return {
    ok: true,
    profile: base.profile,
    verification: base.verification,
    notification_prefs: base.notification_prefs,
    ui_prefs: base.ui_prefs,
    profile_completion: base.profile_completion,
    read_only: base.read_only
  };
}

async function patchProfile(userId, companyId, body) {
  const row = await loadUserRow(userId);
  if (!row) return { ok: false, error: 'Usuário não encontrado' };
  const cid = companyId || row.company_id;

  const name = body.name != null ? String(body.name).trim().slice(0, 200) : row.name;
  const phone = body.phone != null ? String(body.phone).trim().slice(0, 48) : row.phone;
  let email = body.email != null ? String(body.email).trim().toLowerCase().slice(0, 320) : row.email;
  const whatsapp_number =
    body.whatsapp_number != null
      ? String(body.whatsapp_number).trim().slice(0, 48)
      : row.whatsapp_number;
  const status_message =
    body.status_message != null ? String(body.status_message).trim().slice(0, 280) : row.status_message;

  if (email && email !== row.email && cid) {
    const clash = await db.query(
      `SELECT id FROM users WHERE company_id = $1 AND lower(trim(email)) = lower(trim($2)) AND id <> $3 AND deleted_at IS NULL`,
      [cid, email, userId]
    );
    if (clash.rows.length) {
      return { ok: false, error: 'Este e-mail já está em uso na empresa.' };
    }
  }

  await db.query(
    `UPDATE users SET
       name = $1,
       phone = $2,
       email = $3,
       whatsapp_number = $4,
       status_message = $5,
       updated_at = now()
     WHERE id = $6`,
    [name, phone, email, whatsapp_number, status_message, userId]
  );

  const next = await loadUserRow(userId);
  const bundle = buildAccountPayload(next);
  return {
    ok: true,
    profile: bundle.profile,
    verification: bundle.verification,
    profile_completion: bundle.profile_completion
  };
}

async function clearAvatar(userId) {
  await db.query(
    `UPDATE users SET foto_perfil = NULL, avatar_url = NULL, updated_at = now() WHERE id = $1 RETURNING *`,
    [userId]
  );
  const row = await loadUserRow(userId);
  return { ok: true, profile: buildAccountPayload(row).profile };
}

async function changePassword(userId, current_password, new_password, confirm_password) {
  if (!new_password || String(new_password).length < 8) {
    return { ok: false, error: 'A nova senha deve ter pelo menos 8 caracteres.' };
  }
  if (new_password !== confirm_password) {
    return { ok: false, error: 'Confirmação da nova senha não confere.' };
  }
  const r = await db.query(`SELECT password_hash FROM users WHERE id = $1 AND active = true`, [userId]);
  if (!r.rows[0]?.password_hash) {
    return { ok: false, error: 'Alteração de senha não disponível para este tipo de conta.' };
  }
  if (!verifyPassword(current_password, r.rows[0].password_hash)) {
    return { ok: false, error: 'Senha atual incorreta.' };
  }
  const newHash = hashPassword(new_password);
  await db.query(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, [newHash, userId]);
  return { ok: true };
}

function setVerifyCode(userId, channel, code) {
  verifyCodes.set(`${userId}:${channel}`, { code, expires: Date.now() + VERIFY_TTL_MS });
}

function getVerifyCode(userId, channel) {
  const k = `${userId}:${channel}`;
  const v = verifyCodes.get(k);
  if (!v || Date.now() > v.expires) {
    verifyCodes.delete(k);
    return null;
  }
  return v.code;
}

function clearVerifyCode(userId, channel) {
  verifyCodes.delete(`${userId}:${channel}`);
}

function generateSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendVerifyCode(userId, channel) {
  const row = await loadUserRow(userId);
  if (!row) return { ok: false, error: 'Usuário não encontrado' };
  const ch = String(channel || '').toLowerCase();
  if (ch !== 'email' && ch !== 'whatsapp') {
    return { ok: false, error: 'Canal inválido' };
  }
  if (ch === 'email' && !row.email) {
    return { ok: false, error: 'E-mail não cadastrado.' };
  }
  if (ch === 'whatsapp' && !(row.whatsapp_number || row.whatsapp)) {
    return { ok: false, error: 'WhatsApp não cadastrado.' };
  }

  const code = generateSixDigitCode();
  setVerifyCode(userId, ch, code);

  const out = {
    ok: true,
    message: ch === 'email' ? 'Código enviado por e-mail.' : 'Código enviado (verifique o WhatsApp em instantes).'
  };
  if (process.env.NODE_ENV !== 'production') {
    out.dev_hint = code;
  }
  console.info(`[userAccountService][verify:${ch}] user=${userId} code=${code} (dev log)`);
  return out;
}

async function confirmVerifyCode(userId, channel, rawCode) {
  const ch = String(channel || '').toLowerCase();
  const code = rawCode != null ? String(rawCode).trim() : '';
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: 'Informe o código de 6 dígitos.' };
  }
  const expected = getVerifyCode(userId, ch);
  if (!expected || expected !== code) {
    return { ok: false, error: 'Código inválido ou expirado.' };
  }

  if (ch === 'email') {
    await db.query(
      `UPDATE users SET email_verified_at = now(), updated_at = now() WHERE id = $1`,
      [userId]
    );
  } else {
    await db.query(
      `UPDATE users SET whatsapp_verified_at = now(), updated_at = now() WHERE id = $1`,
      [userId]
    );
  }
  clearVerifyCode(userId, ch);

  const row = await loadUserRow(userId);
  const bundle = buildAccountPayload(row);
  return {
    ok: true,
    profile: bundle.profile,
    verification: bundle.verification,
    profile_completion: bundle.profile_completion
  };
}

async function patchNotificationPrefs(userId, patch) {
  const row = await loadUserRow(userId);
  if (!row) return { ok: false, error: 'Usuário não encontrado' };
  const current = parseJson(row.app_notification_prefs, DEFAULT_NOTIFICATION_PREFS);
  const next = { ...current, ...patch };
  await db.query(`UPDATE users SET app_notification_prefs = $1::jsonb, updated_at = now() WHERE id = $2`, [
    JSON.stringify(next),
    userId
  ]);
  return { ok: true, notification_prefs: next };
}

async function patchUiPrefs(userId, patch) {
  const row = await loadUserRow(userId);
  if (!row) return { ok: false, error: 'Usuário não encontrado' };
  const current = parseJson(row.ui_prefs, DEFAULT_UI_PREFS);
  const next = { ...current, ...patch };
  await db.query(`UPDATE users SET ui_prefs = $1::jsonb, updated_at = now() WHERE id = $2`, [
    JSON.stringify(next),
    userId
  ]);
  return { ok: true, ui_prefs: next };
}

async function listSessions(userId, bearerToken) {
  const r = await db.query(
    `SELECT s.id, s.ip_address, s.user_agent, s.last_activity, s.created_at, s.expires_at,
            (s.token = $2) AS is_current
     FROM sessions s
     WHERE s.user_id = $1 AND s.expires_at > now()
     ORDER BY s.last_activity DESC NULLS LAST`,
    [userId, bearerToken || '']
  );
  return r.rows.map((s) => ({
    id: s.id,
    ip_address: s.ip_address || null,
    user_agent: s.user_agent || null,
    last_activity: s.last_activity || s.created_at,
    device_label: deviceLabelFromUa(s.user_agent),
    is_current: !!s.is_current
  }));
}

async function deleteSession(userId, sessionId, bearerToken) {
  const r = await db.query(
    `DELETE FROM sessions WHERE id = $1 AND user_id = $2 RETURNING id, token`,
    [sessionId, userId]
  );
  if (!r.rows.length) return { ok: false, error: 'Sessão não encontrada' };
  const sessions = await listSessions(userId, bearerToken);
  return { ok: true, sessions };
}

async function revokeOtherSessions(userId, bearerToken) {
  if (!bearerToken || String(bearerToken).trim() === '') {
    const sessions = await listSessions(userId, '');
    return {
      ok: false,
      error: 'Não foi possível identificar a sessão atual. Faça login novamente.',
      sessions
    };
  }
  const r = await db.query(
    `DELETE FROM sessions WHERE user_id = $1 AND token IS DISTINCT FROM $2`,
    [userId, bearerToken]
  );
  const sessions = await listSessions(userId, bearerToken);
  return { ok: true, sessions, terminated: r.rowCount || 0 };
}

module.exports = {
  getAccountBundle,
  patchProfile,
  clearAvatar,
  changePassword,
  sendVerifyCode,
  confirmVerifyCode,
  patchNotificationPrefs,
  patchUiPrefs,
  listSessions,
  deleteSession,
  revokeOtherSessions
};
