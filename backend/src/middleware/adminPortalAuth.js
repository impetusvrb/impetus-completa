'use strict';

const jwt = require('jsonwebtoken');
const db = require('../db');

const IMPETUS_ADMIN_JWT_SECRET = (process.env.IMPETUS_ADMIN_JWT_SECRET || '').trim();
if (!IMPETUS_ADMIN_JWT_SECRET) {
  console.error(
    '[ADMIN_PORTAL] IMPETUS_ADMIN_JWT_SECRET é obrigatório. Defina no ambiente (.env). Encerrando.'
  );
  process.exit(1);
}

const JWT_OPTS = { expiresIn: '8h', issuer: 'impetus-admin-portal' };

function signAdminToken(adminRow) {
  return jwt.sign(
    {
      sub: adminRow.id,
      typ: 'impetus_admin',
      perfil: adminRow.perfil,
      email: adminRow.email
    },
    IMPETUS_ADMIN_JWT_SECRET,
    JWT_OPTS
  );
}

async function loadAdminById(id) {
  const r = await db.query(
    `SELECT id, nome, email, perfil, ativo, created_at, last_login_at
     FROM admin_users WHERE id = $1`,
    [id]
  );
  return r.rows[0] || null;
}

function requireAdminAuth(req, res, next) {
  const raw =
    req.headers.authorization?.replace(/^Bearer\s+/i, '') ||
    req.headers['x-admin-token'] ||
    '';

  if (!raw) {
    return res.status(401).json({ ok: false, error: 'Token ausente', code: 'ADMIN_AUTH_REQUIRED' });
  }

  let decoded;
  try {
    decoded = jwt.verify(raw, IMPETUS_ADMIN_JWT_SECRET);
  } catch {
    return res.status(401).json({ ok: false, error: 'Token inválido ou expirado', code: 'ADMIN_AUTH_INVALID' });
  }

  if (decoded.typ !== 'impetus_admin' || !decoded.sub) {
    return res.status(401).json({ ok: false, error: 'Token inválido', code: 'ADMIN_AUTH_INVALID' });
  }

  loadAdminById(decoded.sub)
    .then((admin) => {
      if (!admin || !admin.ativo) {
        return res.status(403).json({ ok: false, error: 'Usuário administrativo inativo', code: 'ADMIN_INACTIVE' });
      }
      req.adminUser = admin;
      req.adminToken = raw;
      next();
    })
    .catch((e) => {
      console.error('[requireAdminAuth]', e);
      res.status(500).json({ ok: false, error: 'Erro ao validar sessão' });
    });
}

function requireAdminProfiles(...allowed) {
  const set = new Set(allowed);
  return (req, res, next) => {
    const p = req.adminUser?.perfil;
    if (!p || !set.has(p)) {
      return res.status(403).json({ ok: false, error: 'Permissão insuficiente', code: 'ADMIN_FORBIDDEN' });
    }
    next();
  };
}

/** super_admin OU admin_comercial */
function requireCommercialOrSuper(req, res, next) {
  const p = req.adminUser?.perfil;
  if (p === 'super_admin' || p === 'admin_comercial') return next();
  return res.status(403).json({ ok: false, error: 'Permissão insuficiente', code: 'ADMIN_FORBIDDEN' });
}

module.exports = {
  signAdminToken,
  loadAdminById,
  requireAdminAuth,
  requireAdminProfiles,
  requireCommercialOrSuper,
  IMPETUS_ADMIN_JWT_SECRET
};
