'use strict';

/**
 * Cognitive Safety Runtime — airbag operacional (observa sinais; não altera prompts nem council interno).
 */

function isCognitiveSafetyEnabled() {
  return String(process.env.IMPETUS_COGNITIVE_SAFETY_ENABLED ?? '').trim().toLowerCase() === 'true';
}

function evaluateCognitiveRisk({ csi, consensusScore, driftDetected, overconfidence }) {
  let score = 0;
  const csiN = Number(csi);
  const csN = Number(consensusScore);

  if (Number.isFinite(csiN) && csiN < 65) score += 35;

  if (Number.isFinite(csN) && csN < 50) score += 30;

  if (driftDetected === true) score += 20;

  if (overconfidence === true) score += 25;

  const risk_score = Math.min(score, 100);
  const risk_level =
    risk_score >= 70 ? 'critical' : risk_score >= 40 ? 'warning' : 'safe';

  return {
    risk_score,
    risk_level
  };
}

function applySafetyNarrative({ text, riskLevel }) {
  const t = text != null ? String(text) : '';
  if (riskLevel !== 'warning') {
    return t;
  }

  return `${t}\n\nObservação: esta análise possui limitações cognitivas temporárias e deve ser validada operacionalmente.`;
}

function requiresHumanValidation({ riskLevel }) {
  return riskLevel === 'critical';
}

/**
 * Carrega sinais agregados (tenant). Falhas → valores conservadores (sem penalizar por indisponibilidade de CSI).
 * @param {string|null|undefined} companyId
 */
async function loadSafetySignals(companyId) {
  const cid = companyId != null && String(companyId).trim() !== '' ? String(companyId).trim() : null;

  /** Só para testes automatizados: JSON { csi, consensusScore, driftDetected, overconfidence } */
  if (process.env.IMPETUS_COGNITIVE_SAFETY_TEST_SIGNALS) {
    try {
      const o = JSON.parse(String(process.env.IMPETUS_COGNITIVE_SAFETY_TEST_SIGNALS));
      return {
        csi: Number(o.csi ?? 100),
        consensusScore: Number(o.consensusScore ?? 70),
        driftDetected: o.driftDetected === true,
        overconfidence: o.overconfidence === true
      };
    } catch (e) {
      try {
        console.warn('[COGNITIVE_SAFETY_ERROR]', {
          op: 'loadSafetySignals_test_signals',
          message: e?.message || e
        });
      } catch (_e) {}
    }
  }

  let csi = 100;
  let consensusScore = 70;
  let driftDetected = false;
  let overconfidence = false;

  try {
    const aiAnalyticsService = require('./aiAnalyticsService');
    if (cid) {
      const snap = await aiAnalyticsService.getCognitiveStabilitySnapshot(cid);
      if (snap && snap.engine_enabled === true && snap.unavailable !== true && snap.csi != null) {
        const n = Number(snap.csi);
        if (Number.isFinite(n)) csi = n;
      }
    }
  } catch (e) {
    try {
      console.warn('[COGNITIVE_SAFETY_ERROR]', { op: 'loadSignals_csi', message: e?.message || e });
    } catch (_e) {}
  }

  try {
    const cognitiveDbPersistence = require('./cognitiveDbPersistenceService');
    const cognitiveConsensusService = require('./cognitiveConsensusService');
    const confidenceCalibrationService = require('./confidenceCalibrationService');

    if (cid && cognitiveDbPersistence.isCognitiveDbEnabled()) {
      const hub = await cognitiveDbPersistence.getTenantGovernanceHub(cid);
      if (hub && Number(hub.drift_recent_30d) > 0) driftDetected = true;

      if (cognitiveConsensusService.isConsensusEngineEnabled()) {
        const cm = await cognitiveDbPersistence.getConsensusDashboardMetrics(cid);
        if (cm && cm.consensus_score != null) {
          const n = Number(cm.consensus_score);
          if (Number.isFinite(n)) consensusScore = n;
        }
      } else if (hub && hub.avg_confidence_pct != null) {
        const n = Number(hub.avg_confidence_pct);
        if (Number.isFinite(n)) consensusScore = n;
      }

      if (confidenceCalibrationService.isConfidenceCalibrationEnabled()) {
        const cal = await cognitiveDbPersistence.getCalibrationDashboardMetrics(cid);
        if (cal && Number(cal.overconfidence_events) > 0) overconfidence = true;
      }
    }
  } catch (e) {
    try {
      console.warn('[COGNITIVE_SAFETY_ERROR]', { op: 'loadSignals_db', message: e?.message || e });
    } catch (_e) {}
  }

  return { csi, consensusScore, driftDetected, overconfidence };
}

function buildBlockedChatPayload() {
  return {
    safety_blocked: true,
    reason: 'cognitive_instability_detected'
  };
}

/**
 * @param {object} payload — resultado tipo facade (success, reasoning, pipeline_reply, …)
 * @param {{ user?: object, context?: object }} meta
 */
