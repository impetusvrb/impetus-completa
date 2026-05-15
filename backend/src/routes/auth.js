const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, JWT_ALGORITHMS, destroySession } = require('../middleware/auth');
const { resolveHierarchyLevel } = require('../services/hierarchyResolver');
const contextualSystemAdmin = require('../services/contextualSystemAdminService');
const tenantAdminService = require('../services/tenantAdminService');
const roleVerification = require('../services/roleVerificationService');
const dashboardProfileResolver = require('../services/dashboardProfileResolver');
const { sendPasswordResetEmail } = require('../services/emailService');
const { getPublicAppBaseUrl } = require('../utils/publicAppUrl');

const router = express.Router();

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha obrigatórios' });
    }

    const result = await db.query(
      `SELECT u.*,
              d.name AS department_resolved_name,
              cr.dashboard_functional_hint AS company_role_dashboard_hint,
              cr.hierarchy_level AS company_role_hierarchy_level,
              cr.name AS company_role_name
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id AND d.company_id = u.company_id
       LEFT JOIN company_roles cr ON cr.id = u.company_role_id AND cr.company_id = u.company_id AND cr.active = true
       WHERE lower(trim(u.email)) = lower(trim($1)) AND u.active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({
        error:
          'Senha ainda não definida. Utilize o link de primeiro acesso enviado por e-mail ou peça uma nova redefinição de senha.'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Senha inválida' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name || null,
        role: user.role,
        company_id: user.company_id
      },
      JWT_SECRET,
      { expiresIn: '8h', algorithm: (JWT_ALGORITHMS && JWT_ALGORITHMS[0]) || 'HS256' }
    );

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8);
    // Enterprise Hardening Bloco 6 (A13):
    //   Não emitimos token se a sessão não persistir. Default: strict (true).
    //   IMPETUS_LOGIN_REQUIRE_SESSION_PERSISTENCE=false reativa o comportamento
    //   legado (warn-only) caso seja necessário rollback urgente.
    const requireSessionPersistence =
      String(process.env.IMPETUS_LOGIN_REQUIRE_SESSION_PERSISTENCE || 'true').toLowerCase() !== 'false';
    try {
      await db.query(
        'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expiresAt]
      );
    } catch (e) {
      console.error('[SESSION_INSERT_ERROR]', e.message);
      if (requireSessionPersistence) {
        return res.status(503).json({
          ok: false,
          error: 'SESSION_PERSIST_FAILED',
          code: 'SESSION_PERSIST_FAILED',
          message: 'Falha temporária ao registar sessão. Tente novamente.'
        });
      }
    }

    const needsVerification = roleVerification.needsVerification({
      ...user,
      role_verified: user.role_verified,
      role_verification_status: user.role_verification_status,
      is_company_root: user.is_company_root
    });

    let dashboardProfile = user.dashboard_profile || null;
    try {
      const { profile } = await dashboardProfileResolver.resolveAndPersistProfile(user);
      if (profile) dashboardProfile = profile;
    } catch (e) {
      console.warn('[LOGIN] resolveAndPersistProfile:', e.message);
    }

    const roleNormalized = (user.role || 'colaborador').toString().toLowerCase();
    const isFactoryTeam = user.is_factory_team_account === true;

    const canonicalLevel = resolveHierarchyLevel(
      {
        hierarchy_level: user.hierarchy_level,
        company_role_hierarchy_level: user.company_role_hierarchy_level,
        company_role_id: user.company_role_id,
        role: user.role
      },
      { silent: true }
    );

    const forCaps = contextualSystemAdmin.enrichUserWithContextualCapabilities({
      id: user.id,
      role: roleNormalized,
      company_role_name: user.company_role_name || null,
      company_role_id: user.company_role_id || null,
      hierarchy_level: canonicalLevel,
      company_role_hierarchy_level: user.company_role_hierarchy_level ?? null
    });

    let taFlags = {
      is_tenant_admin: false,
      tenant_admin_type: null,
      tenant_admin_can_manage: false
    };
    try {
      taFlags = await tenantAdminService.attachTenantAdminToUser({
        id: user.id,
        company_id: user.company_id,
        ...forCaps
      });
    } catch (e) {
      console.warn('[LOGIN][tenant_admin]', e.message);
    }

    return res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: roleNormalized,
        company_id: user.company_id,
        is_first_access: user.is_first_access,
        role_verified: user.role_verified === true,
        role_verification_status: user.role_verification_status || 'pending',
        is_company_root: user.is_company_root === true,
        needs_role_verification: needsVerification,
        functional_area: user.functional_area || null,
        dashboard_profile: dashboardProfile || null,
        job_title: user.job_title || null,
        department: user.department || null,
        area: user.area || null,
        hr_responsibilities: user.hr_responsibilities || null,
        hierarchy_level: canonicalLevel,
        is_factory_team_account: isFactoryTeam,
        operational_team_id: user.operational_team_id || null,
        needs_factory_member_selection: isFactoryTeam,
        department_resolved_name: user.department_resolved_name || null,
        company_role_dashboard_hint: user.company_role_dashboard_hint || null,
        company_role_name: user.company_role_name || null,
        company_role_id: user.company_role_id || null,
        contextual_capabilities: Array.isArray(forCaps.contextual_capabilities)
          ? forCaps.contextual_capabilities
          : [],
        is_tenant_admin: !!taFlags.is_tenant_admin,
        tenant_admin_type: taFlags.tenant_admin_type || null,
        tenant_admin_can_manage: !!taFlags.tenant_admin_can_manage
      }
    });
  } catch (err) {
    console.error('[LOGIN_ERROR]', err);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ ok: true });

  try {
    const normalized = email.toLowerCase().trim();
    const r = await db.query(
      'SELECT id, name, email FROM users WHERE lower(trim(email)) = $1 AND active = true',
      [normalized]
    );
    if (!r.rows.length) return res.json({ ok: true });

    const user = r.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expires]
    );

    const baseUrl = getPublicAppBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });

    res.json({ ok: true });
  } catch (err) {
    console.error('[FORGOT_PASSWORD]', err.message);
    res.json({ ok: true });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 6) {
    return res.status(400).json({ ok: false, error: 'Dados inválidos.' });
  }

  try {
    const r = await db.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW()',
      [token]
    );
    if (!r.rows.length) return res.status(400).json({ ok: false, error: 'Link inválido ou expirado.' });

    const resetToken = r.rows[0];
    const hash = await bcrypt.hash(password, 10);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, resetToken.user_id]);
    await db.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [resetToken.id]);

    res.json({ ok: true });
  } catch (err) {
    console.error('[RESET_PASSWORD]', err.message);
    res.status(500).json({ ok: false, error: 'Erro ao redefinir senha.' });
  }
});

// POST /api/auth/logout — remove sessão (incl. membro operacional ativo)
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, '')?.trim() || req.body?.token;
    if (token) await destroySession(token);
    res.json({ ok: true });
  } catch (err) {
    console.error('[LOGOUT]', err.message);
    res.json({ ok: true });
  }
});

// POST /api/auth/verify-password
router.post('/verify-password', async (req, res) => {
  const { password } = req.body;
  const authHeader = req.headers.authorization;
  if (!authHeader || !password) return res.status(400).json({ ok: false });

  try {
    const authToken = authHeader.split(' ')[1];
    const decoded = jwt.verify(authToken, JWT_SECRET);
    const uid = decoded.id || decoded.userId;
    const r = await db.query('SELECT password_hash FROM users WHERE id = $1 AND active = true', [uid]);
    if (!r.rows.length) return res.json({ ok: false });
    const valid = await bcrypt.compare(password, r.rows[0].password_hash);
    res.json({ ok: valid });
  } catch {
    res.json({ ok: false });
  }
});

module.exports = router;
