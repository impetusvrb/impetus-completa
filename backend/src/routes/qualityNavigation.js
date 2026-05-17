'use strict';

/**
 * QUALITY — Navigation / publication context (tenant-auth).
 */

const express = require('express');
const router = express.Router();

const { buildPublicationContext } = require('../domains/quality/navigation/qualityNavigationPublicationService');

router.get('/health', (req, res) => {
  res.json({ ok: true, assistive_only: true, no_authority: true });
});

router.get('/context', (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    const ctx = buildPublicationContext(user, { companyId: user.company_id });
    return res.json(ctx);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

module.exports = router;
