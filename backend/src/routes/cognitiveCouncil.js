'use strict';

/**
 * API REST — Conselho Cognitivo IMPETUS
 * Montado em /api/cognitive-council com requireAuth no server.js
 */

const express = require('express');
const router = express.Router();

const {
  runCognitiveCouncil,
  exampleMaintenancePayload
} = require('../ai/cognitiveOrchestrator');
const cognitiveAudit = require('../ai/cognitiveAudit');
const { analyzePrompt } = require('../middleware/promptFirewall');

router.post('/execute', async (req, res) => {
  try {
    const user = req.user;
    if (!user?.company_id) {
      return res.status(403).json({ ok: false, error: 'Empresa não identificada para o conselho cognitivo.' });
    }

    const requestText = req.body?.requestText ?? req.body?.request ?? req.body?.message;
    if (!requestText || typeof requestText !== 'string') {
      return res.status(400).json({ ok: false, error: 'Campo requestText (string) é obrigatório.' });
    }

    const pf = await analyzePrompt(requestText, user);
    if (!pf.allowed) {
      return res.status(403).json({
        ok: false,
        error: pf.reason || 'Conteúdo não permitido pela política IMPETUS (prompt firewall).'
      });
    }

    const data = req.body?.data && typeof req.body.data === 'object' ? req.body.data : {};
    const moduleName = req.body?.module || 'cognitive_council';
    const options = req.body?.options && typeof req.body.options === 'object' ? req.body.options : {};

    const result = await runCognitiveCouncil({
      user,
      requestText,
      data,
      module: String(moduleName).slice(0, 96),
      options
    });

    res.json(result);
  } catch (err) {
    if (err.code === 'FORBIDDEN_SCOPE') {
      return res.status(403).json({ ok: false, error: 'Escopo inválido.' });
    }
    console.error('[COGNITIVE_EXECUTE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro no conselho cognitivo.' });
  }
});

router.post('/hitl', async (req, res) => {
  try {
    const user = req.user;
    if (!user?.company_id) {
      return res.status(403).json({ ok: false, error: 'Empresa não identificada.' });
    }

    const traceId = req.body?.trace_id || req.body?.traceId;
    const action = (req.body?.action || '').toLowerCase();
    const allowed = ['accept', 'reject', 'adjust'];
    if (!traceId || !allowed.includes(action)) {
      return res.status(400).json({ ok: false, error: 'Informe trace_id e action (accept|reject|adjust).' });
    }

    const existing = await cognitiveAudit.getTraceForCompany(traceId, user.company_id);
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Trace não encontrado para esta empresa.' });
    }

    const id = await cognitiveAudit.insertHitlFeedback({
      trace_id: traceId,
      user_id: user.id,
      action,
      comment: req.body?.comment || null,
      adjusted_answer: action === 'adjust' ? req.body?.adjusted_answer || null : null,
      metadata: {
        role: user.role,
        client_hint: req.body?.client_ref || null
      }
    });

    res.json({ ok: true, feedback_id: id, trace_id: traceId });
  } catch (err) {
    console.error('[COGNITIVE_HITL]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao registrar HITL.' });
  }
});

router.get('/trace/:traceId', async (req, res) => {
  try {
    const user = req.user;
    if (!user?.company_id) {
      return res.status(403).json({ ok: false, error: 'Empresa não identificada.' });
    }
    const row = await cognitiveAudit.getTraceForCompany(req.params.traceId, user.company_id);
    if (!row) return res.status(404).json({ ok: false, error: 'Não encontrado.' });
    res.json({ ok: true, trace: row });
  } catch (err) {
    console.error('[COGNITIVE_TRACE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/example-payload', (req, res) => {
  res.json({
    ok: true,
    description: 'Exemplo de JSON para POST /api/cognitive-council/execute (copiar como body)',
    ...exampleMaintenancePayload()
  });
});

module.exports = router;
