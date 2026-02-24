/**
 * Resumo Inteligente Diário/Semanal
 * Exibido no primeiro login do dia
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { buildSmartSummary } = require('../services/smartSummary');

/**
 * GET /api/smart-summary
 * Retorna o resumo executivo (diário ou semanal se sexta)
 * Frontend verifica se deve exibir (primeiro acesso do dia)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const summary = await buildSmartSummary(
      user.id,
      user.name,
      user.company_id
    );
    res.json({
      ok: true,
      ...summary,
    });
  } catch (err) {
    console.error('[SMART_SUMMARY]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao gerar resumo',
      summary: 'Não foi possível gerar o resumo no momento. Tente novamente.',
    });
  }
});

module.exports = router;
