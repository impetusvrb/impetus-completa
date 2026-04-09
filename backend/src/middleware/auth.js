/**
 * MIDDLEWARE DE AUTENTICAÇÃO E AUTORIZAÇÃO
 * Implementa controle de acesso hierárquico (RBAC)
 */

const db = require('../db');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { logAction } = require('./audit');
const { AUTH, ERRORS } = require('../constants/messages');

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'impetus_super_secret_key');
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  console.error('[AUTH] JWT_SECRET obrigatório em produção. Configure em .env');
  process.exit(1);
}

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
      SELECT s.id as session_id, s.user_id, s.expires_at, s.active_operational_team_member_id, s.factory_member_confirmed_at,
             u.id, u.name, u.email, u.role, u.company_id, 
             u.department_id, u.hierarchy_level, u.supervisor_id, u.area, u.job_title, u.department,
             u.hr_responsibilities,
             u.functional_area, u.dashboard_profile,
             u.preferred_kpis, u.dashboard_preferences, u.seniority_level, u.onboarding_completed, u.ai_profile_context,
             u.permissions, u.active, u.is_first_access, u.must_change_password,
             u.temporary_password_expires_at, u.role_verified, u.role_verification_status, u.is_company_root,
             u.company_role_id, u.is_factory_team_account, u.operational_team_id
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
      supervisor_id: session.supervisor_id,
      area: session.area,
      job_title: session.job_title,
      department: session.department,
      hr_responsibilities: session.hr_responsibilities || null,
      functional_area: session.functional_area || null,
      dashboard_profile: session.dashboard_profile || null,
      preferred_kpis: session.preferred_kpis,
      dashboard_preferences: session.dashboard_preferences,
      seniority_level: session.seniority_level || null,
      onboarding_completed: session.onboarding_completed === true,
      ai_profile_context: session.ai_profile_context,
      permissions: session.permissions || [],
      sessionId: session.session_id,
      is_first_access: session.is_first_access || false,
      must_change_password: session.must_change_password || false,
      temporary_password_expires_at: session.temporary_password_expires_at,
      role_verified: session.role_verified === true,
      role_verification_status: session.role_verification_status || 'pending',
      is_company_root: session.is_company_root === true,
      company_role_id: session.company_role_id || null,
      is_factory_team_account: session.is_factory_team_account === true,
      operational_team_id: session.operational_team_id || null,
      active_operational_team_member_id: session.active_operational_team_member_id || null,
      factory_member_confirmed_at: session.factory_member_confirmed_at || null
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
 * Valida JWT e carrega usuário do banco (fallback quando login retorna JWT)
 */
async function validateJWTAndLoadUser(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.id) return null;

    const r = await db.query(`
      SELECT id, name, email, role, company_id, department_id, hierarchy_level,
             supervisor_id, area, job_title, department, hr_responsibilities, functional_area, dashboard_profile,
             preferred_kpis, dashboard_preferences, seniority_level, onboarding_completed, ai_profile_context,
             permissions, active,
             is_first_access, must_change_password, temporary_password_expires_at,
             role_verified, role_verification_status, is_company_root, company_role_id,
             is_factory_team_account, operational_team_id
      FROM users WHERE id = $1 AND active = true AND deleted_at IS NULL
    `, [decoded.id]);

    if (r.rows.length === 0) return null;
    const u = r.rows[0];
    const companyId = u.company_id || decoded.company_id || null;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      company_id: companyId,
      department_id: u.department_id,
      hierarchy_level: u.hierarchy_level,
      supervisor_id: u.supervisor_id,
      area: u.area,
      job_title: u.job_title,
      department: u.department,
      hr_responsibilities: u.hr_responsibilities || null,
      functional_area: u.functional_area || null,
      dashboard_profile: u.dashboard_profile || null,
      preferred_kpis: u.preferred_kpis,
      dashboard_preferences: u.dashboard_preferences,
      seniority_level: u.seniority_level || null,
      onboarding_completed: u.onboarding_completed === true,
      ai_profile_context: u.ai_profile_context,
      permissions: u.permissions || [],
      is_first_access: u.is_first_access || false,
      must_change_password: u.must_change_password || false,
      temporary_password_expires_at: u.temporary_password_expires_at,
      role_verified: u.role_verified === true,
      role_verification_status: u.role_verification_status || 'pending',
      is_company_root: u.is_company_root === true,
      company_role_id: u.company_role_id || null,
      is_factory_team_account: u.is_factory_team_account === true,
      operational_team_id: u.operational_team_id || null,
      active_operational_team_member_id: null,
      factory_member_confirmed_at: null,
      sessionId: null
    };
  } catch {
    return null;
  }
}

/**
 * Enriquece utilizador JWT com dados da sessão (membro ativo da equipe operacional).
 */