async function applySafetyToFacadePayload(payload, meta = {}) {
  if (!isCognitiveSafetyEnabled() || !payload || typeof payload !== 'object') {
    return payload;
  }

  const user = meta.user;
  const companyId = user?.company_id != null ? String(user.company_id) : null;

  try {
    const signals = await loadSafetySignals(companyId);
    const evaluation = evaluateCognitiveRisk({
      csi: signals.csi,
      consensusScore: signals.consensusScore,
      driftDetected: signals.driftDetected,
      overconfidence: signals.overconfidence
    });

    try {
      console.info('[COGNITIVE_SAFETY]', {
        risk_level: evaluation.risk_level,
        risk_score: evaluation.risk_score,
        company_id: companyId,
        module: 'decision_facade'
      });
    } catch (_e) {}

    const cognitiveDbPersistence = require('./cognitiveDbPersistenceService');
    const persistPayload = {
      signals,
      evaluation,
      source: 'decision_facade'
    };
    cognitiveDbPersistence.schedulePersistSafetyEventToDb({
      companyId,
      risk_level: evaluation.risk_level,
      risk_score: evaluation.risk_score,
      payload: persistPayload
    });

    if (evaluation.risk_level === 'critical') {
      try {
        console.warn('[COGNITIVE_SAFETY_BLOCK]', {
          risk_score: evaluation.risk_score,
          company_id: companyId,
          module: 'decision_facade'
        });
      } catch (_e) {}
      return {
        ...payload,
        success: false,
        safety_blocked: true,
        reason: 'cognitive_instability_detected',
        reasoning:
          'Resposta retida: instabilidade cognitiva detectada. Validação humana (HITL) necessária antes de uso operacional.',
        pipeline_reply: null,
        metadata: {
          ...(payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}),
          cognitive_safety: {
            risk_level: evaluation.risk_level,
            risk_score: evaluation.risk_score,
            requires_human_validation: true
          }
        },
        signals: {
          ...(payload.signals && typeof payload.signals === 'object' ? payload.signals : {}),
          requires_attention: true
        }
      };
    }

    if (evaluation.risk_level === 'warning') {
      try {
        console.warn('[COGNITIVE_SAFETY_WARNING]', {
          risk_score: evaluation.risk_score,
          company_id: companyId
        });
      } catch (_e) {}
      const reasoning = applySafetyNarrative({
        text: payload.reasoning,
        riskLevel: 'warning'
      });
      const pipelineReply =
        payload.pipeline_reply != null
          ? applySafetyNarrative({ text: payload.pipeline_reply, riskLevel: 'warning' })
          : payload.pipeline_reply;
      return {
        ...payload,
        reasoning,
        pipeline_reply: pipelineReply,
        metadata: {
          ...(payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}),
          cognitive_safety: {
            risk_level: evaluation.risk_level,
            risk_score: evaluation.risk_score,
            narrative_softened: true
          }
        }
      };
    }

    return {
      ...payload,
      metadata: {
        ...(payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}),
        cognitive_safety: {
          risk_level: evaluation.risk_level,
          risk_score: evaluation.risk_score
        }
      }
    };
  } catch (e) {
    try {
      console.warn('[COGNITIVE_SAFETY_ERROR]', { op: 'applySafetyToFacadePayload', message: e?.message || e });
    } catch (_e2) {}
    return payload;
  }
}

/**
 * Aplica safety ao texto de chat (dashboard / conselho HTTP).
 * @returns {Promise<{ text: string, safety_blocked: boolean, reason?: string, risk?: object, requires_hitl?: boolean }>}
 */
async function applySafetyToChatText(text, user) {
  const out = {
    text: text != null ? String(text) : '',
    safety_blocked: false,
    requires_hitl: false
  };

  if (!isCognitiveSafetyEnabled()) {
    return out;
  }

  const companyId = user?.company_id != null ? String(user.company_id) : null;

  try {
    const signals = await loadSafetySignals(companyId);
    const evaluation = evaluateCognitiveRisk({
      csi: signals.csi,
      consensusScore: signals.consensusScore,
      driftDetected: signals.driftDetected,
      overconfidence: signals.overconfidence
    });

    try {
      console.info('[COGNITIVE_SAFETY]', {
        risk_level: evaluation.risk_level,
        risk_score: evaluation.risk_score,
        company_id: companyId,
        module: 'chat'
      });
    } catch (_e) {}

    const cognitiveDbPersistence = require('./cognitiveDbPersistenceService');
    cognitiveDbPersistence.schedulePersistSafetyEventToDb({
      companyId,
      risk_level: evaluation.risk_level,
      risk_score: evaluation.risk_score,
      payload: { signals, evaluation, source: 'dashboard_chat' }
    });

    out.risk = evaluation;

    if (evaluation.risk_level === 'critical') {
      try {
        console.warn('[COGNITIVE_SAFETY_BLOCK]', {
          risk_score: evaluation.risk_score,
          company_id: companyId,
          module: 'chat'
        });
      } catch (_e) {}
      out.safety_blocked = true;
      out.reason = 'cognitive_instability_detected';
      out.requires_hitl = true;
      out.text =
        'A resposta automática foi retida por instabilidade cognitiva detectada. Solicite validação humana (HITL) antes de decisões operacionais.';
      return out;
    }

    if (evaluation.risk_level === 'warning') {
      try {
        console.warn('[COGNITIVE_SAFETY_WARNING]', {
          risk_score: evaluation.risk_score,
          company_id: companyId,
          module: 'chat'
        });
      } catch (_e) {}
      out.text = applySafetyNarrative({ text: out.text, riskLevel: 'warning' });
    }

    return out;
  } catch (e) {
    try {
      console.warn('[COGNITIVE_SAFETY_ERROR]', { op: 'applySafetyToChatText', message: e?.message || e });
    } catch (_e2) {}
    return out;
  }
}

module.exports = {
  isCognitiveSafetyEnabled,
  evaluateCognitiveRisk,
  applySafetyNarrative,
  requiresHumanValidation,
  loadSafetySignals,
  buildBlockedChatPayload,
  applySafetyToFacadePayload,
  applySafetyToChatText
};
