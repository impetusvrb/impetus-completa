const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha obrigatórios' });
    }

    const result = await db.query(
      'SELECT * FROM users WHERE email = $1 AND active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];

    // 🔥 IMPORTANTE: usar password_hash
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Senha não cadastrada para este usuário' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Senha inválida' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        company_id: user.company_id
      },
      process.env.JWT_SECRET || 'impetus_super_secret_key',
      { expiresIn: '8h' }
    );

    return res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('[LOGIN_ERROR]', err);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

module.exports = router;