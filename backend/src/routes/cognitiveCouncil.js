'use strict';

/**
 * API REST — Conselho Cognitivo IMPETUS
 * Montado em /api/cognitive-council com requireAuth no server.js
 *
 * Contrato novo (preferido): { input: { text }, context?: {...}, module?, options? }
 * Legado: { requestText | request | message, data?, module?, options? }
 * O utilizador autenticado é sempre req.user (nunca confiar em body.user).
 */

const express = require('express');
const router = express.Router();

const {
  runCognitiveCouncil,
  exampleMaintenancePayload
} = require('../ai/cognitiveOrchestrator');
const cognitiveAudit = require('../ai/cognitiveAudit');
const { analyzePrompt } = require('../middleware/promptFirewall');

function resolveRequestText(body) {
  if (!body || typeof body !== 'object') return '';
  const fromInput =
    body.input && typeof body.input === 'object' && body.input.text != null
      ? String(body.input.text).trim()
      : '';
  const legacy =
    body.requestText != null
      ? String(body.requestText).trim()
      : body.request != null
        ? String(body.request).trim()
        : body.message != null
          ? String(body.message).trim()
          : '';
  return fromInput || legacy;
}

router.post('/execute', async (req, res) => {
  try {
    const user = req.user;
    if (!user?.company_id) {
      return res.status(403).json({
        ok: false,
        error: 'Empresa não identificada para o conselho cognitivo.'
      });
    }

    const requestText = resolveRequestText(req.body);
    if (!requestText) {
      return res.status(400).json({
        ok: false,
        error:
          'Informe o pedido em input.text ou requestText (string). Ex.: { "input": { "text": "..." } }'
      });
    }

    const pf = await analyzePrompt(requestText, user);
    if (!pf.allowed) {
      return res.status(403).json({
        ok: false,
        error:
          pf.message ||
          pf.reason ||
          'Conteúdo não permitido pela política IMPETUS (prompt firewall).',
        code: pf.reason
      });
    }

    let lastAiTrace =
      req.body?.last_ai_trace_id != null ? String(req.body.last_ai_trace_id).trim() : null;
    if (lastAiTrace === '') lastAiTrace = null;
    const { respondIfQualityComplaint } = require('../services/aiComplaintChatBridge');
    if (
      await respondIfQualityComplaint({
        user,
        message: requestText,
        lastAiTraceId: lastAiTrace,
        res,
        format: 'cognitive'
      })
    ) {
      return;
    }

    const data =
      req.body?.data && typeof req.body.data === 'object' ? req.body.data : {};
    const context =
      req.body?.context && typeof req.body.context === 'object'
        ? req.body.context
        : {};
    const input =
      req.body?.input && typeof req.body.input === 'object' ? req.body.input : {};
    const moduleName = req.body?.module || 'cognitive_council';
    const options =
      req.body?.options && typeof req.body.options === 'object' ? { ...req.body.options } : {};
    if (req.body?.related_operational_insight_id != null) {
      options.related_operational_insight_id = req.body.related_operational_insight_id;
    }

    const result = await runCognitiveCouncil({
      user,
      requestText,
      input,
      data,
      context,
      module: String(moduleName).slice(0, 96),
      options
    });

    const tid = result.trace_id || result.traceId;
    if (tid) res.setHeader('X-AI-Trace-ID', String(tid));
    res.setHeader('X-AI-HITL-Pending', '1');
    res.json(result);
  } catch (err) {
    if (err.code === 'PROMPT_SECURITY_INGRESS') {
      return res.status(403).json({
        ok: false,
        error: 'Pedido bloqueado pela política de segurança IMPETUS.',
        code: 'PROMPT_SECURITY'
      });
    }
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
      return res
        .status(400)
        .json({ ok: false, error: 'Informe trace_id e action (accept|reject|adjust).' });
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
    const stages =
      row.stages_detail &&
      typeof row.stages_detail === 'object' &&
      Array.isArray(row.stages_detail.logs)
        ? row.stages_detail.logs.map((l) => ({
            name: l.stage,
            provider: l.provider,
            summary: l.summary,
            at: l.ts
          }))
        : [];
    res.json({
      ok: true,
      traceId: row.trace_id,
      trace: row,
      stages,
      result: row.final_output || null,
      explanation_layer: row.explanation_layer || row.final_output?.explanation_layer || null,
      created_at: row.created_at
    });
  } catch (err) {
    console.error('[COGNITIVE_TRACE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/example-payload', (req, res) => {
  res.json({
    ok: true,
    description:
      'Exemplo para POST /api/cognitive-council/execute — use input.text + context ou requestText + data',
    ...exampleMaintenancePayload()
  });
});

module.exports = router;
