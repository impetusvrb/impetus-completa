'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const did = require('../services/didService');

const router = express.Router();

const buckets = new Map();
function rateLimit(userId, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(userId);
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + windowMs };
    buckets.set(userId, b);
  }
  b.count++;
  return b.count <= max;
}

function isHttpsUrl(s) {
  try {
    const u = new URL(String(s));
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * POST /api/did/talks
 * body: { source_url, text, provider? }
 * A imagem precisa estar em URL pública HTTPS (ex.: Firebase, S3, ou /uploads servido com HTTPS).
 */
router.post('/talks', requireAuth, async (req, res) => {
  if (!rateLimit(req.user.id, 8, 60 * 1000)) {
    return res.status(429).json({ ok: false, error: 'Limite de pedidos D-ID. Aguarde 1 minuto.' });
  }
  const sourceUrl = String(req.body?.source_url || '').trim();
  const text = req.body?.text;
  const provider = req.body?.provider;

  if (!sourceUrl || !isHttpsUrl(sourceUrl)) {
    return res.status(400).json({
      ok: false,
      error: 'source_url obrigatório e deve ser HTTPS (URL pública da imagem PNG/JPG).'
    });
  }

  try {
    const data = await did.createTalk({ sourceUrl, text, provider });
    return res.status(201).json({
      ok: true,
      id: data.id,
      status: data.status,
      created_at: data.created_at
    });
  } catch (e) {
    if (e.code === 'DID_NO_KEY') {
      return res.status(503).json({ ok: false, error: 'D-ID não configurado no servidor.' });
    }
    if (e.response?.data) {
      return res.status(e.response.status || 502).json({
        ok: false,
        error: e.response.data.description || e.response.data.message || 'Erro D-ID',
        details: e.response.data
      });
    }
    console.error('[did] createTalk', e.message);
    return res.status(502).json({ ok: false, error: e.message || 'Falha ao criar talk na D-ID' });
  }
});

/**
 * GET /api/did/talks/:id
 * Quando status === "done", a resposta da D-ID inclui result_url (vídeo MP4).
 */
router.get('/talks/:id', requireAuth, async (req, res) => {
  if (!rateLimit(req.user.id, 30, 60 * 1000)) {
    return res.status(429).json({ ok: false, error: 'Muitas consultas. Aguarde.' });
  }
  try {
    const data = await did.getTalk(req.params.id);
    if (data?.kind && data?.description && !data.id) {
      return res.status(404).json({ ok: false, error: data.description });
    }
    return res.json({
      ok: true,
      id: data.id,
      status: data.status,
      result_url: data.result_url || null,
      error: data.error || null,
      created_at: data.created_at
    });
  } catch (e) {
    if (e.code === 'DID_NO_KEY') {
      return res.status(503).json({ ok: false, error: 'D-ID não configurado no servidor.' });
    }
    if (e.response?.status === 404) {
      return res.status(404).json({ ok: false, error: 'Talk não encontrado' });
    }
    console.error('[did] getTalk', e.message);
    return res.status(502).json({ ok: false, error: e.message || 'Falha ao consultar D-ID' });
  }
});

module.exports = router;
