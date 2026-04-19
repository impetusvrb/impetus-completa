const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const {
  MANUAL_VERSION,
  modules,
  fields,
  searchManual
} = require('../../data/adminManualKnowledge');

function canAccessManual(req, res, next) {
  const user = req.user || {};
  const role = String(user.role || '').toLowerCase();
  const hierarchy = Number.isFinite(Number(user.hierarchy_level))
    ? Number(user.hierarchy_level)
    : 99;

  if (role === 'admin' || hierarchy <= 1) {
    return next();
  }

  return res.status(403).json({
    ok: false,
    error: 'Acesso negado ao manual administrativo',
    code: 'AUTH_HELP_MANUAL_DENIED'
  });
}

router.get('/', requireAuth, canAccessManual, async (_req, res) => {
  res.json({
    ok: true,
    version: MANUAL_VERSION,
    modules,
    fieldsCount: fields.length,
    fields
  });
});

router.get('/search', requireAuth, canAccessManual, async (req, res) => {
  const q = String(req.query.q || '');
  const limitRaw = Number.parseInt(String(req.query.limit || '20'), 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;
  const results = searchManual(q, limit);
  res.json({
    ok: true,
    query: q,
    count: results.length,
    results
  });
});

module.exports = router;
