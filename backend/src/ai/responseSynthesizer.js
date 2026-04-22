'use strict';

/**
 * Consolidador final — resposta explicável (content + explanation_layer) para o cliente.
 */

function extractJsonBlock(text) {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/**
 * Extrai { content, explanation_layer } do JSON da etapa final GPT; fallback em texto livre.
 */
function parseFinalStructuredResponse(finalText) {
  if (typeof finalText !== 'string' || !finalText.trim()) {
    return { finalRaw: '', structuredFinal: null };
  }
  const trimmed = finalText.trim();
  let parsed = null;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    parsed = extractJsonBlock(trimmed);
  }
  if (!parsed || typeof parsed !== 'object') {
    return { finalRaw: trimmed, structuredFinal: null };
  }
  const fromContent =
    parsed.content != null && String(parsed.content).trim()
      ? String(parsed.content).trim()
      : '';
  const legacy =
    parsed.resposta_final != null
      ? String(parsed.resposta_final).trim()
      : parsed.answer != null
        ? String(parsed.answer).trim()
        : parsed.texto_resposta != null
          ? String(parsed.texto_resposta).trim()
          : '';
  const contentStr = fromContent || legacy;
  const expl =
    parsed.explanation_layer && typeof parsed.explanation_layer === 'object'
      ? parsed.explanation_layer
      : null;
  if (!contentStr) {
    return { finalRaw: trimmed, structuredFinal: null };
  }
  return {
    finalRaw: contentStr,
    structuredFinal: { content: contentStr, explanation_layer: expl }
  };
}

function buildFactsFromDossier(dossier) {
  const facts = [];
  const d = dossier?.data || {};
  const nK = d.kpis?.length || 0;
  if (nK) facts.push(`${nK} indicador(es) (KPI) incluído(s) no dossiê enviado à IA.`);
  const nE = d.events?.length || 0;
  if (nE) facts.push(`${nE} evento(s) ou ocorrência(s) no contexto estruturado.`);
  const nA = d.assets?.length || 0;
  if (nA) facts.push(`${nA} referência(s) de ativos/equipamentos no contexto.`);
  const nDoc = d.documents?.length || 0;
  if (nDoc) facts.push(`${nDoc} documento(s) referenciado(s).`);
  const nI = d.images?.length || 0;
  if (nI) facts.push(`${nI} imagem(ns) considerada(s) na etapa de percepção.`);
  const sk = d.sensors && typeof d.sensors === 'object' ? Object.keys(d.sensors).length : 0;
  if (sk) facts.push(`Bloco de sensores com ${sk} chave(s) no contexto.`);
  if (dossier?.context?.intent) {
    facts.push(`Intenção classificada pelo motor IMPETUS: ${dossier.context.intent}.`);
  }
  return facts;
}

/**
 * Normaliza e enriquece a camada de explicabilidade (0–100, factos do dossiê, limitações).
 */
