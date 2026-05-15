'use strict';

/**
 * POST /api/internal/test-environmental-cognitive
 * Shadow: exercita handleCognitiveRequest com structured_input ambiental + mock.
 * Requer IMPETUS_ENVIRONMENTAL_COGNITIVE_SHADOW=true e utilizador autenticado com acesso interno.
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireHealthAccess } = require('../../middleware/requireHealthAccess');
const { handleCognitiveRequest } = require('../../services/cognitiveControllerService');
const { getMockEnvironmentalSnapshot } = require('../../services/environmentalMockService');

router.use(requireAuth, requireHealthAccess);

/** POST / — montado em /api/internal/test-environmental-cognitive */
router.post('/', async (req, res) => {
  try {
    if (String(process.env.IMPETUS_ENVIRONMENTAL_COGNITIVE_SHADOW ?? '').trim() !== 'true') {
      return res.status(403).json({
        ok: false,
        code: 'ENVIRONMENTAL_SHADOW_DISABLED',
        error: 'Defina IMPETUS_ENVIRONMENTAL_COGNITIVE_SHADOW=true para activar (shadow).'
      });
    }

    const user = req.user;
    if (!user?.id || !user?.company_id) {
      return res.status(401).json({ ok: false, error: 'Utilizador inválido' });
    }

    const snapshot = getMockEnvironmentalSnapshot();
    const response = await handleCognitiveRequest({
      user: { id: String(user.id), company_id: String(user.company_id) },
      message: null,
      structured_input: {
        type: 'environmental',
        payload: snapshot
      },
      options: {
        traceId: req.headers['x-trace-id'] || undefined
      }
    });

    return res.status(200).json({
      ok: response.ok === true,
      shadow: true,
      trace_id: response.trace_id ?? null,
      cognitive_ok: response.ok === true,
      error: response.error ?? null,
      meta: {
        module: 'environmental',
        note: 'Resposta cognitiva não exposta aqui; usar trace_id para auditoria.'
      }
    });
  } catch (e) {
    try {
      console.warn(
        JSON.stringify({
          event: 'ENVIRONMENTAL_COGNITIVE_ERROR',
          trace_id: null,
          company_id: req.user?.company_id,
          module: 'environmental',
          route: 'internal/test-environmental-cognitive',
          message: e?.message || String(e)
        })
      );
    } catch (_log) {}
    return res.status(500).json({ ok: false, error: 'environmental_cognitive_test_failed' });
  }
});

module.exports = router;
