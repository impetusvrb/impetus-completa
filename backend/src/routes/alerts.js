const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireCompanyId } = require('../middleware/auth');

router.get('/', requireAuth, requireCompanyId, async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM alerts
       WHERE company_id = $1
       ORDER BY created_at DESC NULLS LAST
       LIMIT 200`,
      [req.user.company_id]
    );
    res.json({ ok: true, alerts: r.rows });
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('column "company_id" does not exist')) {
      return res.status(503).json({
        ok: false,
        error:
          'Coluna company_id em alerts inexistente. Execute backend/src/models/alerts_security_migration.sql',
        code: 'ALERTS_MIGRATION_REQUIRED'
      });
    }
    if (msg.includes('relation "alerts" does not exist')) {
      return res.status(503).json({
        ok: false,
        error: 'Tabela alerts inexistente nesta base de dados.',
        code: 'ALERTS_TABLE_MISSING'
      });
    }
    console.error('[ALERTS_LIST]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
