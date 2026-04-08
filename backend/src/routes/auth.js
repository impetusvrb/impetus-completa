const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');
const roleVerification = require('../services/roleVerificationService');
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
      'SELECT * FROM users WHERE lower(trim(email)) = lower(trim($1)) AND active = true',
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
      { expiresIn: '8h' }
    );

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8);
    try {
      await db.query(
        'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expiresAt]
      );
    } catch (e) {
      console.error('[SESSION_INSERT_ERROR]', e.message);
    }

    const needsVerification = roleVerification.needsVerification({
      ...user,
      role_verified: user.role_verified,
      role_verification_status: user.role_verification_status,
      is_company_root: user.is_company_root
    });

    const roleNormalized = (user.role || 'colaborador').toString().toLowerCase();
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
        dashboard_profile: user.dashboard_profile || null
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
