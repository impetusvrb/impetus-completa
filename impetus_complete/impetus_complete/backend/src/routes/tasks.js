const express = require('express');
const router = express.Router();
const db = require('../db');
const { safeInteger } = require('../utils/security');

router.get('/', async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    const limit = safeInteger(req.query.limit, 200, 1, 500);
    if (!companyId) return res.json({ ok: true, tasks: [] });
    const r = await db.query(
      'SELECT * FROM tasks WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2',
      [companyId, limit]
    );
    res.json({ ok: true, tasks: r.rows || [] });
  } catch (err) {
    console.error('[TASKS_LIST_ERROR]', err);
    if (err.message?.includes('column "company_id" does not exist')) {
      console.warn('[TASKS] Execute migrations: tasks_company_migration.sql');
      return res.json({ ok: true, tasks: [] });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
