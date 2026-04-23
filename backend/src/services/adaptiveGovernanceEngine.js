'use strict';

/**
 * Motor de governança adaptativa — decisão de política antes/durante resposta IA.
 * Integra Risk Intelligence sem expor métricas ao cliente HTTP.
 */

const riskIntel = require('./riskIntelligenceService');

const ADAPTIVE_ENABLED = process.env.ADAPTIVE_GOVERNANCE_ENABLED !== 'false';

function riskRank(level) {
  const o = { low: 1, medium: 2, high: 3, critical: 4 };
  return o[String(level || 'low').toLowerCase()] || 1;
}

function maxRiskLevel(a, b) {
  return riskRank(a) >= riskRank(b) ? String(a || 'low').toLowerCase() : String(b || 'low').toLowerCase();
}

function combinedScore(userScore, companyScore) {
  return Math.min(
    100,
    Math.round((0.42 * userScore + 0.58 * companyScore) * 10) / 10
  );
}

/**
 * @param {object} params
 * @param {object} params.user - req.user
 * @param {string} params.companyId
 * @param {string} [params.module]
 * @param {string} [params.heuristicRiskLevel] - low|medium|high|critical
 * @returns {Promise<object>}
 */
async function evaluateRiskContext(params) {
  const defaults = {
    risk_level: 'LOW',
    allow_response: true,
    response_mode: 'full',
    require_validation: false,
    block_reason_pt: null,
    _internal: {
      user_risk_score: 0,
      company_risk_score: 0,
      combined_score: 0,
      user_reputation: null,
      company_reputation: null
    }
  };

  if (!ADAPTIVE_ENABLED || !params?.user?.id || !params?.companyId) {
    return defaults;
  }

  const [uB, cB] = await Promise.all([
    riskIntel.getUserRiskBundle(params.companyId, params.user.id),
    riskIntel.getCompanyRiskBundle(params.companyId)
  ]);

  const userScore = uB.user_risk_score || 0;
  const companyScore = cB.company_risk_score || 0;
  const comb = combinedScore(userScore, companyScore);
  const band = riskIntel.riskBandFromScore(comb);

  const trustBlocked =
    uB.user_reputation?.trust_level === 'blocked' ||
    cB.company_reputation?.trust_level === 'blocked';

  let risk_level = band;
  const heuristic = params.heuristicRiskLevel;
  if (heuristic && riskRank(heuristic) > riskRank(String(risk_level).toLowerCase())) {
    risk_level = String(heuristic).toUpperCase();
  }

  let allow_response = true;
  let response_mode = 'full';
  let require_validation = false;
  let block_reason_pt = null;

  if (trustBlocked || risk_level === 'CRITICAL') {
    allow_response = false;
    require_validation = true;
    block_reason_pt =
      'Política IMPETUS: o contexto de risco (utilizador ou organização) exige bloqueio da resposta assistida. Contacte o supervisor técnico ou o apoio IMPETUS.';
  } else if (risk_level === 'HIGH') {
    allow_response = true;
    response_mode = comb >= 72 ? 'restricted' : 'limited';
    require_validation = true;
  } else if (risk_level === 'MEDIUM') {
    allow_response = true;
    if (comb >= 48 || uB.user_reputation?.trust_level === 'risky') {
      response_mode = 'limited';
      require_validation = comb >= 52;
    } else {
      response_mode = 'full';
    }
  } else {
    response_mode = 'full';
  }

  if (params.heuristicRiskLevel === 'critical' || params.heuristicRiskLevel === 'high') {
    require_validation = true;
  }

  return {
    risk_level,
    allow_response,
    response_mode,
    require_validation,
    block_reason_pt,
    _internal: {
      user_risk_score: userScore,
      company_risk_score: companyScore,
      combined_score: comb,
      user_reputation: uB.user_reputation,
      company_reputation: cB.company_reputation,
      module: params.module || null
    }
  };
}

function stripSensitiveDetail(text) {
  if (typeof text !== 'string' || !text) return '';
  let t = text;
  t = t.replace(/\b\d{1,3}(?:\.\d{3})*(?:,\d{1,4})?\b/g, '[·]');
  t = t.replace(/\b\d{1,2}\s*%\b/g, '[·]%');
  return t;
}

/**
 * @param {object} synthesis - objeto retornado por synthesize()
 * @param {'full'|'limited'|'restricted'} mode
 */
function applyAdaptiveResponse(synthesis, mode) {
  if (!synthesis || mode === 'full') return synthesis;
  const out = { ...synthesis };

  if (mode === 'limited') {
    const raw = String(out.answer || out.content || '');
    const adj = stripSensitiveDetail(raw).slice(0, 2400);
    out.answer = adj;
    if (typeof out.content === 'string') out.content = adj;
    const baseExpl = out.explanation_layer && typeof out.explanation_layer === 'object' ? out.explanation_layer : {};
    const lim = Array.isArray(baseExpl.limitations) ? baseExpl.limitations : [];
    out.explanation_layer = {
      ...baseExpl,
      limitations: [
        ...lim,
        'Resposta condensada pela camada de governança adaptativa (detalhes numéricos e identificadores sensíveis omitidos).'
      ],
      adaptive_governance: { mode: 'LIMITED' }
    };
    if (Array.isArray(out.based_on)) {
      out.based_on = out.based_on.slice(0, 4);
    }
  }

  if (mode === 'restricted') {
    const msg =
      'Por política de governança adaptativa IMPETUS, a resposta detalhada não está disponível neste contexto. Solicite apoio ao supervisor ou à equipa IMPETUS com o registo de sessão interno.';
    out.answer = msg;
    out.content = msg;
    const baseExpl = out.explanation_layer && typeof out.explanation_layer === 'object' ? out.explanation_layer : {};
    out.explanation_layer = {
      ...baseExpl,
      adaptive_governance: { mode: 'RESTRICTED' },
      limitations: [
        'Modo RESTRICTED: sem dados operacionais específicos na resposta ao utilizador.'
      ]
    };
    out.warnings = Array.isArray(out.warnings) ? [...out.warnings, 'ADAPTIVE_RESTRICTED'] : ['ADAPTIVE_RESTRICTED'];
    out.confidence = Math.min(out.confidence != null ? out.confidence : 0.5, 0.35);
  }

  return out;
}

function invalidateAfterFeedback(companyId, userId) {
  riskIntel.invalidateTenantKeys(companyId, userId);
}

module.exports = {
  ADAPTIVE_ENABLED,
  evaluateRiskContext,
  applyAdaptiveResponse,
  invalidateAfterFeedback,
  maxRiskLevel
};