async function attachSessionOperationalMember(user, rawToken) {
  if (!user || !rawToken) return user;
  try {
    const r = await db.query(
      `SELECT s.id as session_id, s.active_operational_team_member_id, s.factory_member_confirmed_at
       FROM sessions s
       WHERE s.token = $1 AND s.expires_at > now() AND s.user_id = $2
       LIMIT 1`,
      [rawToken, user.id]
    );
    if (r.rows?.length) {
      return {
        ...user,
        sessionId: r.rows[0].session_id,
        active_operational_team_member_id: r.rows[0].active_operational_team_member_id || null,
        factory_member_confirmed_at: r.rows[0].factory_member_confirmed_at || null
      };
    }
  } catch (_) {
    /* ignore */
  }
  return user;
}

/**
 * Quando users.company_id está NULL na BD mas o JWT de login inclui company_id,
 * repõe o tenant (evita 403 "Empresa não identificada" em rotas como /api/tpm).
 * Só aplica se a BD não tiver company_id — a BD continua a ter prioridade.
 */
function attachCompanyIdFromJwtClaims(user, rawToken) {
  if (!user || user.company_id) return user;
  if (!rawToken || typeof rawToken !== 'string') return user;
  if (rawToken.split('.').length !== 3) return user;
  try {
    const decoded = jwt.verify(rawToken, JWT_SECRET);
    if (decoded && decoded.company_id) {
      return { ...user, company_id: decoded.company_id };
    }
  } catch (_) {
    /* token opaco ou JWT inválido */
  }
  return user;
}

/**
 * Middleware de autenticação
 * Aceita: token de sessão (tabela sessions) OU JWT (login retorna JWT)
 */
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') ||
                req.headers['x-access-token'] ||
                req.query.token;

  if (!token) {
    return res.status(401).json({
      ok: false,
      error: AUTH.TOKEN_MISSING,
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  validateSession(token).then(async (user) => {
    if (!user) {
      user = await validateJWTAndLoadUser(token);
      if (user) user = await attachSessionOperationalMember(user, token);
    }
    if (!user) {
      return res.status(401).json({
        ok: false,
        error: AUTH.SESSION_INVALID,
        code: 'AUTH_SESSION_INVALID'
      });
    }

    req.user = attachCompanyIdFromJwtClaims(user, token);
    req.session = { id: user.sessionId };
    next();
  }).catch(err => {
    console.error('[AUTH_MIDDLEWARE_ERROR]', err.message);
    res.status(500).json({
      ok: false,
      error: ERRORS.AUTH_VALIDATION
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
        error: AUTH.NOT_AUTHENTICATED
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
        error: AUTH.ACCESS_DENIED_HIERARCHY,
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
        error: AUTH.NOT_AUTHENTICATED
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
        error: AUTH.ACCESS_DENIED_PERMISSION,
        code: 'AUTH_PERMISSION_DENIED',
        required: permission
      });
    }

    next();
  };
}

/**
 * Autorização por role (ex.: apenas admin do sistema).
 * Comparação case-insensitive com a lista permitida.
 */
function requireRole(...allowedRoles) {
  const allowed = new Set(allowedRoles.map((r) => String(r).toLowerCase()));
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: AUTH.NOT_AUTHENTICATED,
        code: 'AUTH_REQUIRED'
      });
    }
    const role = String(req.user.role || '').toLowerCase();
    if (!allowed.has(role)) {
      logAction({
        companyId: req.user.company_id,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'access_denied',
        entityType: 'role',
        description: `Acesso negado: role requerida ${[...allowed].join('|')}, atual ${role}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'warning',
        success: false
      }).catch(() => {});
      return res.status(403).json({
        ok: false,
        error: AUTH.ACCESS_DENIED_ROLE,
        code: 'AUTH_ROLE_DENIED',
        required_roles: [...allowedRoles]
      });
    }
    next();
  };
}

/**
 * Exige company_id no utilizador autenticado (cadastros multi-tenant).
 */
function requireCompanyId(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: AUTH.NOT_AUTHENTICATED, code: 'AUTH_REQUIRED' });
  }
  if (!req.user.company_id) {
    return res.status(403).json({
      ok: false,
      error: AUTH.COMPANY_REQUIRED,
      code: 'AUTH_COMPANY_REQUIRED'
    });
  }
  next();
}

/**
 * Middleware que verifica se usuário pertence à mesma empresa
 */
/**
 * Contas de equipe (login coletivo): exige membro operacional selecionado na sessão para rastreabilidade.
 */
function requireFactoryOperationalMember(req, res, next) {
  const u = req.user;
  if (!u || !u.is_factory_team_account) return next();
  if (!u.active_operational_team_member_id) {
    return res.status(403).json({
      ok: false,
      error: 'Identifique quem está operando na equipe antes de registrar esta ação.',
      code: 'FACTORY_MEMBER_REQUIRED'
    });
  }
  next();
}

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
      error: AUTH.ACCESS_DENIED_COMPANY,
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
  JWT_SECRET,
  generateToken,
  createSession,
  validateSession,
  destroySession,
  requireAuth,
  requireHierarchy,
  requireRole,
  requireCompanyId,
  requirePermission,
  requireFactoryOperationalMember,
  sameCompanyOnly,
  hashPassword,
  verifyPassword
};
