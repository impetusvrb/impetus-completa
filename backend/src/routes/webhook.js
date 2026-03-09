const express = require('express');
const router = express.Router();
const ai = require('../services/ai');
const db = require('../db');

router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    const msg = {
      source: payload.source || 'whatsapp',
      sender: payload.from || payload.From || payload.sender || payload.phone,
      text: payload.body || payload.message || payload.text || payload.message?.body || '',
      metadata: payload
    };
    await db.query('INSERT INTO messages(source, sender, text, metadata) VALUES($1,$2,$3,$4)', [msg.source, msg.sender, msg.text, JSON.stringify(msg.metadata || {})]);
    const result = await ai.processIncomingMessage(msg, { companyId: payload.company_id || null });
    res.json({ ok: true, result });
  } catch (err) {
    console.error('[WEBHOOK_ERROR]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
