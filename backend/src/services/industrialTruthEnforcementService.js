'use strict';

/**
 * Industrial Truth Enforcement Layer — fonte da verdade operacional.
 * Aditivo: entre saída do LLM/painel e resposta ao utilizador (não substitui hallucination V1).
 *
 * Flags:
 *   IMPETUS_INDUSTRIAL_TRUTH_ENFORCEMENT=on|off (default on)
 *   IMPETUS_INDUSTRIAL_TRUTH_MODE=enforce|shadow|off (default enforce)
 */

const db = require('../db');
const softwareOperationalSnapshotService = require('./softwareOperationalSnapshotService');

const LAYER = 'INDUSTRIAL_TRUTH_ENFORCEMENT';

const MSG_NO_DATA =
  'Não existem dados disponíveis para este período.';
const MSG_UNSUPPORTED = 'UNSUPPORTED_OPERATIONAL_CLAIM';
const MSG_CHART_NO_DATA =
  'Relatório gerado sem dados operacionais disponíveis.';

const OPERATIONAL_CLAIM_RE =
  /\b(oee|mtbf|mttr|kpi|produ[cç][aã]o|perdas?|volume|tonelad|unidades?|efici[eê]ncia|disponibilidade|qualidade|manuten[cç][aã]o|seguran[cç]a|paradas?|downtime|scrap|retrabalho)\b/i;

/** FASE 40 — KPIs industriais proibidos em modo telemetry_only (mesmo com números). */
const FORBIDDEN_TELEMETRY_INVENTED_KPI_RE =
  /\b(oee|mtbf|mttr)\b|\bprodu[cç][aã]o\s+(de\s+)?(hoje|ontem|atual|di[aá]ria)\b|\b\d+([.,]\d+)?\s*%\s*(de\s+)?(qualidade|efici[eê]ncia|oee)\b|\befici[eê]ncia\s+(global|operacional|de\s+linha)\b/i;

/** Afirmações suportadas por plc_collected_data (não são KPI inventado). */
const TELEMETRY_SUPPORTED_CLAIM_RE =
  /\b(telemetria|plc|coleta|equipamento|alarme|runtime|sa[uú]de\s+da\s+telemetria|coleta\s+recente|leituras?)\b/i;

/** FASE 41 — Tendências observáveis (não preditivas). */
const TREND_SUPPORTED_CLAIM_RE =
  /\b(aumento\s+observado|redu[cç][aã]o\s+observada|estabilidade\s+observada|est[aá]vel|aumentou|diminuiu|reduziu|tend[eê]ncia|degrada[cç][aã]o\s+observ[aá]vel|melhoria\s+observada|varia[cç][aã]o)\b/i;

/** FASE 41 — Previsões / manutenção preditiva proibidas sem evidência MES. */
const FORBIDDEN_PREDICTIVE_CLAIM_RE =
  /\b(vai\s+falhar|v[aã]o\s+falhar|falha\s+iminente|falha\s+prov[aá]vel|quebra\s+iminente|quebra\s+prevista|quebra\s+prov[aá]vel|previs[aã]o\s+de\s+parada|manuten[cç][aã]o\s+obrigat[oó]ria|precisa\s+de\s+manuten[cç][aã]o|risco\s+iminente|vida\s+[uú]til\s+restante|probabilidade\s+de\s+falha)\b/i;

/** FASE 42 — Previsão de falha / manutenção inferida (sem evidência MES). */
const FORBIDDEN_FAILURE_PREDICTION_CLAIM_RE =
  /\b(vai\s+quebrar|vai\s+falhar|ir[aá]\s+falhar|provavelmente\s+ir[aá]|falha\s+iminente|quebra\s+prov[aá]vel|quebra\s+iminente|necessita\s+manuten[cç][aã]o|precisa\s+de\s+manuten[cç][aã]o|vida\s+[uú]til\s+reduzida|probabilidade\s+de\s+falha)\b/i;

/** FASE 42 — Anomalias observáveis (não preditivas). */
const ANOMALY_SUPPORTED_CLAIM_RE =
  /\b(anomalia\s+observada|desvio\s+observado|fora\s+do\s+padr[aã]o|oscila[cç][aã]o|queda\s+abrupta|acima\s+do\s+baseline|abaixo\s+do\s+baseline|comportamento\s+anormal|aten[cç][aã]o\s+imediata)\b/i;

/** FASE 43 — Correlações observáveis (não causalidade). */
const CORRELATION_SUPPORTED_CLAIM_RE =
  /\b(correla[cç][aã]o|correlacionad|variou\s+em\s+conjunto|associa[cç][aã]o\s+observada|associa[cç][aã]o\s+consistente|sinais\s+variaram\s+juntos|rela[cç][aã]o\s+entre\s+os\s+sinais)\b/i;

/** FASE 43 — Causalidade inferida proibida. */
const FORBIDDEN_CAUSALITY_CLAIM_RE =
  /\b(causa|causou|causando|provoca|provocou|provocando|gera\s+desgaste|gerando\s+desgaste|causa\s+raiz|é\s+a\s+causa|est[aá]\s+causando|devido\s+a\s+falha\s+de|resulta\s+em\s+falha)\b/i;

/** FASE 44 — Eventos operacionais observáveis. */
const EVENT_SUPPORTED_CLAIM_RE =
  /\b(evento\s+operacional|instabilidade\s+(operacional\s+)?observada|instabilidade\s+na|escalada\s+de\s+alarmes|recupera[cç][aã]o\s+(da\s+)?telemetria|altera[cç][aã]o\s+operacional|mudan[cç]a\s+operacional|aconteceu\s+recentemente|foi\s+observad[oa]|merece\s+aten[cç][aã]o|desvio\s+correlacionado)\b/i;

const EVENT_QUERY_RE =
  /\b(evento|aconteceu|recentemente|mudan[cç]a|opera[cç]ional|aten[cç][aã]o|instabilidade|timeline|o\s+que\s+aconteceu)\b/i;

/** FASE 45 — Padrões operacionais recorrentes observáveis. */
const PATTERN_SUPPORTED_CLAIM_RE =
  /\b(padr[aã]o\s+recorrente|recorr[eê]ncia\s+observada|comportamento\s+repetitivo|repetidamente|j[aá]\s+ocorreu\s+antes|eventos?\s+recorrentes?|foi\s+observad[oa]\s+um\s+padr[aã]o)\b/i;

const PATTERN_QUERY_RE =
  /\b(padr[aã]o|recorrente|repetitivo|j[aá]\s+ocorreu|aconteceu\s+antes|frequentemente|toda\s+semana)\b/i;

/** FASE 45 — Previsão de repetição futura / inevitabilidade. */
const FORBIDDEN_PATTERN_PREDICTION_CLAIM_RE =
  /\b(vai\s+acontecer\s+novamente|voltar[aá]\s+a\s+ocorrer|ir[aá]\s+ocorrer\s+novamente|ir[aá]\s+apresentar[^.]{0,80}novamente|mesmo\s+problema\s+novamente|inevit[aá]vel|vai\s+piorar|causa\s+raiz\s+encontrada|acontecer[aá]\s+de\s+novo|se\s+repetir[aá]\s+novamente|problema\s+novamente)\b/i;

/** FASE 46 — Explicações operacionais observáveis. */
const EXPLANATION_SUPPORTED_CLAIM_RE =
  /\b(classificad[oa]\s+devido|evid[eê]ncias\s+observadas|principal\s+contribui[cç][aã]o|contribui[cç][aã]o\s+observada|sustentad[oa]\s+por|m[uú]ltiplas\s+ocorr[eê]ncias|explica[cç][aã]o\s+operacional|rastreabilidade)\b/i;

const EXPLANATION_QUERY_RE =
  /\b(por\s+que|porqu[eê]|evid[eê]ncias|sustentam|contribu[ií]ram|classificad[oa]|explica)\b/i;

/** FASE 46 — Causa raiz / causalidade afirmada. */
const FORBIDDEN_ROOT_CAUSE_CLAIM_RE =
  /\b(sabemos\s+a\s+causa|foi\s+provocad[oa]\s+por|provocad[oa]\s+por|origem\s+do\s+problema|causa\s+raiz\s+confirmada|causa\s+raiz\s+identificada|causa\s+raiz\s+[eé])\b/i;

/** FASE 47 — Priorização operacional observável. */
const PRIORITY_SUPPORTED_CLAIM_RE =
  /\b(maior\s+prioridade\s+observ[aá]vel|prioridade\s+operacional\s+elevada|merece\s+aten[cç][aã]o\s+primeiro|combina[cç][aã]o\s+das\s+evid[eê]ncias|fila\s+de\s+prioridade|priority_score|analisar\s+primeiro)\b/i;

const PRIORITY_QUERY_RE =
  /\b(prioridade|primeiro|mais\s+relevante|merece\s+aten[cç][aã]o|devo\s+analisar|fila)\b/i;

