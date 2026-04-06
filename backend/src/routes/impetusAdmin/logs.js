'use strict';

const express = require('express');
const db = require('../../db');
const { requireAdminAuth } = require('../../middleware/adminPortalAuth');

const router = express.Router();

router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const acao = (req.query.acao || '').trim();
    const filterParams = [];
    let where = '1=1';
    let i = 1;
    if (acao) {
      where += ` AND l.acao ILIKE $${i}`;
      filterParams.push(`%${acao}%`);
      i += 1;
    }
    const countR = await db.query(
      `SELECT count(*)::int AS n FROM admin_logs l WHERE ${where}`,
      filterParams
    );
    const total = countR.rows[0].n;
    const listParams = [...filterParams, limit, offset];
    const r = await db.query(
      `SELECT l.*, u.nome AS admin_nome, u.email AS admin_email
       FROM admin_logs l
       LEFT JOIN admin_users u ON u.id = l.admin_user_id
       WHERE ${where}
       ORDER BY l.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      listParams
    );
    res.json({
      ok: true,
      data: r.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
    });
  } catch (e) {
    console.error('[impetusAdmin/logs]', e);
    res.status(500).json({ ok: false, error: 'Erro ao listar logs' });
  }
});

module.exports = router;
