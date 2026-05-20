'use strict';

const express = require('express');
const router = express.Router();

const facade = require('../../chatAlignment/chatRuntimeAlignmentFacade');
const { measureOperationalGuidanceQuality } = require('../../chatAlignment/operationalGuidanceQualityEngine');
const { stabilizeChatSemanticReasoning } = require('../../chatAlignment/chatSemanticReasoningStabilizer');
const { detectChatLeakage } = require('../../chatAlignment/chatLeakageDetector');
const { analyzeChatAmbiguity } = require('../../chatAlignment/chatAmbiguityAnalyzer');
const { computeChatOperationalConfidence } = require('../../chatAlignment/chatOperationalConfidenceEngine');
const { validateChatNarrativeIntegrity } = require('../../chatAlignment/chatNarrativeIntegrityEngine');
const { getChatAlignmentTelemetry } = require('../../chatAlignment/chatAlignmentTelemetry');

function governanceRoleOk(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role)) return true;
  if (user.is_internal_admin) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('*') || perms.includes('GOVERNANCE_OVERSIGHT');
}

function samplePayload(req) {
  const reply = req.body?.reply || req.body?.message || req.query.reply || '';
  return { reply, message: reply, content: reply };
}

function sampleUser(req) {
  return { ...req.user, functional_axis: req.query.axis || req.body?.functional_axis || req.user?.functional_axis };
}

function sampleCtx(req) {
  return {
    functional_axis: req.query.axis || req.body?.functional_axis,
    user_message: req.body?.user_message || req.body?.message,
    summary_excerpt: req.body?.summary_excerpt,
    tenant_id: req.query.tenant_id
  };
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) {
    return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  }
  next();
});

router.get('/status', (req, res) => {
  res.json({ ok: true, ...facade.getChatAlignmentStatus({ tenant_id: req.query.tenant_id }) });
});

router.get('/guidance', (req, res) => {
  res.json({
    ok: true,
    ...measureOperationalGuidanceQuality(sampleUser(req), samplePayload(req), sampleCtx(req))
  });
});

router.get('/reasoning', (req, res) => {
  res.json({
    ok: true,
    ...stabilizeChatSemanticReasoning(sampleUser(req), samplePayload(req), sampleCtx(req))
  });
});

router.get('/leakage', (req, res) => {
  res.json({
    ok: true,
    ...detectChatLeakage(sampleUser(req), samplePayload(req), sampleCtx(req))
  });
});

router.get('/ambiguity', (req, res) => {
  res.json({
    ok: true,
    ...analyzeChatAmbiguity(sampleUser(req), samplePayload(req), sampleCtx(req))
  });
});

router.get('/confidence', (req, res) => {
  res.json({
    ok: true,
    ...computeChatOperationalConfidence(sampleUser(req), samplePayload(req), sampleCtx(req))
  });
});

router.get('/narrative', (req, res) => {
  res.json({
    ok: true,
    ...validateChatNarrativeIntegrity(sampleUser(req), samplePayload(req), sampleCtx(req))
  });
});

router.get('/report', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const user = sampleUser(req);
  const payload = samplePayload(req);
  res.json({
    ok: true,
    status: facade.getChatAlignmentStatus({ tenant_id: req.query.tenant_id }),
    telemetry: getChatAlignmentTelemetry(),
    alignment: facade.enrichChatRuntimeAlignment(user, payload, { ...sampleCtx(req), force: true })
  });
});

module.exports = router;