/** FASE 47 — Previsão / perigo absoluto via prioridade. */
const FORBIDDEN_PRIORITY_PREDICTION_CLAIM_RE =
  /\b(mais\s+perigoso|o\s+mais\s+perigoso|vai\s+falhar\s+primeiro|deve\s+quebrar|mais\s+cr[ií]tico\s+da\s+planta|primeiro\s+a\s+falhar)\b/i;

/** FASE 44 — Previsão de evento/falha/parada. */
const FORBIDDEN_EVENT_PREDICTION_CLAIM_RE =
  /\b(vai\s+falhar|vai\s+parar|ir[aá]\s+parar|ocorrer[aá]\s+uma\s+falha|falha\s+futura|linha\s+ir[aá]\s+parar|equipamento\s+ir[aá]\s+quebrar|quebra\s+iminente|parada\s+iminente)\b/i;

const NUMERIC_CLAIM_RE = /\b\d+([.,]\d+)?\s*%|\b\d{1,3}([.,]\d{3})+\b|\b\d+([.,]\d+)?\s*(ton|t\/h|un\/h|pe[cç]as|litros?|kg)\b/i;

const CONVERSATIONAL_TURN_RE =
  /^(bom\s+dia|boa\s+tarde|boa\s+noite|ol[aá]|oi|hey|hello|hi|e\s+a[ií]|tudo\s+bem)\b/i;

/**
 * Turnos sociais / identidade — não devem passar por enforcement operacional pesado.
 * Perguntas operacionais explícitas continuam sujeitas ao truth layer.
 */
function isConversationalTurn(queryText) {
  const t = String(queryText || '').trim();
  if (!t) return false;
  if (OPERATIONAL_CLAIM_RE.test(t) || NUMERIC_CLAIM_RE.test(t)) return false;
  if (CONVERSATIONAL_TURN_RE.test(t)) return true;
  if (
    /^(quem\s+[eé]\s+voc|o\s+que\s+voc|como\s+voc|qual\s+seu\s+nome)/i.test(t)
  ) {
    return true;
  }
  return false;
}

const PERCENT_RE = /\b\d+([.,]\d+)?\s*%/g;
const PLAIN_NUM_RE = /\b\d+([.,]\d+)?\b/g;

function isEnabled() {
  const v = String(process.env.IMPETUS_INDUSTRIAL_TRUTH_ENFORCEMENT || 'on')
    .trim()
    .toLowerCase();
  return v === 'on' || v === 'true' || v === '1';
}

function getMode() {
  if (!isEnabled()) return 'off';
  const v = String(process.env.IMPETUS_INDUSTRIAL_TRUTH_MODE || 'enforce')
    .trim()
    .toLowerCase();
  if (['enforce', 'shadow', 'off'].includes(v)) return v;
  return 'enforce';
}

function _log(event, data) {
  try {
    console.info(
      `[${LAYER}]`,
      JSON.stringify({ event, ts: new Date().toISOString(), mode: getMode(), ...data })
    );
  } catch {
    /* noop */
  }
}

