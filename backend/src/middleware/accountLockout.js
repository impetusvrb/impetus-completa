'use strict';

/**
 * Account Lockout — protecção contra brute force no login.
 *
 * Armazena tentativas em memória (escalável com Redis posteriormente).
 * Após MAX_ATTEMPTS dentro da janela, bloqueia por LOCKOUT_DURATION.
 * Também registra no banco para auditoria e persistência entre restarts.
 */

const MAX_ATTEMPTS = parseInt(process.env.LOCKOUT_MAX_ATTEMPTS, 10) || 5;
const WINDOW_MS = parseInt(process.env.LOCKOUT_WINDOW_MS, 10) || (15 * 60 * 1000);
const LOCKOUT_MS = parseInt(process.env.LOCKOUT_DURATION_MS, 10) || (30 * 60 * 1000);

const _attempts = new Map();

function _cleanup() {
  const now = Date.now();
  for (const [key, entry] of _attempts) {
    if (now - entry.firstAttempt > WINDOW_MS + LOCKOUT_MS) {
      _attempts.delete(key);
    }
  }
}

setInterval(_cleanup, 5 * 60 * 1000).unref();

function _key(email, ip) {
  return `${(email || '').toLowerCase().trim()}|${ip || 'unknown'}`;
}

function isLocked(email, ip) {
  const k = _key(email, ip);
  const entry = _attempts.get(k);
  if (!entry) return false;
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    return true;
  }
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    _attempts.delete(k);
    return false;
  }
  return false;
}

function getRemainingLockMs(email, ip) {
  const k = _key(email, ip);
  const entry = _attempts.get(k);
  if (!entry?.lockedUntil) return 0;
  return Math.max(0, entry.lockedUntil - Date.now());
}

function recordFailure(email, ip) {
  const k = _key(email, ip);
  const now = Date.now();
  let entry = _attempts.get(k);
  if (!entry || (now - entry.firstAttempt > WINDOW_MS)) {
    entry = { count: 0, firstAttempt: now, lockedUntil: null };
  }
  entry.count++;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
  _attempts.set(k, entry);
  return { locked: !!entry.lockedUntil, attempts: entry.count, max: MAX_ATTEMPTS };
}

function recordSuccess(email, ip) {
  _attempts.delete(_key(email, ip));
}

async function persistLockoutEvent(db, email, ip, event) {
  try {
    await db.query(
      `INSERT INTO audit_logs (action, entity_type, description, user_name, created_at)
       VALUES ($1, 'auth', $2, $3, NOW())`,
      [
        `auth_lockout_${event}`,
        JSON.stringify({ email, ip, event, max: MAX_ATTEMPTS }),
        email || 'unknown',
      ]
    );
  } catch (_) { /* never break auth flow */ }
}

function loginLockoutMiddleware(req, res, next) {
  const email = (req.body?.email || '').toLowerCase().trim();
  const ip = req.ip || 'unknown';
  if (isLocked(email, ip)) {
    const remainMs = getRemainingLockMs(email, ip);
    const remainMin = Math.ceil(remainMs / 60000);
    return res.status(429).json({
      ok: false,
      error: `Conta temporariamente bloqueada após ${MAX_ATTEMPTS} tentativas. Tente em ${remainMin} min.`,
      code: 'ACCOUNT_LOCKED',
      retry_after_ms: remainMs,
    });
  }
  next();
}

module.exports = {
  isLocked,
  getRemainingLockMs,
  recordFailure,
  recordSuccess,
  persistLockoutEvent,
  loginLockoutMiddleware,
  MAX_ATTEMPTS,
};
