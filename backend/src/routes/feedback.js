'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

const jsonBody = express.json({ limit: '128kb' });

/** POST /api/feedback/ — registo opcional de feedback humano (sem persistência em BD nesta fase). */
router.post('/', requireAuth, jsonBody, (req, res) => {
  const { interactionId, rating, comment } = req.body || {};

  console.log('[USER_FEEDBACK]', {
    user_id: req.user?.id ?? null,
    company_id: req.user?.company_id ?? null,
    interactionId: interactionId != null ? String(interactionId).slice(0, 64) : null,
    rating: rating != null ? Number(rating) : null,
    comment:
      comment != null
        ? String(comment).slice(0, 4000)
        : null
  });

  return res.json({ ok: true });
});

module.exports = router;
