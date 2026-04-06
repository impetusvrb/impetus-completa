'use strict';

const express = require('express');
const db = require('../../db');
const { requireAdminAuth } = require('../../middleware/adminPortalAuth');

const router = express.Router();

router.get('/stats', requireAdminAuth, async (_req, res) => {
  try {
    const [
      total,
      byStatus,
      adminCount,
      recent,
      expiring
    ] = await Promise.all([
      db.query(`SELECT count(*)::int AS n FROM companies`),
      db.query(`
        SELECT COALESCE(tenant_status, CASE WHEN active THEN 'ativo' ELSE 'suspenso' END) AS st, count(*)::int AS n
        FROM companies GROUP BY 1
      `),
      db.query(`SELECT count(*)::int AS n FROM admin_users WHERE ativo = true`),
      db.query(
        `SELECT id, name, razao_social, nome_fantasia, tenant_status, active, created_at
         FROM companies ORDER BY created_at DESC NULLS LAST LIMIT 8`
      ),
      db.query(
        `SELECT id, name, razao_social, contract_end_date
         FROM companies
         WHERE contract_end_date IS NOT NULL
           AND contract_end_date::date <= (current_date + interval '30 days')
           AND COALESCE(tenant_status, 'ativo') IN ('teste', 'ativo')
         ORDER BY contract_end_date ASC
         LIMIT 10`
      )
    ]);

    const statusMap = { teste: 0, ativo: 0, suspenso: 0, cancelado: 0 };
    for (const row of byStatus.rows) {
      const k = row.st;
      if (k && statusMap[k] !== undefined) statusMap[k] = row.n;
    }

    const logsR = await db.query(
      `SELECT l.id, l.acao, l.entidade, l.entidade_id, l.created_at, u.nome AS admin_nome
       FROM admin_logs l
       LEFT JOIN admin_users u ON u.id = l.admin_user_id
       ORDER BY l.created_at DESC
       LIMIT 15`
    );

    res.json({
      ok: true,
      stats: {
        total_companies: total.rows[0].n,
        tenant_status: statusMap,
        active_internal_users: adminCount.rows[0].n
      },
      recent_companies: recent.rows,
      contracts_expiring_soon: expiring.rows,
      recent_logs: logsR.rows
    });
  } catch (e) {
    console.error('[impetusAdmin/dashboard]', e);
    res.status(500).json({ ok: false, error: 'Erro ao carregar dashboard' });
  }
});

module.exports = router;
