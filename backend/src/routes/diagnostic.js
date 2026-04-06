const express = require('express');
const router = express.Router();
const diag = require('../services/diagnostic');
const { requireAuth, requireCompanyId } = require('../middleware/auth');

router.post('/', requireAuth, requireCompanyId, async (req, res) => {
  try {
    const payload = { ...req.body, company_id: req.user.company_id };
    const result = await diag.runDiagnostic(payload);
    res.json({ ok: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/validate', requireAuth, async (req, res) => {
  try {
    const c = await diag.ensureSufficientDetail(req.body.text);
    const payload = { ok: true, sufficient: c.ok, reason: c.reason || null };
    if (!c.ok && c.questions) payload.questions = c.questions;
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
