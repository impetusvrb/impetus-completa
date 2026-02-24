/**
 * MIDDLEWARE DE AUTENTICAÇÃO E AUTORIZAÇÃO
 * Implementa controle de acesso hierárquico (RBAC)
 */

const db = require('../db');
const crypto = require('crypto');
const { logAction } = require('./audit');

/**
 * Gera token de sessão
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Cria sessão para usuário
 */
async function createSession(userId, ipAddress, userAgent, expiresInHours = 24) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  try {
    await db.query(`
      INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, token, ipAddress, userAgent, expiresAt]);

    // Atualizar last_login do usuário
    await db.query(`
      UPDATE users SET last_login = now() WHERE id = $1
    `, [userId]);

    return { token, expiresAt };
  } catch (err) {
    console.error('[CREATE_SESSION_ERROR]', err.message);
    throw err;
  }
}

/**
 * Valida token de sessão
 */
async function validateSession(token) {
  try {
    const result = await db.query(`
      SELECT s.id as session_id, s.user_id, s.expires_at,
             u.id, u.name, u.email, u.role, u.company_id, 
             u.department_id, u.hierarchy_level, u.area, u.job_title, u.department,
             u.permissions, u.active, u.is_first_access, u.must_change_password,
             u.temporary_password_expires_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = $1 
        AND s.expires_at > now()
        AND u.active = true
        AND u.deleted_at IS NULL
    `, [token]);

    if (result.rows.length === 0) {
      return null;
    }

    const session = result.rows[0];

    // Atualizar last_activity
    await db.query(`
      UPDATE sessions SET last_activity = now() WHERE id = $1
    `, [session.session_id]);

    // Atualizar last_seen do usuário
    await db.query(`
      UPDATE users SET last_seen = now() WHERE id = $1
    `, [session.user_id]);

    return {
      id: session.id,
      name: session.name,
      email: session.email,
      role: session.role,
      company_id: session.company_id,
      department_id: session.department_id,
      hierarchy_level: session.hierarchy_level,
      area: session.area,
      job_title: session.job_title,
      department: session.department,
      permissions: session.permissions || [],
      sessionId: session.session_id,
      is_first_access: session.is_first_access || false,
      must_change_password: session.must_change_password || false,
      temporary_password_expires_at: session.temporary_password_expires_at
    };
  } catch (err) {
    console.error('[VALIDATE_SESSION_ERROR]', err.message);
    return null;
  }
}

/**
 * Destrói sessão (logout)
 */
async function destroySession(token) {
  try {
    await db.query(`
      DELETE FROM sessions WHERE token = $1
    `, [token]);
    return { ok: true };
  } catch (err) {
    console.error('[DESTROY_SESSION_ERROR]', err.message);
    throw err;
  }
}

/**
 * Middleware de autenticação
 * Verifica se usuário está autenticado
 */
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.headers['x-access-token'] ||
                req.query.token;

  if (!token) {
    return res.status(401).json({
      ok: false,
      error: 'Token não fornecido',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  validateSession(token).then(user => {
    if (!user) {
      return res.status(401).json({
        ok: false,
        error: 'Sessão inválida ou expirada',
        code: 'AUTH_SESSION_INVALID'
      });
    }

    req.user = user;
    req.session = { id: user.sessionId };
    next();
  }).catch(err => {
    console.error('[AUTH_MIDDLEWARE_ERROR]', err.message);
    res.status(500).json({
      ok: false,
      error: 'Erro ao validar autenticação'
    });
  });
}

/**
 * Middleware de autorização por hierarquia
 * Verifica se usuário tem nível hierárquico mínimo
 */
function requireHierarchy(minLevel) {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: 'Usuário não autenticado'
      });
    }

    // 0 = CEO (acesso total, não configurável)
    // 1 = Diretoria
    // 2 = Gerente
    // 3 = Coordenador
    // 4 = Supervisor
    // 5 = Colaborador (mais baixo)
    
    if (user.hierarchy_level > minLevel) {
      logAction({
        companyId: user.company_id,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'access_denied',
        entityType: 'hierarchy',
        description: `Tentativa de acesso negada: hierarquia insuficiente (requerido: ${minLevel}, atual: ${user.hierarchy_level})`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'warning',
        success: false
      }).catch(() => {});
      return res.status(403).json({
        ok: false,
        error: 'Acesso negado - hierarquia insuficiente',
        code: 'AUTH_HIERARCHY_DENIED',
        required: minLevel,
        current: user.hierarchy_level
      });
    }

    next();
  };
}

/**
 * Middleware de autorização por permissão
 */
function requirePermission(permission) {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: 'Usuário não autenticado'
      });
    }

    const permissions = user.permissions || [];
    
    if (!permissions.includes(permission) && !permissions.includes('*')) {
      logAction({
        companyId: user.company_id,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'access_denied',
        entityType: 'permission',
        description: `Tentativa de acesso negada: permissão insuficiente (requerida: ${permission})`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'warning',
        success: false
      }).catch(() => {});
      return res.status(403).json({
        ok: false,
        error: 'Acesso negado - permissão insuficiente',
        code: 'AUTH_PERMISSION_DENIED',
        required: permission
      });
    }

    next();
  };
}

/**
 * Middleware que verifica se usuário pertence à mesma empresa
 */
function sameCompanyOnly(req, res, next) {
  const user = req.user;
  const requestedCompanyId = req.params.companyId || req.body.company_id || req.query.company_id;

  if (requestedCompanyId && user.company_id !== requestedCompanyId) {
    logAction({
      companyId: user.company_id,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'access_denied',
      entityType: 'company',
      description: `Tentativa de acesso negada: empresa diferente (solicitado: ${requestedCompanyId})`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'warning',
      success: false
    }).catch(() => {});
    return res.status(403).json({
      ok: false,
      error: 'Acesso negado - empresa diferente',
      code: 'AUTH_COMPANY_MISMATCH'
    });
  }

  next();
}

/**
 * Hash de senha com bcrypt (seguro contra rainbow tables)
 */
const bcrypt = require('bcryptjs');

function hashPassword(password) {
  return bcrypt.hashSync(password, 12); // 12 rounds
}

/**
 * Verifica senha
 */
function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

module.exports = {
  generateToken,
  createSession,
  validateSession,
  destroySession,
  requireAuth,
  requireHierarchy,
  requirePermission,
  sameCompanyOnly,
  hashPassword,
  verifyPassword
};
