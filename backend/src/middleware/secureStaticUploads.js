/**
 * Serve /uploads apenas para utilizadores autenticados com direito ao ficheiro.
 */
const express = require('express');
const { requireAuth } = require('./auth');
const { requireCompanyActive } = require('./multiTenant');
const { resolveUploadFile } = require('../paths');
const { userCanReadUpload } = require('../services/uploadAccessService');

const router = express.Router();

router.use(requireAuth);
router.use(requireCompanyActive);

router.get('*', async (req, res, next) => {
  try {
    const rel = (req.path || '').replace(/^\/+/, '');
    if (!rel || rel.includes('..')) {
      return res.status(400).json({ ok: false, error: 'Caminho inválido' });
    }
    const abs = resolveUploadFile(rel);
    if (!abs) {
      return res.status(404).json({ ok: false, error: 'Não encontrado' });
    }
    const ok = await userCanReadUpload(req.user, rel);
    if (!ok) {
      return res.status(403).json({ ok: false, error: 'Acesso negado' });
    }
    return res.sendFile(abs, (err) => {
      if (err && !res.headersSent) next(err);
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
