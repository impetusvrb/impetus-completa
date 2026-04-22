'use strict';

/**
 * Explicabilidade para insights do Cérebro Operacional (operational_insights).
 * - Registos por padrão: motor determinístico (pattern_engine).
 * - Se metadados ou explanation_layer embutido indicarem LLM: model_assisted.
 */

function parseMetadados(row) {
  let m = row.metadados;
  if (m == null) return {};
  if (typeof m === 'string') {
    try {
      m = JSON.parse(m);
    } catch {
      return {};
    }
  }
  return typeof m === 'object' && !Array.isArray(m) ? m : {};
}

function severityToConfidence(sev) {
  const s = String(sev || 'atencao').toLowerCase();
  if (s === 'critica' || s === 'crítica' || s === 'critical') return 56;
  if (s === 'alta' || s === 'high') return 64;
  if (s === 'media' || s === 'média' || s === 'medium') return 74;
  return 82;
}

function isModelDerivedInsight(meta) {
  if (!meta || typeof meta !== 'object') return false;
  if (meta.ai_generated === true || meta.llm === true) return true;
  const gb = meta.generated_by != null ? String(meta.generated_by).toLowerCase() : '';
  if (gb.includes('llm') || gb.includes('gpt') || gb.includes('claude')) return true;
  if (meta.model != null && String(meta.model).trim() !== '') return true;
  return false;
}

function mergeUniqueStrings(a, b) {
  const out = [];
  const add = (x) => {
    const s = x != null ? String(x).trim() : '';
    if (s && !out.includes(s)) out.push(s);
  };
  (Array.isArray(a) ? a : []).forEach(add);
  (Array.isArray(b) ? b : []).forEach(add);
  return out;
}

/**
 * @param {object} row - linha de operational_insights (PostgreSQL)
 */
function buildExplanationLayerForOperationalInsight(row) {
  const meta = parseMetadados(row);
  const embedded =
    meta.explanation_layer && typeof meta.explanation_layer === 'object'
      ? meta.explanation_layer
      : null;
  const modelHint = isModelDerivedInsight(meta) || !!embedded;

  const facts_used = [];
  if (row.titulo) facts_used.push(`Registo no Cérebro Operacional: «${String(row.titulo).slice(0, 220)}».`);
  if (row.tipo_insight) facts_used.push(`Classificação do padrão: ${row.tipo_insight}.`);
  if (row.categoria) facts_used.push(`Categoria: ${row.categoria}.`);
  if (row.equipamento) facts_used.push(`Equipamento: ${row.equipamento}.`);
  if (row.linha) facts_used.push(`Linha: ${row.linha}.`);
  if (row.severidade) facts_used.push(`Severidade persistida: ${row.severidade}.`);
  if (meta.count != null) facts_used.push(`Agregação nos metadados: contagem ${meta.count}.`);

  const business_rules = [
    modelHint
      ? 'IMPETUS — Insight pode incluir campos enriquecidos por modelo de IA; validar factos na operação antes de agir.'
      : 'IMPETUS — Insight do motor de padrões do Cérebro Operacional (eventos e memória corporativa), sem texto livre de LLM neste registo.',
    'Priorização: severidade e categoria do registo orientam a fila no painel.'
  ];

  let confidence_score = severityToConfidence(row.severidade);
  if (typeof embedded?.confidence_score === 'number' && !Number.isNaN(embedded.confidence_score)) {
    confidence_score = Math.max(0, Math.min(100, Math.round(embedded.confidence_score)));
  }
  if (typeof meta.confidence_score === 'number' && !Number.isNaN(meta.confidence_score)) {
    confidence_score = Math.max(0, Math.min(100, Math.round(meta.confidence_score)));
  }

  const limitations = [];
  if (!modelHint) limitations.push('Sem narrativa gerada por LLM neste registo — apenas dados estruturados do motor.');
  if (!row.descricao || String(row.descricao).trim().length < 8) {
    limitations.push('Descrição curta ou ausente no registo.');
  }

  const reasoningDeterministic = `O motor detetou o padrão «${row.tipo_insight || '—'}» e persistiu este insight. Os factos listados correspondem às colunas de operational_insights e a metadados (ex.: contagens).`;

  const reasoningModel = String(
    embedded?.reasoning_trace ||
      meta.reasoning_trace ||
      meta.cot ||
      'Conteúdo assistido por modelo: cruzar facts_used e metadados com a operação.'
  ).slice(0, 2500);

  const base = {
    facts_used,
    business_rules,
    confidence_score,
    limitations,
    reasoning_trace: modelHint ? reasoningModel : reasoningDeterministic,
    source: modelHint ? 'model_assisted' : 'pattern_engine',
    operational_insight_id: row.id
  };

  if (!embedded) return base;

  return {
    facts_used: mergeUniqueStrings(embedded.facts_used, facts_used),
    business_rules: mergeUniqueStrings(embedded.business_rules, business_rules),
    confidence_score,
    limitations: mergeUniqueStrings(limitations, embedded.limitations),
    reasoning_trace:
      embedded.reasoning_trace != null && String(embedded.reasoning_trace).trim()
        ? String(embedded.reasoning_trace).slice(0, 2500)
        : base.reasoning_trace,
    source: modelHint ? 'model_assisted' : 'pattern_engine',
    operational_insight_id: row.id
  };
}

function enrichOperationalInsightRow(row) {
  if (!row || typeof row !== 'object') return row;
  const explanation_layer = buildExplanationLayerForOperationalInsight(row);
  return {
    ...row,
    title: row.titulo,
    summary: row.descricao,
    description: row.descricao,
    message: row.titulo,
    explanation_layer
  };
}

module.exports = {
  parseMetadados,
  buildExplanationLayerForOperationalInsight,
  enrichOperationalInsightRow
};