function normalizeExplanationLayer(raw, dossier, limitations, heuristic01, extraBusinessRules = []) {
  const facts_used = Array.isArray(raw?.facts_used) ? raw.facts_used.map((x) => String(x)) : [];
  for (const f of buildFactsFromDossier(dossier)) {
    if (!facts_used.some((x) => x.includes(f.slice(0, 12)))) facts_used.push(f);
  }

  let score = raw?.confidence_score;
  if (typeof score !== 'number' || Number.isNaN(score)) {
    score = Math.round((heuristic01 != null ? heuristic01 : 0.72) * 100);
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  const baseRules = [
    'IMPETUS — Conselho Cognitivo: percepção (Gemini quando disponível) → análise técnica (Claude) → formulação final (GPT).',
    'Diretriz: distinguir factos do dossiê de inferências e recomendações na resposta ao utilizador.'
  ];
  const modelRules = Array.isArray(raw?.business_rules)
    ? raw.business_rules.map((x) => String(x))
    : [];
  const business_rules = [...baseRules, ...extraBusinessRules, ...modelRules];
  const uniqRules = [];
  for (const r of business_rules) {
    if (r && !uniqRules.includes(r)) uniqRules.push(r);
  }

  const lim = Array.isArray(raw?.limitations) ? raw.limitations.map((x) => String(x)) : [];
  for (const L of limitations || []) {
    if (L && !lim.includes(L)) lim.push(L);
  }

  const reasoning_trace = raw?.reasoning_trace != null ? String(raw.reasoning_trace).slice(0, 2500) : '';

  return {
    facts_used,
    business_rules: uniqRules,
    confidence_score: score,
    limitations: lim,
    reasoning_trace: reasoning_trace
  };
}

function computeHeuristicConfidence(dossier, validation, degraded) {
  let c = 0.72;
  if (dossier?.analysis?.technical_analysis) c += 0.08;
  if (dossier?.analysis?.perception) c += 0.06;
  if (validation?.aligned === true) c += 0.05;
  if (validation?.aligned === false) c -= 0.18;
  if (degraded) c -= 0.22;
  return Math.max(0.12, Math.min(0.97, c));
}

/**
 * @param {object} params
 * @param {string} [params.finalRaw] - texto bruto se não houver JSON estruturado
 * @param {object} [params.structuredFinal] - { content, explanation_layer } do GPT
 */
function synthesize({
  finalRaw,
  structuredFinal,
  dossier,
  validation,
  modelsUsed,
  degraded,
  limitations = [],
  extraBusinessRules = []
}) {
  const based_on = [];
  if (modelsUsed?.includes('google_gemini')) based_on.push('Percepção multimodal (Gemini)');
  if (modelsUsed?.includes('anthropic')) based_on.push('Análise técnica estruturada (Claude)');
  if (modelsUsed?.includes('openai')) based_on.push('Formulação operacional final (GPT)');

  const warnings = [];
  if (validation && validation.aligned === false) {
    warnings.push(
      'Validação cruzada identificou lacunas entre a recomendação e a análise técnica.'
    );
    if (Array.isArray(validation.gaps)) {
      validation.gaps.slice(0, 5).forEach((g) => warnings.push(`Gap: ${g}`));
    }
    if (Array.isArray(validation.inconsistencias)) {
      validation.inconsistencias.slice(0, 5).forEach((g) =>
        warnings.push(`Inconsistência: ${g}`)
      );
    }
  }
  if (degraded) {
    warnings.push('Execução em modo degradado: um ou mais motores não estiveram disponíveis.');
  }

  const heuristic01 = computeHeuristicConfidence(dossier, validation, degraded);

  let answer = '';
  if (structuredFinal && typeof structuredFinal.content === 'string' && structuredFinal.content.trim()) {
    answer = structuredFinal.content.trim();
  } else {
    answer = String(finalRaw || '').trim();
  }

  const explanation_layer = normalizeExplanationLayer(
    structuredFinal?.explanation_layer,
    dossier,
    limitations,
    heuristic01,
    extraBusinessRules
  );

  const confidence = explanation_layer.confidence_score / 100;

  const explanationParts = [
    `Rastreio: trace_id=${dossier.trace_id}`,
    `Confiança (painel explicabilidade): ${explanation_layer.confidence_score}/100`,
    `Factos considerados: ${explanation_layer.facts_used.length} linha(s) resumida(s)`,
    `Motores: ${(modelsUsed || []).join(', ') || 'n/d'}`
  ];
  if (explanation_layer.reasoning_trace) {
    explanationParts.push(`Raciocínio (resumo): ${explanation_layer.reasoning_trace.slice(0, 500)}`);
  }

  const requires_action =
    (dossier.decision?.requires_human_validation !== false &&
      dossier.decision?.risk_level &&
      dossier.decision.risk_level !== 'low') ||
    (validation && validation.aligned === false) ||
    explanation_layer.confidence_score < 60;

  return {
    content: answer,
    answer,
    explanation: explanationParts.join('\n'),
    explanation_layer,
    confidence: Number(confidence.toFixed(4)),
    confidence_score: explanation_layer.confidence_score,
    based_on,
    warnings,
    requires_action: !!requires_action,
    trace_id: dossier.trace_id
  };
}

module.exports = {
  synthesize,
  extractJsonBlock,
  parseFinalStructuredResponse,
  buildFactsFromDossier,
  normalizeExplanationLayer
};