function normalizeNumToken(raw) {
  const t = String(raw || '')
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function extractNumericTokens(text) {
  const out = new Set();
  const src = String(text || '');
  for (const m of src.match(PERCENT_RE) || []) {
    const n = normalizeNumToken(m);
    if (n != null) out.add(String(n));
  }
  for (const m of src.match(PLAIN_NUM_RE) || []) {
    const n = normalizeNumToken(m);
    if (n != null && n >= 0) out.add(String(n));
  }
  return out;
}

function detectForbiddenTelemetryInventedKpis(text) {
  const t = String(text || '');
  if (!t.trim()) return [];
  if (!FORBIDDEN_TELEMETRY_INVENTED_KPI_RE.test(t)) return [];
  return [
    {
      type: 'forbidden_industrial_kpi',
      category: 'telemetry_only_violation',
      detail:
        'Em modo telemetry_only não são permitidos OEE, MTBF/MTTR, produção quantificada ou percentagens de qualidade/eficiência sem cadastro MES.'
    }
  ];
}

function classifyTelemetrySupportedClaims(answer, pack = {}) {
  const text = String(answer || '');
  if (!text.trim() || !pack?.snapshot) return [];
  const snap = pack.snapshot;
  const bindingOk =
    String(pack.source_table || snap.source_table || '') === 'plc_collected_data' ||
    snap.source_table === 'plc_collected_data';
  if (!bindingOk) return [];

  const supported = [];
  if (TELEMETRY_SUPPORTED_CLAIM_RE.test(text) && snap.equipment_count > 0) {
    supported.push({
      type: 'telemetry_supported_claim',
      category: 'plc_observable',
      detail: 'Afirmação alinhada a telemetria PLC com snapshot auditável.'
    });
  }
  if (/\bactivo|ativa|em\s+opera[cç][aã]o\b/i.test(text) && snap.active_equipment_count > 0) {
    supported.push({
      type: 'telemetry_supported_claim',
      category: 'active_equipment',
      detail: `${snap.active_equipment_count} equipamento(s) com coleta recente.`
    });
  }
  if (/\balarme/i.test(text) && (snap.alarm_count > 0 || snap.alarm_active)) {
    supported.push({
      type: 'telemetry_supported_claim',
      category: 'alarms_observed',
      detail: `Alarmes observados na janela: ${snap.alarm_count}.`
    });
  }
  return supported;
}

function detectForbiddenPredictiveClaims(text) {
  const t = String(text || '');
  if (!t.trim()) return [];
  if (!FORBIDDEN_PREDICTIVE_CLAIM_RE.test(t)) return [];
  return [
    {
      type: 'forbidden_predictive_claim',
      category: 'predictive_violation',
      detail:
        'Afirmações preditivas (falha iminente, quebra prevista, manutenção obrigatória) não são permitidas sem evidência MES — apenas tendências observáveis.'
    }
  ];
}

function classifyTrendSupportedClaims(answer, trendPack = {}) {
  const text = String(answer || '');
  const equipment = trendPack?.trend_snapshot?.equipment || [];
  if (!text.trim() || !equipment.length) return [];

  const supported = [];
  if (!TREND_SUPPORTED_CLAIM_RE.test(text)) return supported;

  const hasIncreasing = equipment.some((eq) =>
    Object.keys(eq).some(
      (k) =>
        k !== 'equipment_id' &&
        eq[k]?.trend === 'increasing' &&
        /\baumento|aumentou|crescente|subiu\b/i.test(text)
    )
  );
  const hasDecreasing = equipment.some((eq) =>
    Object.keys(eq).some(
      (k) => k !== 'equipment_id' && eq[k]?.trend === 'decreasing' && /\bredu[cç]|diminuiu|desceu\b/i.test(text)
    )
  );
  const hasStable = equipment.some((eq) =>
    Object.keys(eq).some(
      (k) => k !== 'equipment_id' && eq[k]?.trend === 'stable' && /\best[aá]vel|estabilidade\b/i.test(text)
    )
  );

  if (hasIncreasing || hasDecreasing || hasStable) {
    supported.push({
      type: 'trend_supported_claim',
      category: 'plc_temporal_observable',
      detail: 'Afirmação de tendência alinhada ao trend snapshot PLC.'
    });
  }

  return supported;
}

function detectForbiddenFailurePredictionClaims(text) {
  const t = String(text || '');
  if (!t.trim()) return [];
  if (!FORBIDDEN_FAILURE_PREDICTION_CLAIM_RE.test(t)) return [];
  return [
    {
      type: 'forbidden_failure_prediction_claim',
      category: 'failure_prediction_violation',
      detail:
        'Previsão de falha ou manutenção obrigatória não permitida — apenas anomalias e desvios observáveis na telemetria.'
    }
  ];
}

function classifyAnomalySupportedClaims(answer, anomalyPack = {}) {
  const text = String(answer || '');
  const anomalies = anomalyPack?.anomalies || [];
  if (!text.trim() || !anomalies.length) return [];

  const supported = [];
  if (!ANOMALY_SUPPORTED_CLAIM_RE.test(text) && !/\banomalia|desvio|baseline|fora\s+do\s+padr/i.test(text)) {
    return supported;
  }

  const matchesSignal = anomalies.some((a) => {
    const sigRe = new RegExp(a.signal, 'i');
    return sigRe.test(text) || text.includes(a.equipment_id);
  });

  if (matchesSignal || anomalies.length > 0) {
    supported.push({
      type: 'anomaly_supported_claim',
      category: 'plc_anomaly_observable',
      detail: 'Afirmação alinhada ao pacote de anomalias PLC auditável.'
    });
  }

  return supported;
}

function detectForbiddenCausalityClaims(text) {
  const t = String(text || '');
  if (!t.trim()) return [];
  if (!FORBIDDEN_CAUSALITY_CLAIM_RE.test(t)) return [];
  return [
    {
      type: 'forbidden_causality_claim',
      category: 'causality_violation',
      detail:
        'Inferência de causalidade não permitida — apenas correlação/associação observável entre sinais PLC.'
    }
  ];
}

function classifyCorrelationSupportedClaims(answer, correlationPack = {}) {
  const text = String(answer || '');
  const pairs = correlationPack?.correlation_pairs || [];
  if (!text.trim() || !pairs.length) return [];

  const supported = [];
  if (
    !CORRELATION_SUPPORTED_CLAIM_RE.test(text) &&
    !/\bcorrela|associ|variou\s+junto|rela[cç][aã]o\s+entre/i.test(text)
  ) {
    return supported;
  }

  const matches = pairs.some(
    (p) =>
      text.includes(p.equipment_id) ||
      new RegExp(p.signal_a, 'i').test(text) ||
      new RegExp(p.signal_b, 'i').test(text)
  );

  if (matches || pairs.length > 0) {
    supported.push({
      type: 'correlation_supported_claim',
      category: 'plc_correlation_observable',
      detail: 'Afirmação de associação estatística alinhada ao correlation snapshot PLC.'
    });
  }

  return supported;
}

function detectForbiddenEventPredictionClaims(text) {
  const t = String(text || '');
  if (!t.trim()) return [];
  const blocked =
    FORBIDDEN_EVENT_PREDICTION_CLAIM_RE.test(t) ||
    detectForbiddenFailurePredictionClaims(t).length > 0 ||
    detectForbiddenPredictiveClaims(t).length > 0;
  if (!blocked) return [];
  return [
    {
      type: 'forbidden_event_prediction_claim',
      category: 'event_prediction_violation',
      detail:
        'Previsão de falha, parada ou evento futuro não permitida — apenas eventos já observados na telemetria.'
    }
  ];
}

function classifyEventSupportedClaims(answer, eventPack = {}, opts = {}) {
  const text = String(answer || '');
  const queryText = String(opts.queryText || '');
  const events = eventPack?.events || [];
  if (!text.trim() || !events.length) return [];

  const supported = [];
  const observableEvents = events.filter((e) => e.event_type !== 'NORMAL_OPERATION');
  const eventQuery = EVENT_QUERY_RE.test(queryText);

  const eventLanguage =
    EVENT_SUPPORTED_CLAIM_RE.test(text) ||
    /\bevento|instabilidade|alarme|recupera|operacional|aconteceu|escalada|desvio\s+correlacionado/i.test(
      text
    ) ||
    (eventQuery && TELEMETRY_SUPPORTED_CLAIM_RE.test(text));

  if (!eventLanguage) return supported;

  const matchesEquipment = events.some(
    (e) =>
      text.includes(e.equipment_id) ||
      (e.summary && text.toLowerCase().includes(String(e.summary).slice(0, 24).toLowerCase()))
  );

  if (
    matchesEquipment ||
    observableEvents.length > 0 ||
    (eventQuery && TELEMETRY_SUPPORTED_CLAIM_RE.test(text))
  ) {
    supported.push({
      type: 'event_supported_claim',
      category: 'plc_operational_event',
      detail: 'Afirmação alinhada ao pacote de eventos operacionais PLC.'
    });
  }

  return supported;
}

function detectForbiddenPatternPredictionClaims(text) {
  const t = String(text || '');
  if (!t.trim()) return [];
  const blocked =
    FORBIDDEN_PATTERN_PREDICTION_CLAIM_RE.test(t) ||
    detectForbiddenEventPredictionClaims(t).length > 0 ||
    FORBIDDEN_CAUSALITY_CLAIM_RE.test(t);
  if (!blocked) return [];
  return [
    {
      type: 'forbidden_pattern_prediction_claim',
      category: 'pattern_prediction_violation',
      detail:
        'Previsão de repetição futura, inevitabilidade ou causa raiz não permitida — apenas padrões já observados.'
    }
  ];
}

function classifyPatternSupportedClaims(answer, patternPack = {}, opts = {}) {
  const text = String(answer || '');
  const queryText = String(opts.queryText || '');
  const patterns = (patternPack?.patterns || []).filter((p) => p.observed_pattern);
  if (!text.trim() || !patterns.length) return [];

  const supported = [];
  const patternQuery = PATTERN_QUERY_RE.test(queryText);

  const patternLanguage =
    PATTERN_SUPPORTED_CLAIM_RE.test(text) ||
    /\bpadr[aã]o|recorrente|repetitivo|recorr[eê]ncia|frequentemente/i.test(text) ||
    (patternQuery && TELEMETRY_SUPPORTED_CLAIM_RE.test(text));

  if (!patternLanguage) return supported;

  const matchesEquipment = patterns.some(
    (p) =>
      text.includes(p.equipment_id) ||
      (p.summary && text.toLowerCase().includes(String(p.summary).slice(0, 24).toLowerCase()))
  );

  if (matchesEquipment || patterns.length > 0 || (patternQuery && TELEMETRY_SUPPORTED_CLAIM_RE.test(text))) {
    supported.push({
      type: 'pattern_supported_claim',
      category: 'plc_operational_pattern',
      detail: 'Afirmação alinhada ao pacote de padrões operacionais recorrentes PLC.'
    });
  }

  return supported;
}

function detectForbiddenRootCauseClaims(text) {
  const t = String(text || '');
  if (!t.trim()) return [];
  const blocked =
    FORBIDDEN_ROOT_CAUSE_CLAIM_RE.test(t) ||
    detectForbiddenCausalityClaims(t).length > 0;
  if (!blocked) return [];
  return [
    {
      type: 'forbidden_root_cause_claim',
      category: 'root_cause_violation',
      detail:
        'Afirmação de causa raiz ou origem confirmada não permitida — apenas evidências e contribuições observadas.'
    }
  ];
}

function classifyExplanationSupportedClaims(answer, explanationPack = {}, opts = {}) {
  const text = String(answer || '');
  const queryText = String(opts.queryText || '');
  const explanations = explanationPack?.explanations || [];
  if (!text.trim() || !explanations.length) return [];

  const supported = [];
  const explQuery = EXPLANATION_QUERY_RE.test(queryText);

  const explLanguage =
    EXPLANATION_SUPPORTED_CLAIM_RE.test(text) ||
    /\bevid[eê]ncia|contribui[cç][aã]o|classificad|sustentad|rastreabil/i.test(text) ||
    (explQuery && TELEMETRY_SUPPORTED_CLAIM_RE.test(text));

  if (!explLanguage) return supported;

  const matches = explanations.some(
    (e) =>
      text.includes(e.equipment_id) ||
      text.includes(e.entity_id) ||
      (e.summary && text.toLowerCase().includes(String(e.summary).slice(0, 20).toLowerCase()))
  );

  if (matches || explanations.length > 0 || (explQuery && TELEMETRY_SUPPORTED_CLAIM_RE.test(text))) {
    supported.push({
      type: 'explanation_supported_claim',
      category: 'plc_operational_explanation',
      detail: 'Afirmação alinhada ao pacote de explicações operacionais PLC.'
    });
  }

  return supported;
}

function detectForbiddenPriorityPredictionClaims(text) {
  const t = String(text || '');
  if (!t.trim()) return [];
  const blocked =
    FORBIDDEN_PRIORITY_PREDICTION_CLAIM_RE.test(t) ||
    detectForbiddenEventPredictionClaims(t).length > 0 ||
    detectForbiddenFailurePredictionClaims(t).length > 0;
  if (!blocked) return [];
  return [
    {
      type: 'forbidden_priority_prediction_claim',
      category: 'priority_prediction_violation',
      detail:
        'Classificação de perigo absoluto ou falha iminente via prioridade não permitida — apenas importância operacional observável.'
    }
  ];
}

function classifyPrioritySupportedClaims(answer, priorityPack = {}, opts = {}) {
  const text = String(answer || '');
  const queryText = String(opts.queryText || '');
  const ranking = priorityPack?.equipment_ranking || [];
  if (!text.trim() || !ranking.length) return [];

  const supported = [];
  const priorityQuery = PRIORITY_QUERY_RE.test(queryText);

  const priorityLanguage =
    PRIORITY_SUPPORTED_CLAIM_RE.test(text) ||
    /\bprioridade|primeiro|fila|maior\s+relev[aâ]ncia|priority/i.test(text) ||
    (priorityQuery && TELEMETRY_SUPPORTED_CLAIM_RE.test(text));

  if (!priorityLanguage) return supported;

  const top = ranking[0];
  const matches =
    top &&
    (text.includes(top.equipment_id) ||
      text.includes(String(top.priority_score)) ||
      /prioridade\s+observ[aá]vel/i.test(text));

  if (matches || ranking.length > 0 || (priorityQuery && TELEMETRY_SUPPORTED_CLAIM_RE.test(text))) {
    supported.push({
      type: 'priority_supported_claim',
      category: 'plc_operational_priority',
      detail: 'Afirmação alinhada ao pacote de priorização operacional PLC.'
    });
  }

  return supported;
}

function collectEvidenceFromContext(ctx = {}) {
  const blobs = [];
  const pack = ctx.contextualPack || ctx.dashboardContextualPack || ctx;
  if (pack?.kpis && Array.isArray(pack.kpis)) {
    for (const k of pack.kpis) {
      if (k?.value != null) blobs.push(String(k.value));
      if (k?.title) blobs.push(String(k.title));
    }
  }
  if (pack?.metrics && typeof pack.metrics === 'object') {
    blobs.push(JSON.stringify(pack.metrics));
  }
  if (pack?.softwareSnapshotText) blobs.push(String(pack.softwareSnapshotText));
  if (ctx.instructions_append) blobs.push(String(ctx.instructions_append));
  if (ctx.kpiLines) blobs.push(String(ctx.kpiLines));
  if (ctx.summaryBlock) blobs.push(String(ctx.summaryBlock));
  if (Array.isArray(ctx.evidenceNumbers)) {
    for (const n of ctx.evidenceNumbers) blobs.push(String(n));
  }
  const evidence = new Set();
  for (const b of blobs) {
    for (const t of extractNumericTokens(b)) evidence.add(t);
  }
  return evidence;
}

/**
 * Verifica existência de dados operacionais por domínio (tenant-scoped).
 * @param {string} domain
 * @param {string} companyId
 * @param {object} [user]
 */
async function hasOperationalData(domain, companyId, user = null) {
  if (!companyId) return { has_data: false, source_table: null, detail: 'no_company' };

  const d = String(domain || 'general').toLowerCase();

  try {
    if (d === 'telemetria' || d === 'plc') {
      const r = await db.query(
        `SELECT COUNT(*)::int AS c FROM plc_collected_data
         WHERE company_id = $1 AND collected_at > NOW() - INTERVAL '30 days'`,
        [companyId]
      );
      const c = r.rows[0]?.c ?? 0;
      return { has_data: c > 0, source_table: 'plc_collected_data', count: c };
    }
    if (d === 'manutencao' || d === 'maintenance') {
      const r = await db.query(
        `SELECT COUNT(*)::int AS c FROM maintenance_orders
         WHERE company_id = $1 AND created_at > NOW() - INTERVAL '90 days'`,
        [companyId]
      ).catch(() => ({ rows: [{ c: 0 }] }));
      const c = r.rows[0]?.c ?? 0;
      if (c > 0) return { has_data: true, source_table: 'maintenance_orders', count: c };
      if (user) {
        const maint = await require('./dashboardMaintenanceService').getCards(user).catch(() => null);
        const hasCard = maint && typeof maint === 'object' && Object.keys(maint).length > 0;
        return { has_data: !!hasCard, source_table: 'maintenance_cards', count: hasCard ? 1 : 0 };
      }
      return { has_data: false, source_table: 'maintenance_orders', count: 0 };
    }
    if (d === 'proaction' || d === 'proposals') {
      const r = await db.query(
        `SELECT COUNT(*)::int AS c FROM proposals WHERE company_id = $1`,
        [companyId]
      );
      const c = r.rows[0]?.c ?? 0;
      return { has_data: c > 0, source_table: 'proposals', count: c };
    }
    if (d === 'comunicacoes' || d === 'communications') {
      const r = await db.query(
        `SELECT COUNT(*)::int AS c FROM communications WHERE company_id = $1`,
        [companyId]
      );
      const c = r.rows[0]?.c ?? 0;
      return { has_data: c > 0, source_table: 'communications', count: c };
    }
    if (d === 'kpis' || d === 'summary' || d === 'general' || d === 'producao' || d === 'qualidade') {
      const r = await db.query(
        `SELECT COUNT(*)::int AS c FROM communications
         WHERE company_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
        [companyId]
      ).catch(() => ({ rows: [{ c: 0 }] }));
      const interactions = r.rows[0]?.c ?? 0;
      if (interactions > 0) {
        return { has_data: true, source_table: 'communications', count: interactions };
      }
      const plc = await db.query(
        `SELECT COUNT(*)::int AS c FROM plc_collected_data
         WHERE company_id = $1 AND collected_at > NOW() - INTERVAL '30 days'`,
        [companyId]
      ).catch(() => ({ rows: [{ c: 0 }] }));
      const pc = plc.rows[0]?.c ?? 0;
      return {
        has_data: pc > 0,
        source_table: pc > 0 ? 'plc_collected_data' : 'communications',
        count: pc
      };
    }
  } catch (err) {
    return { has_data: false, source_table: null, error: err.message };
  }

  return { has_data: false, source_table: null, detail: 'unknown_domain' };
}

/**
 * Disponibilidade agregada para resposta/painel.
 */
async function checkOperationalAvailability(user, opts = {}) {
  const companyId = user?.company_id;
  const domains =
    opts.domains ||
    softwareOperationalSnapshotService.inferDomainsFromText(opts.queryText || '', user);
  const checks = [];
  for (const domain of ['general', ...domains]) {
    checks.push({ domain, ...(await hasOperationalData(domain, companyId, user)) });
  }
  const has_any_data = checks.some((c) => c.has_data);
  const dataState =
    opts.dataState ||
    opts.contextualPack?.metrics?.data_state ||
    opts.interpretation?.data_state ||
    null;

  const tenantEmpty =
    dataState === 'tenant_empty' ||
    dataState === 'tenant_inactive' ||
    (!has_any_data && dataState === 'production_paused');

  const telemetryOnly = dataState === 'telemetry_only';
  const effectiveHasAnyData = telemetryOnly ? has_any_data : has_any_data && !tenantEmpty;

  return {
    company_id: companyId,
    has_any_data: effectiveHasAnyData,
    tenant_empty: tenantEmpty,
    data_state: dataState,
    domain_checks: checks,
    checked_at: new Date().toISOString()
  };
}

function detectUnsupportedClaims(answer, evidenceNumbers, opts = {}) {
  const text = String(answer || '');
  if (!text.trim()) return [];

  const claims = [];
  const evidence = evidenceNumbers instanceof Set ? evidenceNumbers : new Set(evidenceNumbers || []);
  const telemetryOnly = opts.telemetryOnly === true;
  const hasOperationalLanguage =
    (telemetryOnly
      ? FORBIDDEN_TELEMETRY_INVENTED_KPI_RE.test(text) || NUMERIC_CLAIM_RE.test(text)
      : OPERATIONAL_CLAIM_RE.test(text) || NUMERIC_CLAIM_RE.test(text));

  if (!hasOperationalLanguage) return [];

  const answerNums = extractNumericTokens(text);
  const significant = [...answerNums].filter((n) => {
    const v = parseFloat(n);
    return Number.isFinite(v) && v > 0;
  });

  if (significant.length === 0) return [];

  if (evidence.size === 0 && opts.requireEvidenceForNumeric !== false) {
    claims.push({
      type: 'numeric_without_evidence',
      detail: 'Resposta contém métricas numéricas sem base no snapshot autorizado.'
    });
    return claims;
  }

  let unmatched = 0;
  for (const n of significant) {
    const v = parseFloat(n);
    let found = evidence.has(n) || evidence.has(String(v));
    if (!found) {
      for (const e of evidence) {
        const ev = parseFloat(e);
        if (Number.isFinite(ev) && Math.abs(ev - v) < 0.02) {
          found = true;
          break;
        }
      }
    }
    if (!found) unmatched += 1;
  }

  if (unmatched > 0 && unmatched >= Math.min(2, significant.length)) {
    claims.push({
      type: 'ungrounded_metrics',
      detail: `${unmatched} valor(es) numérico(s) sem correspondência no contexto operacional injetado.`,
      sample_values: significant.slice(0, 5)
    });
  } else if (unmatched > 0 && significant.length === 1) {
    claims.push({
      type: 'ungrounded_metric',
      detail: 'Valor numérico sem correspondência no snapshot autorizado.',
      sample_values: significant.slice(0, 3)
    });
  }

  return claims;
}

function buildEvidenceBinding(availability, channel, opts = {}) {
  const primary = (availability.domain_checks || []).find((c) => c.has_data);
  const telemetryOnly = availability.data_state === 'telemetry_only';
  const hasTrend =
    opts.hasTrendSnapshot === true ||
    (opts.trendPack?.trend_snapshot?.equipment?.length ?? 0) > 0;
  const hasAnomaly =
    opts.hasAnomalySnapshot === true || (opts.anomalyPack?.anomalies?.length ?? 0) > 0;
  const hasCorrelation =
    opts.hasCorrelationSnapshot === true || (opts.correlationPack?.correlation_pairs?.length ?? 0) > 0;
  const hasEvents =
    opts.hasEventSnapshot === true || (opts.eventPack?.events?.length ?? 0) > 0;
  const hasPatterns =
    opts.hasPatternSnapshot === true || (opts.patternPack?.patterns?.length ?? 0) > 0;
  const hasExplanations =
    opts.hasExplanationSnapshot === true || (opts.explanationPack?.explanations?.length ?? 0) > 0;
  const hasPriority =
    opts.hasPrioritySnapshot === true || (opts.priorityPack?.equipment_ranking?.length ?? 0) > 0;
  const plcPrimary =
    (availability.domain_checks || []).find(
      (c) => c.has_data && (c.domain === 'telemetria' || c.domain === 'plc' || c.source_table === 'plc_collected_data')
    ) || primary;

  const binding = {
    source_table: plcPrimary?.source_table || primary?.source_table || null,
    timestamp: availability.checked_at,
    company_id: availability.company_id || null,
    confidence:
      availability.has_any_data || telemetryOnly ? 'snapshot_backed' : 'no_operational_data',
    channel: channel || null,
    data_state: availability.data_state || null
  };

  if (
    telemetryOnly ||
    hasTrend ||
    hasAnomaly ||
    hasCorrelation ||
    hasEvents ||
    hasPatterns ||
    hasExplanations ||
    hasPriority
  ) {
    if (telemetryOnly) {
      binding.telemetry_only = true;
      binding.source_table = binding.source_table || 'plc_collected_data';
      binding.confidence = 'snapshot_backed';
    }
    const categories = ['telemetry_supported_claim'];
    if (hasTrend) categories.push('trend_supported_claim');
    if (hasAnomaly) categories.push('anomaly_supported_claim');
    if (hasCorrelation) categories.push('correlation_supported_claim');
    if (hasEvents) categories.push('event_supported_claim');
    if (hasPatterns) categories.push('pattern_supported_claim');
    if (hasExplanations) categories.push('explanation_supported_claim');
    if (hasPriority) categories.push('priority_supported_claim');
    binding.claim_categories = categories;
  }

  return binding;
}

/**
 * Aplica enforcement a texto de resposta (chat, voz pós-processada se aplicável).
 */
async function enforceTextResponse(text, opts = {}) {
  const mode = getMode();
  if (mode === 'off' || !isEnabled()) {
    return {
      text,
      enforced: false,
      mode,
      evidence_binding: buildEvidenceBinding({ domain_checks: [] }, opts.channel)
    };
  }

  const user = opts.user;
  const injectOperational = opts.injectOperational !== false;
  const answer = String(text || '');

  if (!injectOperational) {
    return {
      text: answer,
      enforced: true,
      skipped: 'non_operational_turn',
      mode,
      evidence_binding: buildEvidenceBinding(
        { company_id: user?.company_id, domain_checks: [], has_any_data: false },
        opts.channel
      )
    };
  }

  if (isConversationalTurn(opts.queryText)) {
    return {
      text: answer,
      enforced: true,
      skipped: 'conversational_turn',
      mode,
      evidence_binding: buildEvidenceBinding(
        { company_id: user?.company_id, domain_checks: [], has_any_data: false },
        opts.channel
      )
    };
  }

  const availability = await checkOperationalAvailability(user, {
    domains: opts.domains,
    queryText: opts.queryText,
    contextualPack: opts.contextualPack,
    interpretation: opts.interpretation,
    dataState: opts.dataState
  });

  const dataState =
    opts.dataState ||
    opts.interpretation?.data_state ||
    opts.contextualPack?.metrics?.data_state ||
    null;
  const telemetryOnly = dataState === 'telemetry_only';

  let plcIntelligencePack = opts.plcIntelligencePack || null;
  let trendPack = opts.trendPack || plcIntelligencePack?.trend_pack || null;
  let anomalyPack = opts.anomalyPack || plcIntelligencePack?.anomaly_pack || null;
  let correlationPack = opts.correlationPack || plcIntelligencePack?.correlation_pack || null;
  let eventPack = opts.eventPack || plcIntelligencePack?.event_pack || null;
  let patternPack = opts.patternPack || plcIntelligencePack?.pattern_pack || null;
  let explanationPack = opts.explanationPack || plcIntelligencePack?.explanation_pack || null;
  let priorityPack = opts.priorityPack || plcIntelligencePack?.priority_pack || null;

  if ((telemetryOnly || opts.contextualPack?.metrics?.plc_intelligence) && !plcIntelligencePack && user?.company_id) {
    try {
      const plcIntel = require('./plcOperationalIntelligenceService');
      plcIntelligencePack = await plcIntel.buildPlcOperationalPack(user.company_id);
    } catch (plcLoadErr) {
      console.warn('[INDUSTRIAL_TRUTH][plc_intel]', plcLoadErr?.message ?? plcLoadErr);
    }
  }

  if (!trendPack && user?.company_id && (telemetryOnly || plcIntelligencePack)) {
    try {
      const plcTrend = require('./plcTrendAnalysisService');
      trendPack = await plcTrend.buildOperationalTrendPack(user.company_id);
      if (plcIntelligencePack) plcIntelligencePack.trend_pack = trendPack;
    } catch (trendErr) {
      console.warn('[INDUSTRIAL_TRUTH][trend]', trendErr?.message ?? trendErr);
    }
  }

  if (!anomalyPack && user?.company_id && (telemetryOnly || plcIntelligencePack)) {
    try {
      const plcAnomaly = require('./plcAnomalyAnalysisService');
      anomalyPack = await plcAnomaly.buildOperationalAnomalyPack(user.company_id);
      if (plcIntelligencePack) plcIntelligencePack.anomaly_pack = anomalyPack;
    } catch (anomErr) {
      console.warn('[INDUSTRIAL_TRUTH][anomaly]', anomErr?.message ?? anomErr);
    }
  }

  if (!correlationPack && user?.company_id && (telemetryOnly || plcIntelligencePack)) {
    try {
      const plcCorr = require('./plcCorrelationAnalysisService');
      correlationPack = await plcCorr.buildOperationalCorrelationPack(user.company_id);
      if (plcIntelligencePack) plcIntelligencePack.correlation_pack = correlationPack;
    } catch (corrErr) {
      console.warn('[INDUSTRIAL_TRUTH][correlation]', corrErr?.message ?? corrErr);
    }
  }

  if (!eventPack && user?.company_id && (telemetryOnly || plcIntelligencePack)) {
    try {
      const opEvents = require('./operationalEventIntelligenceService');
      eventPack = await opEvents.buildOperationalEventPack(user.company_id);
      if (plcIntelligencePack) plcIntelligencePack.event_pack = eventPack;
    } catch (evErr) {
      console.warn('[INDUSTRIAL_TRUTH][events]', evErr?.message ?? evErr);
    }
  }

  if (!patternPack && user?.company_id && (telemetryOnly || plcIntelligencePack)) {
    try {
      const opPatterns = require('./operationalPatternIntelligenceService');
      patternPack = await opPatterns.buildOperationalPatternPack(user.company_id);
      if (plcIntelligencePack) plcIntelligencePack.pattern_pack = patternPack;
    } catch (patErr) {
      console.warn('[INDUSTRIAL_TRUTH][patterns]', patErr?.message ?? patErr);
    }
  }

  if (!explanationPack && user?.company_id && (telemetryOnly || plcIntelligencePack)) {
    try {
      const opExplanation = require('./operationalExplanationService');
      explanationPack = await opExplanation.buildOperationalExplanationPack(user.company_id);
      if (plcIntelligencePack) plcIntelligencePack.explanation_pack = explanationPack;
    } catch (explErr) {
      console.warn('[INDUSTRIAL_TRUTH][explanation]', explErr?.message ?? explErr);
    }
  }

  if (!priorityPack && user?.company_id && (telemetryOnly || plcIntelligencePack)) {
    try {
      const opPriority = require('./operationalPrioritizationService');
      priorityPack = await opPriority.buildOperationalPriorityPack(user.company_id);
      if (plcIntelligencePack) plcIntelligencePack.priority_pack = priorityPack;
    } catch (priErr) {
      console.warn('[INDUSTRIAL_TRUTH][priority]', priErr?.message ?? priErr);
    }
  }

  const evidenceNumbers = collectEvidenceFromContext({
    contextualPack: opts.contextualPack,
    instructions_append: opts.instructions_append,
    kpiLines: opts.kpiLines,
    summaryBlock: opts.summaryBlock,
    evidenceNumbers: opts.evidenceNumbers
  });

  if (telemetryOnly && plcIntelligencePack) {
    try {
      const plcIntel = require('./plcOperationalIntelligenceService');
      const intelPack = {
        ...plcIntelligencePack,
        trend_pack: trendPack || plcIntelligencePack.trend_pack,
        anomaly_pack: anomalyPack || plcIntelligencePack.anomaly_pack,
        correlation_pack: correlationPack || plcIntelligencePack.correlation_pack,
        event_pack: eventPack || plcIntelligencePack.event_pack,
        pattern_pack: patternPack || plcIntelligencePack.pattern_pack,
        explanation_pack: explanationPack || plcIntelligencePack.explanation_pack,
        priority_pack: priorityPack || plcIntelligencePack.priority_pack
      };
      const telemetryEvidence = plcIntel.collectTelemetryEvidenceNumbers(intelPack);
      for (const n of telemetryEvidence) evidenceNumbers.add(n);
      if (opts.instructions_append) {
        for (const t of extractNumericTokens(String(opts.instructions_append))) evidenceNumbers.add(t);
      }
    } catch {
      /* noop */
    }
  }

  if (trendPack) {
    try {
      const plcTrend = require('./plcTrendAnalysisService');
      for (const n of plcTrend.collectTrendEvidenceNumbers(trendPack)) evidenceNumbers.add(n);
    } catch {
      /* noop */
    }
  }

  if (anomalyPack) {
    try {
      const plcAnomaly = require('./plcAnomalyAnalysisService');
      for (const n of plcAnomaly.collectAnomalyEvidenceNumbers(anomalyPack)) evidenceNumbers.add(n);
    } catch {
      /* noop */
    }
  }

  if (correlationPack) {
    try {
      const plcCorr = require('./plcCorrelationAnalysisService');
      for (const n of plcCorr.collectCorrelationEvidenceNumbers(correlationPack)) evidenceNumbers.add(n);
    } catch {
      /* noop */
    }
  }

  if (eventPack) {
    try {
      const opEvents = require('./operationalEventIntelligenceService');
      for (const n of opEvents.collectEventEvidenceNumbers(eventPack)) evidenceNumbers.add(n);
    } catch {
      /* noop */
    }
  }

  if (patternPack) {
    try {
      const opPatterns = require('./operationalPatternIntelligenceService');
      for (const n of opPatterns.collectPatternEvidenceNumbers(patternPack)) evidenceNumbers.add(n);
    } catch {
      /* noop */
    }
  }

  if (explanationPack) {
    try {
      const opExplanation = require('./operationalExplanationService');
      for (const n of opExplanation.collectExplanationEvidenceNumbers(explanationPack)) {
        evidenceNumbers.add(n);
      }
    } catch {
      /* noop */
    }
  }

  if (priorityPack) {
    try {
      const opPriority = require('./operationalPrioritizationService');
      for (const n of opPriority.collectPriorityEvidenceNumbers(priorityPack)) {
        evidenceNumbers.add(n);
      }
    } catch {
      /* noop */
    }
  }

  const hasSnapshotEvidence = evidenceNumbers.size > 0;
  const effectiveHasData = availability.has_any_data || hasSnapshotEvidence;

  const evidence_binding = buildEvidenceBinding(availability, opts.channel, {
    trendPack,
    anomalyPack,
    correlationPack,
    eventPack,
    patternPack,
    hasTrendSnapshot: (trendPack?.trend_snapshot?.equipment?.length ?? 0) > 0,
    hasAnomalySnapshot: (anomalyPack?.anomalies?.length ?? 0) > 0,
    hasCorrelationSnapshot: (correlationPack?.correlation_pairs?.length ?? 0) > 0,
    hasEventSnapshot: (eventPack?.events?.length ?? 0) > 0,
    hasPatternSnapshot: (patternPack?.patterns?.length ?? 0) > 0,
    explanationPack,
    hasExplanationSnapshot: (explanationPack?.explanations?.length ?? 0) > 0,
    priorityPack,
    hasPrioritySnapshot: (priorityPack?.equipment_ranking?.length ?? 0) > 0
  });
  if (hasSnapshotEvidence) {
    evidence_binding.confidence = 'snapshot_backed';
  }

  const operationalQuestion =
    OPERATIONAL_CLAIM_RE.test(String(opts.queryText || '')) ||
    NUMERIC_CLAIM_RE.test(String(opts.queryText || '')) ||
    (injectOperational && hasSnapshotEvidence);

  const assessmentOnly = opts.assessmentOnly === true;

  if (telemetryOnly) {
    const forbiddenKpi = detectForbiddenTelemetryInventedKpis(answer);
    if (forbiddenKpi.length) {
      const result = {
        text: MSG_UNSUPPORTED,
        enforced: true,
        mode,
        action: 'unsupported_claim',
        availability,
        evidence_binding,
        unsupported_claims: forbiddenKpi,
        telemetry_supported_claims: []
      };
      if (mode === 'shadow' || assessmentOnly) {
        result.text = answer;
        result.shadow_would_replace = MSG_UNSUPPORTED;
      }
      _log('forbidden_telemetry_kpi', { channel: opts.channel, company_id: user?.company_id });
      return result;
    }

    const forbiddenPredictive = detectForbiddenPredictiveClaims(answer);
    if (forbiddenPredictive.length) {
      const result = {
        text: MSG_UNSUPPORTED,
        enforced: true,
        mode,
        action: 'unsupported_claim',
        availability,
        evidence_binding,
        unsupported_claims: forbiddenPredictive,
        telemetry_supported_claims: []
      };
      if (mode === 'shadow' || assessmentOnly) {
        result.text = answer;
        result.shadow_would_replace = MSG_UNSUPPORTED;
      }
      _log('forbidden_predictive_claim', { channel: opts.channel, company_id: user?.company_id });
      return result;
    }

    const forbiddenFailure = detectForbiddenFailurePredictionClaims(answer);
    if (forbiddenFailure.length) {
      const result = {
        text: MSG_UNSUPPORTED,
        enforced: true,
        mode,
        action: 'unsupported_claim',
        availability,
        evidence_binding,
        unsupported_claims: forbiddenFailure,
        telemetry_supported_claims: []
      };
      if (mode === 'shadow' || assessmentOnly) {
        result.text = answer;
        result.shadow_would_replace = MSG_UNSUPPORTED;
      }
      _log('forbidden_failure_prediction', { channel: opts.channel, company_id: user?.company_id });
      return result;
    }

    const forbiddenCausality = detectForbiddenCausalityClaims(answer);
    if (forbiddenCausality.length) {
      const result = {
        text: MSG_UNSUPPORTED,
        enforced: true,
        mode,
        action: 'unsupported_claim',
        availability,
        evidence_binding,
        unsupported_claims: forbiddenCausality,
        telemetry_supported_claims: []
      };
      if (mode === 'shadow' || assessmentOnly) {
        result.text = answer;
        result.shadow_would_replace = MSG_UNSUPPORTED;
      }
      _log('forbidden_causality_claim', { channel: opts.channel, company_id: user?.company_id });
      return result;
    }

    const forbiddenEventPred = detectForbiddenEventPredictionClaims(answer);
    if (forbiddenEventPred.length) {
      const result = {
        text: MSG_UNSUPPORTED,
        enforced: true,
        mode,
        action: 'unsupported_claim',
        availability,
        evidence_binding,
        unsupported_claims: forbiddenEventPred,
        telemetry_supported_claims: []
      };
      if (mode === 'shadow' || assessmentOnly) {
        result.text = answer;
        result.shadow_would_replace = MSG_UNSUPPORTED;
      }
      _log('forbidden_event_prediction', { channel: opts.channel, company_id: user?.company_id });
      return result;
    }

    const forbiddenPatternPred = detectForbiddenPatternPredictionClaims(answer);
    if (forbiddenPatternPred.length) {
      const result = {
        text: MSG_UNSUPPORTED,
        enforced: true,
        mode,
        action: 'unsupported_claim',
        availability,
        evidence_binding,
        unsupported_claims: forbiddenPatternPred,
        telemetry_supported_claims: []
      };
      if (mode === 'shadow' || assessmentOnly) {
        result.text = answer;
        result.shadow_would_replace = MSG_UNSUPPORTED;
      }
      _log('forbidden_pattern_prediction', { channel: opts.channel, company_id: user?.company_id });
      return result;
    }

    const forbiddenRootCause = detectForbiddenRootCauseClaims(answer);
    if (forbiddenRootCause.length) {
      const result = {
        text: MSG_UNSUPPORTED,
        enforced: true,
        mode,
        action: 'unsupported_claim',
        availability,
        evidence_binding,
        unsupported_claims: forbiddenRootCause,
        telemetry_supported_claims: []
      };
      if (mode === 'shadow' || assessmentOnly) {
        result.text = answer;
        result.shadow_would_replace = MSG_UNSUPPORTED;
      }
      _log('forbidden_root_cause', { channel: opts.channel, company_id: user?.company_id });
      return result;
    }

    const forbiddenPriorityPred = detectForbiddenPriorityPredictionClaims(answer);
    if (forbiddenPriorityPred.length) {
      const result = {
        text: MSG_UNSUPPORTED,
        enforced: true,
        mode,
        action: 'unsupported_claim',
        availability,
        evidence_binding,
        unsupported_claims: forbiddenPriorityPred,
        telemetry_supported_claims: []
      };
      if (mode === 'shadow' || assessmentOnly) {
        result.text = answer;
        result.shadow_would_replace = MSG_UNSUPPORTED;
      }
      _log('forbidden_priority_prediction', { channel: opts.channel, company_id: user?.company_id });
      return result;
    }
  }

  if (
    operationalQuestion &&
    !effectiveHasData &&
    (OPERATIONAL_CLAIM_RE.test(answer) || NUMERIC_CLAIM_RE.test(answer))
  ) {
    const result = {
      text: MSG_NO_DATA,
      enforced: true,
      mode,
      action: 'replace_no_data',
      availability,
      evidence_binding,
      unsupported_claims: []
    };
    if (mode === 'shadow' || assessmentOnly) {
      result.text = answer;
      result.shadow_would_replace = MSG_NO_DATA;
    }
    _log('no_operational_data', { channel: opts.channel, company_id: user?.company_id });
    return result;
  }

  const telemetrySupportedClaims =
    telemetryOnly && plcIntelligencePack
      ? classifyTelemetrySupportedClaims(answer, plcIntelligencePack)
      : [];

  const trendSupportedClaims =
    trendPack && (trendPack.trend_snapshot?.equipment?.length ?? 0) > 0
      ? classifyTrendSupportedClaims(answer, trendPack)
      : [];

  const anomalySupportedClaims =
    anomalyPack && (anomalyPack.anomalies?.length ?? 0) > 0
      ? classifyAnomalySupportedClaims(answer, anomalyPack)
      : [];

  const correlationSupportedClaims =
    correlationPack && (correlationPack.correlation_pairs?.length ?? 0) > 0
      ? classifyCorrelationSupportedClaims(answer, correlationPack)
      : [];

  const eventSupportedClaims =
    eventPack && (eventPack.events?.length ?? 0) > 0
      ? classifyEventSupportedClaims(answer, eventPack, { queryText: opts.queryText })
      : [];

  const patternSupportedClaims =
    patternPack && (patternPack.patterns?.length ?? 0) > 0
      ? classifyPatternSupportedClaims(answer, patternPack, { queryText: opts.queryText })
      : [];

  const explanationSupportedClaims =
    explanationPack && (explanationPack.explanations?.length ?? 0) > 0
      ? classifyExplanationSupportedClaims(answer, explanationPack, { queryText: opts.queryText })
      : [];

  const prioritySupportedClaims =
    priorityPack && (priorityPack.equipment_ranking?.length ?? 0) > 0
      ? classifyPrioritySupportedClaims(answer, priorityPack, { queryText: opts.queryText })
      : [];

  const unsupported = detectUnsupportedClaims(answer, evidenceNumbers, {
    requireEvidenceForNumeric: effectiveHasData && !telemetryOnly,
    telemetryOnly
  });

  if (
    unsupported.length &&
    telemetryOnly &&
    (telemetrySupportedClaims.length > 0 ||
      trendSupportedClaims.length > 0 ||
      anomalySupportedClaims.length > 0 ||
      correlationSupportedClaims.length > 0 ||
      eventSupportedClaims.length > 0 ||
      patternSupportedClaims.length > 0 ||
      explanationSupportedClaims.length > 0 ||
      prioritySupportedClaims.length > 0)
  ) {
    const onlyNumeric =
      unsupported.every((c) =>
        ['numeric_without_evidence', 'ungrounded_metric', 'ungrounded_metrics'].includes(c.type)
      );
    if (
      onlyNumeric &&
      (telemetrySupportedClaims.length >= 1 ||
        trendSupportedClaims.length >= 1 ||
        anomalySupportedClaims.length >= 1 ||
        correlationSupportedClaims.length >= 1 ||
        eventSupportedClaims.length >= 1 ||
        patternSupportedClaims.length >= 1 ||
        explanationSupportedClaims.length >= 1 ||
        prioritySupportedClaims.length >= 1)
    ) {
      unsupported.length = 0;
    }
  }

  if (unsupported.length) {
    const result = {
      text: MSG_UNSUPPORTED,
      enforced: true,
      mode,
      action: 'unsupported_claim',
      availability,
      evidence_binding,
      unsupported_claims: unsupported
    };
    if (mode === 'shadow' || assessmentOnly) {
      result.text = answer;
      result.shadow_would_replace = MSG_UNSUPPORTED;
    }
    _log('unsupported_claim', {
      channel: opts.channel,
      company_id: user?.company_id,
      claims: unsupported.map((c) => c.type)
    });
    return result;
  }

  if (telemetrySupportedClaims.length && evidence_binding) {
    evidence_binding.telemetry_supported_claims = telemetrySupportedClaims.map((c) => c.type);
  }
  if (trendSupportedClaims.length && evidence_binding) {
    evidence_binding.trend_supported_claims = trendSupportedClaims.map((c) => c.type);
    if (!evidence_binding.claim_categories) evidence_binding.claim_categories = [];
    if (!evidence_binding.claim_categories.includes('trend_supported_claim')) {
      evidence_binding.claim_categories.push('trend_supported_claim');
    }
  }
  if (anomalySupportedClaims.length && evidence_binding) {
    evidence_binding.anomaly_supported_claims = anomalySupportedClaims.map((c) => c.type);
    if (!evidence_binding.claim_categories) evidence_binding.claim_categories = [];
    if (!evidence_binding.claim_categories.includes('anomaly_supported_claim')) {
      evidence_binding.claim_categories.push('anomaly_supported_claim');
    }
  }
  if (correlationSupportedClaims.length && evidence_binding) {
    evidence_binding.correlation_supported_claims = correlationSupportedClaims.map((c) => c.type);
    if (!evidence_binding.claim_categories) evidence_binding.claim_categories = [];
    if (!evidence_binding.claim_categories.includes('correlation_supported_claim')) {
      evidence_binding.claim_categories.push('correlation_supported_claim');
    }
  }
  if (eventSupportedClaims.length && evidence_binding) {
    evidence_binding.event_supported_claims = eventSupportedClaims.map((c) => c.type);
    if (!evidence_binding.claim_categories) evidence_binding.claim_categories = [];
    if (!evidence_binding.claim_categories.includes('event_supported_claim')) {
      evidence_binding.claim_categories.push('event_supported_claim');
    }
  }
  if (patternSupportedClaims.length && evidence_binding) {
    evidence_binding.pattern_supported_claims = patternSupportedClaims.map((c) => c.type);
    if (!evidence_binding.claim_categories) evidence_binding.claim_categories = [];
    if (!evidence_binding.claim_categories.includes('pattern_supported_claim')) {
      evidence_binding.claim_categories.push('pattern_supported_claim');
    }
  }
  if (explanationSupportedClaims.length && evidence_binding) {
    evidence_binding.explanation_supported_claims = explanationSupportedClaims.map((c) => c.type);
    if (!evidence_binding.claim_categories) evidence_binding.claim_categories = [];
    if (!evidence_binding.claim_categories.includes('explanation_supported_claim')) {
      evidence_binding.claim_categories.push('explanation_supported_claim');
    }
  }
  if (prioritySupportedClaims.length && evidence_binding) {
    evidence_binding.priority_supported_claims = prioritySupportedClaims.map((c) => c.type);
    if (!evidence_binding.claim_categories) evidence_binding.claim_categories = [];
    if (!evidence_binding.claim_categories.includes('priority_supported_claim')) {
      evidence_binding.claim_categories.push('priority_supported_claim');
    }
  }

  return {
    text: answer,
    enforced: true,
    mode,
    action: 'pass',
    availability,
    evidence_binding,
    unsupported_claims: [],
    telemetry_supported_claims: telemetrySupportedClaims,
    trend_supported_claims: trendSupportedClaims,
    anomaly_supported_claims: anomalySupportedClaims,
    correlation_supported_claims: correlationSupportedClaims,
    event_supported_claims: eventSupportedClaims,
    pattern_supported_claims: patternSupportedClaims,
    explanation_supported_claims: explanationSupportedClaims,
    priority_supported_claims: prioritySupportedClaims
  };
}

/**
 * Avaliação shadow — não altera texto entregue; usada em voz (Anam/Realtime).
 */
async function shadowAssessTextResponse(text, opts = {}) {
  const answer = String(text || '');
  if (!answer.trim()) {
    return {
      would_replace: false,
      would_block: false,
      would_replace_text: null,
      confidence: 1,
      action: 'empty',
      evidence_binding: null
    };
  }

  const r = await enforceTextResponse(answer, { ...opts, assessmentOnly: true });
  const wouldReplace = Boolean(r.shadow_would_replace);
  const wouldBlock = r.action === 'replace_no_data' || r.action === 'unsupported_claim';

  let confidence = 0.72;
  if (r.action === 'pass') {
    confidence =
      r.evidence_binding?.confidence === 'snapshot_backed' ? 0.88 : 0.76;
  } else if (r.action === 'replace_no_data') {
    confidence = 0.28;
  } else if (r.action === 'unsupported_claim') {
    confidence = 0.41;
  }

  return {
    would_replace: wouldReplace,
    would_block: wouldBlock,
    would_replace_text: r.shadow_would_replace || null,
    confidence: Number(confidence.toFixed(3)),
    action: r.action,
    mode: r.mode,
    evidence_binding: r.evidence_binding,
    unsupported_claims: r.unsupported_claims || [],
    availability_summary: r.availability
      ? {
          has_any_data: r.availability.has_any_data,
          data_state: r.availability.data_state
        }
      : null
  };
}

/**
 * Chart / PDF / KPI guard para Smart Panel e exportações similares.
 */
function guardPanelVisualizationPayload(payload, availability = {}) {
  if (!isEnabled() || getMode() === 'off') {
    return { ...payload, truth_guard: { applied: false } };
  }

  const type = String(payload?.type || '');
  const wantsChart = type === 'chart' || type === 'mixed';
  const wantsKpi = type === 'kpi_cards' || type === 'indicator';

  const barData = payload?.barData || payload?.chartData || [];
  const numericValues = (Array.isArray(barData) ? barData : []).map((b) =>
    Number(b?.valor ?? b?.value ?? 0)
  );
  const hasPositive = numericValues.some((v) => Number.isFinite(v) && v > 0);
  const hasData =
    availability.has_any_data !== false &&
    (hasPositive || availability.has_any_data || availability.has_snapshot_evidence);

  if ((wantsChart || wantsKpi) && !hasData) {
    const guarded = {
      ...payload,
      type: 'report',
      chartData: [],
      barData: [],
      trendData: null,
      indicators: [],
      truth_guard: {
        applied: true,
        action: 'chart_downgrade',
        reason: 'no_operational_chart_data',
        message: MSG_CHART_NO_DATA
      },
      reportContent: `${String(payload.reportContent || '').trim()}\n\n**${MSG_CHART_NO_DATA}**`.trim()
    };
    if (getMode() === 'shadow') {
      return {
        ...payload,
        truth_guard: {
          applied: true,
          mode: 'shadow',
          shadow_would_downgrade: true,
          reason: 'no_operational_chart_data'
        }
      };
    }
    _log('chart_guard', { title: payload?.title, has_any_data: availability.has_any_data });
    return guarded;
  }

  return {
    ...payload,
    truth_guard: {
      applied: true,
      action: 'pass',
      has_operational_chart_data: hasData
    }
  };
}

/**
 * Painel Claude (chart | kpi | table) — mesma política que Smart Panel.
 */
function guardClaudePanelPayload(panel = {}, availability = {}) {
  if (!panel || panel.shouldRender === false) {
    return { panel, truth_guard: { applied: false, reason: 'no_render' } };
  }
  if (!isEnabled() || getMode() === 'off') {
    return { panel, truth_guard: { applied: false } };
  }

  const type = String(panel.type || '').toLowerCase();
  const output = panel.output && typeof panel.output === 'object' ? panel.output : {};
  const hasAnyData =
    availability.has_any_data === true || availability.has_snapshot_evidence === true;

  if (type === 'chart') {
    const datasets = Array.isArray(output.datasets) ? output.datasets : [];
    const numericValues = datasets.flatMap((d) =>
      (Array.isArray(d.data) ? d.data : []).map((n) => Number(n))
    );
    const hasPositive = numericValues.some((v) => Number.isFinite(v) && v > 0);
    if (!hasAnyData && !hasPositive) {
      const downgraded = {
        shouldRender: true,
        type: 'alert',
        title: String(panel.title || 'Painel').slice(0, 160),
        description: MSG_CHART_NO_DATA,
        output: {
          items: [
            {
              level: 'info',
              message: MSG_CHART_NO_DATA
            }
          ]
        },
        truth_guard: {
          applied: true,
          action: 'chart_downgrade',
          reason: 'no_operational_chart_data',
          channel: 'claude_panel'
        }
      };
      if (getMode() === 'shadow') {
        return {
          panel: { ...panel, truth_guard: { applied: true, mode: 'shadow', shadow_would_downgrade: true } },
          truth_guard: { applied: true, mode: 'shadow', shadow_would_downgrade: true }
        };
      }
      _log('claude_panel_chart_guard', { title: panel.title });
      return { panel: downgraded, truth_guard: downgraded.truth_guard };
    }
  }

  if (type === 'kpi') {
    const cards = Array.isArray(output.cards) ? output.cards : [];
    const hasNumericKpi = cards.some((c) => {
      const v = String(c?.value ?? '').replace(/[^\d.,]/g, '');
      const n = Number(String(v).replace(',', '.'));
      return Number.isFinite(n) && n > 0;
    });
    if (!hasAnyData && hasNumericKpi) {
      const downgraded = {
        shouldRender: true,
        type: 'alert',
        title: String(panel.title || 'KPI').slice(0, 160),
        description: MSG_CHART_NO_DATA,
        output: {
          items: [{ level: 'info', message: MSG_CHART_NO_DATA }]
        },
        truth_guard: {
          applied: true,
          action: 'kpi_downgrade',
          reason: 'no_operational_kpi_data',
          channel: 'claude_panel'
        }
      };
      if (getMode() === 'shadow') {
        return {
          panel: { ...panel, truth_guard: { applied: true, mode: 'shadow', shadow_would_downgrade: true } },
          truth_guard: { applied: true, mode: 'shadow', shadow_would_downgrade: true }
        };
      }
      _log('claude_panel_kpi_guard', { title: panel.title });
      return { panel: downgraded, truth_guard: downgraded.truth_guard };
    }
  }

  return {
    panel: {
      ...panel,
      truth_guard: { applied: true, action: 'pass', channel: 'claude_panel', has_operational_data: hasAnyData }
    },
    truth_guard: { applied: true, action: 'pass', channel: 'claude_panel' }
  };
}

/** Bloco de regras para system prompt (Anam / Realtime). */
function buildPromptTruthAppendix() {
  if (!isEnabled()) return '';
  return [
    '## Industrial Truth Enforcement (IMPETUS)',
    '- NUNCA invente KPIs, percentagens, volumes de produção, OEE, perdas ou métricas de segurança/manutenção.',
    '- Use APENAS números presentes no snapshot autorizado desta sessão.',
    '- Se não houver dados no snapshot para o período/domínio pedido, responda exatamente:',
    `  «${MSG_NO_DATA}»`,
    '- Não gere descrições de gráficos com valores fictícios.',
    '- Se não puder afirmar com evidência do snapshot, indique lacuna em vez de estimar.'
  ].join('\n');
}

function getDiagnostics() {
  return {
    enabled: isEnabled(),
    mode: getMode(),
    layer: LAYER,
    messages: {
      no_data: MSG_NO_DATA,
      unsupported: MSG_UNSUPPORTED,
      chart_no_data: MSG_CHART_NO_DATA
    }
  };
}

module.exports = {
  hasOperationalData,
  checkOperationalAvailability,
  detectUnsupportedClaims,
  detectForbiddenTelemetryInventedKpis,
  detectForbiddenPredictiveClaims,
  detectForbiddenFailurePredictionClaims,
  detectForbiddenCausalityClaims,
  classifyTelemetrySupportedClaims,
  classifyTrendSupportedClaims,
  classifyAnomalySupportedClaims,
  classifyCorrelationSupportedClaims,
  detectForbiddenEventPredictionClaims,
  classifyEventSupportedClaims,
  detectForbiddenPatternPredictionClaims,
  classifyPatternSupportedClaims,
  detectForbiddenRootCauseClaims,
  classifyExplanationSupportedClaims,
  detectForbiddenPriorityPredictionClaims,
  classifyPrioritySupportedClaims,
  enforceTextResponse,
  isConversationalTurn,
  shadowAssessTextResponse,
  guardPanelVisualizationPayload,
  guardClaudePanelPayload,
  buildPromptTruthAppendix,
  collectEvidenceFromContext,
  buildEvidenceBinding,
  getDiagnostics,
  MSG_NO_DATA,
  MSG_UNSUPPORTED,
  MSG_CHART_NO_DATA,
  FORBIDDEN_TELEMETRY_INVENTED_KPI_RE,
  FORBIDDEN_PREDICTIVE_CLAIM_RE,
  FORBIDDEN_FAILURE_PREDICTION_CLAIM_RE,
  TELEMETRY_SUPPORTED_CLAIM_RE,
  TREND_SUPPORTED_CLAIM_RE,
  ANOMALY_SUPPORTED_CLAIM_RE,
  FORBIDDEN_CAUSALITY_CLAIM_RE,
  CORRELATION_SUPPORTED_CLAIM_RE,
  EVENT_SUPPORTED_CLAIM_RE,
  FORBIDDEN_EVENT_PREDICTION_CLAIM_RE,
  PATTERN_SUPPORTED_CLAIM_RE,
  FORBIDDEN_PATTERN_PREDICTION_CLAIM_RE,
  EXPLANATION_SUPPORTED_CLAIM_RE,
  FORBIDDEN_ROOT_CAUSE_CLAIM_RE,
  PRIORITY_SUPPORTED_CLAIM_RE,
  FORBIDDEN_PRIORITY_PREDICTION_CLAIM_RE
};
