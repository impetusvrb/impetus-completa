'use strict';

/**
 * Conselho Cognitivo IMPETUS — orquestrador central.
 *
 * Princípios:
 * - Sem conversação livre entre modelos; apenas dossiê compartilhado + etapas ordenadas.
 * - Papéis fixos: Gemini (percepção), Claude (análise profunda), GPT (interface final).
 * - Auditoria em ai_decision_logs; HITL em cognitive_hitl_feedback.
 * - Nenhuma IA invoca outra: só o backend encadeia chamadas com estado explícito.
 */

const { v4: uuidv4 } = require('uuid');
const geminiService = require('../services/geminiService');
const claudeService = require('../services/claudeService');
const ai = require('../services/ai');
const { PIPELINE_VERSION, Provider, AI_ROLES, INTENT } = require('./aiRoles');
const {
  createEmptyDossier,
  recordStage,
  redactForPersistence,
  seedLayerInput,
  finalizeLayerFinal,
  sanitizeLayersForHttpResponse
} = require('./cognitiveDossier');
const {
  buildUserScope,
  assertSameCompany,
  sanitizeTextInput,
  normalizeImageList,
  assessHeuristicRisk,
  shouldRequireCrossValidation,
  shouldForceHumanValidation
} = require('./cognitiveSecurity');
const { synthesize, extractJsonBlock } = require('./responseSynthesizer');
const cognitiveAudit = require('./cognitiveAudit');

const PERCEPTION_IMAGE_PROMPT = `Você é o módulo de PERCEPÇÃO industrial (somente observação factual).
Analise a imagem e responda SOMENTE JSON válido com esta forma:
{
  "contexto": "descrição do cenário visível",
  "anomalias": ["possíveis anomalias observáveis"],
  "entidades_relevantes": [{"tipo":"ativo|processo|sensor|pessoa|outro","ref":""}],
  "resumo_objetivo": "síntese curta sem decisão executiva",
  "objetos": ["..."],
  "texto_visivel": "",
  "condicao_aparente": "normal|desgaste|folga|corrosao|vazamento|nao_determinado",
  "cores_predominantes": [],
  "observacoes_seguranca": [],
  "confianca_percep": "baixa|media|alta"
}
Sem recomendações finais ou decisões operacionais.`;

const PERCEPTION_TEXT_PROMPT = `Você é o módulo de PERCEPÇÃO industrial (somente observação factual).
Com base no pedido e nos dados estruturados fornecidos, responda SOMENTE JSON válido:
{
  "contexto": "enquadramento operacional do pedido",
  "anomalias": ["sinais ou desvios mencionados ou inferíveis sem inventar sensores"],
  "entidades_relevantes": [{"tipo":"ativo|processo|sensor|linha|outro","ref":""}],
  "resumo_objetivo": "síntese objetiva sem decisão executiva"
}
Não invente leituras de sensor; use apenas o que estiver no texto/dados.`;

const TECHNICAL_SYSTEM = `Você é o motor ANALÍTICO IMPETUS (${AI_ROLES.CLAUDE}).
REGRAS: NÃO escreva mensagem ao usuário final. Consuma apenas a percepção estruturada e os dados do dossiê.
Retorne APENAS JSON válido:
{
  "diagnostico_tecnico": "texto objetivo",
  "causa_provavel": "hipótese principal",
  "impacto": "operacional|segurança|qualidade|custo — descrever",
  "recomendacao_tecnica": "recomendação técnica (não é mensagem final ao usuário)",
  "technical_analysis": "texto técnico (compatibilidade)",
  "hypotheses": [{"titulo":"","probabilidade":"baixa|media|alta","fundamento":""}],
  "risks": [{"descricao":"","severidade":"baixa|media|alta|critica"}],
  "requires_human_validation": true
}`;

const CROSS_VALIDATION_SYSTEM = `Você valida coerência entre rascunho operacional interno e análise técnica.
Retorne APENAS JSON:
{"aligned":boolean,"inconsistencias":[],"ajustes_sugeridos":[],"gaps":[],"severity":"low|medium|high","notes":""}`;

/**
 * Normaliza entradas legadas (requestText + data) e o contrato novo (input + context).
 */
function normalizeRunInput(params) {
  const {
    user,
    requestText,
    input,
    data = {},
    context = {},
    module,
    options
  } = params;
  const textFromInput =
    input && typeof input === 'object' && input.text != null
      ? String(input.text).trim()
      : '';
  const textLegacy =
    requestText != null && String(requestText).trim() !== ''
      ? String(requestText).trim()
      : '';
  const merged = textFromInput || textLegacy;
  const ctx = context && typeof context === 'object' ? context : {};
  const baseData = data && typeof data === 'object' ? data : {};
  const mergedData = {
    ...baseData,
    kpis: Array.isArray(ctx.kpis)
      ? ctx.kpis
      : Array.isArray(baseData.kpis)
        ? baseData.kpis
        : [],
    events: Array.isArray(ctx.events)
      ? ctx.events
      : Array.isArray(baseData.events)
        ? baseData.events
        : [],
    assets: Array.isArray(ctx.assets)
      ? ctx.assets
      : Array.isArray(baseData.assets)
        ? baseData.assets
        : [],
    documents: Array.isArray(ctx.documents)
      ? ctx.documents
      : Array.isArray(baseData.documents)
        ? baseData.documents
        : [],
    images: Array.isArray(ctx.images)
      ? ctx.images
      : Array.isArray(baseData.images)
        ? baseData.images
        : [],
    sensors:
      ctx.sensors && typeof ctx.sensors === 'object'
        ? ctx.sensors
        : baseData.sensors && typeof baseData.sensors === 'object'
          ? baseData.sensors
          : {},
    extras: {
      ...(baseData.extras || {}),
      ...(ctx.extras && typeof ctx.extras === 'object' ? ctx.extras : {}),
      dashboards: ctx.dashboards != null ? ctx.dashboards : baseData.extras?.dashboards,
      chat_interno:
        ctx.chat_interno != null ? ctx.chat_interno : baseData.extras?.chat_interno,
      manuais: ctx.manuais != null ? ctx.manuais : baseData.extras?.manuais,
      historico: ctx.historico != null ? ctx.historico : baseData.extras?.historico
    }
  };
  return {
    user,
    requestText: merged,
    data: mergedData,
    module: module || 'cognitive_council',
    options: options && typeof options === 'object' ? options : {}
  };
}

function mergePerceptionStructured(parsed, fallbackSummary) {
  const p = parsed && typeof parsed === 'object' ? parsed : {};
  return {
    contexto: String(p.contexto || p.context || fallbackSummary || '').slice(0, 12000),
    anomalias: Array.isArray(p.anomalias) ? p.anomalias.slice(0, 50) : [],
    entidades_relevantes: Array.isArray(p.entidades_relevantes)
      ? p.entidades_relevantes.slice(0, 40)
      : [],
    resumo_objetivo: String(p.resumo_objetivo || p.resumo || fallbackSummary || '').slice(
      0,
      8000
    )
  };
}

function classifyIntent(request, dossier) {
  const req = (request || '').toLowerCase();
  const hasImages = (dossier?.data?.images?.length || 0) > 0;
  if (hasImages) return INTENT.ANALISE_MULTIMODAL;

  const nKpi = dossier?.data?.kpis?.length || 0;
  const nEv = dossier?.data?.events?.length || 0;
  if (
    nKpi + nEv > 3 &&
    (req.includes('indicador') || req.includes('kpi') || req.includes('dashboard'))
  ) {
    return INTENT.CONSULTA_DADOS;
  }

  const diagKw = [
    'falha',
    'parada',
    'alarme',
    'diagnostic',
    'manuten',
    'sensor',
    'vibra',
    'óleo',
    'oleo',
    'os ',
    'ordem'
  ];
  if (diagKw.some((k) => req.includes(k))) return INTENT.DIAGNOSTICO_OPERACIONAL;

  return INTENT.GENERICO_ASSISTIDO;
}

function mergeLimitations(arr, msg) {
  if (msg && !arr.includes(msg)) arr.push(msg);
}

async function stagePerception(dossier, billing, limitations) {
  const images = normalizeImageList(dossier.data.images);
  dossier.data.images = images;

  const dataHint = JSON.stringify({
    kpis: dossier.data.kpis,
    events: dossier.data.events,
    assets: dossier.data.assets,
    sensors: dossier.data.sensors
  }).slice(0, 12000);

  if (!images.length) {
    if (geminiService.isAvailable()) {
      const prompt = `${PERCEPTION_TEXT_PROMPT}\n\nPEDIDO:\n${dossier.context.request.slice(0, 8000)}\n\nDADOS:\n${dataHint}`;
      const txt = await geminiService.generateText(prompt, {});
      let parsed = extractJsonBlock(txt);
      if (!parsed && txt && txt.trim().startsWith('{')) {
        try {
          parsed = JSON.parse(txt);
        } catch {
          parsed = null;
        }
      }
      const structured = mergePerceptionStructured(parsed, txt || dossier.context.request);
      dossier.analysis.perception_structured = structured;
      dossier.analysis.perception = {
        mode: 'text_only_gemini',
        summary: structured.resumo_objetivo,
        structured
      };
      dossier.layers.perception = { ...structured, modo: 'texto_gemini' };
      recordStage(dossier, {
        stage: 'perception',
        provider: Provider.GEMINI,
        model_hint: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        summary: 'Percepção textual estruturada (Gemini).'
      });
      return;
    }
    const fb = sanitizeTextInput(dossier.context.request).slice(0, 4000);
    const structured = mergePerceptionStructured(null, fb);
    dossier.analysis.perception_structured = structured;
    dossier.analysis.perception = { mode: 'text_only_fallback', summary: fb, structured };
    dossier.layers.perception = { ...structured, modo: 'fallback' };
    dossier.meta.degraded = true;
    mergeLimitations(limitations, 'Gemini indisponível — percepção textual reduzida.');
    recordStage(dossier, {
      stage: 'perception',
      provider: 'none',
      summary: 'Percepção degradada (sem Gemini).'
    });
    return;
  }

  if (!geminiService.isAvailable()) {
    dossier.analysis.perception = {
      mode: 'degraded',
      summary: 'Imagens recebidas mas Gemini não configurado — percepção não executada.'
    };
    dossier.analysis.perception_structured = mergePerceptionStructured(
      null,
      dossier.analysis.perception.summary
    );
    dossier.layers.perception = { ...dossier.analysis.perception_structured, modo: 'degraded' };
    dossier.meta.degraded = true;
    mergeLimitations(limitations, 'GEMINI/GOOGLE_API_KEY ausente — etapa de visão ignorada.');
    recordStage(dossier, {
      stage: 'perception',
      provider: 'none',
      summary: 'Gemini indisponível.'
    });
    return;
  }

  const chunks = [];
  const maxFrames = Math.min(images.length, 3);
  for (let i = 0; i < maxFrames; i++) {
    const img = images[i];
    const b64 = typeof img === 'string' ? img : img.base64;
    const mime = typeof img === 'object' && img.mime ? img.mime : 'image/jpeg';
    const raw = await geminiService.analyzeImage(b64, PERCEPTION_IMAGE_PROMPT, mime);
    chunks.push({ frame: i + 1, raw });
  }
  const consolidated = chunks.map((c) => c.raw).join('\n---\n').slice(0, 12000);
  let parsed = extractJsonBlock(consolidated);
  if (!parsed && chunks[0]?.raw) parsed = extractJsonBlock(chunks[0].raw);
  const structured = mergePerceptionStructured(parsed, consolidated);
  dossier.analysis.perception_structured = structured;
  dossier.analysis.perception = {
    mode: 'multimodal_gemini',
    frames: chunks,
    consolidated,
    structured
  };
  dossier.layers.perception = { ...structured, modo: 'multimodal_gemini', frames: maxFrames };
  recordStage(dossier, {
    stage: 'perception',
    provider: Provider.GEMINI,
    model_hint: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    summary: `Análise visual ${maxFrames} frame(s).`
  });
}

async function stageTechnical(dossier, limitations) {
  const perceptionBlock = JSON.stringify(
    dossier.analysis.perception_structured || dossier.analysis.perception || {}
  ).slice(0, 12000);
  const dataBlock = JSON.stringify({
    kpis: dossier.data.kpis,
    events: dossier.data.events,
    assets: dossier.data.assets,
    sensors: dossier.data.sensors,
    documents: dossier.data.documents?.length || 0
  }).slice(0, 14000);

  const userContent = `INTENÇÃO: ${dossier.context.intent}
PEDIDO DO USUÁRIO:
${dossier.context.request}

PERCEPÇÃO ESTRUTURADA (interno):
${perceptionBlock}

DADOS ESTRUTURADOS (interno):
${dataBlock}
`;

  if (!claudeService.analyze) {
    dossier.meta.degraded = true;
    mergeLimitations(limitations, 'Claude indisponível no serviço.');
    return;
  }

  const raw = await claudeService.analyze(TECHNICAL_SYSTEM, userContent, {
    max_tokens: 4096,
    timeout: 55000
  });

  if (!raw) {
    dossier.meta.degraded = true;
    mergeLimitations(limitations, 'Falha na análise técnica (Claude).');
    recordStage(dossier, {
      stage: 'technical_analysis',
      provider: Provider.CLAUDE,
      summary: 'Claude não retornou.'
    });
    return;
  }

  const parsed = extractJsonBlock(raw);
  if (parsed) {
    dossier.analysis.technical_structured = {
      diagnostico_tecnico: parsed.diagnostico_tecnico || parsed.technical_analysis || '',
      causa_provavel: parsed.causa_provavel || '',
      impacto: parsed.impacto || '',
      recomendacao_tecnica: parsed.recomendacao_tecnica || ''
    };
    dossier.layers.technical = { ...dossier.analysis.technical_structured };
    dossier.analysis.technical_analysis =
      parsed.technical_analysis || parsed.diagnostico_tecnico || raw;
    dossier.analysis.hypotheses = Array.isArray(parsed.hypotheses) ? parsed.hypotheses : [];
    dossier.analysis.risks = Array.isArray(parsed.risks) ? parsed.risks : [];
    if (typeof parsed.requires_human_validation === 'boolean') {
      dossier.decision.requires_human_validation = parsed.requires_human_validation;
    }
  } else {
    dossier.analysis.technical_analysis = raw;
    dossier.analysis.technical_structured = {
      diagnostico_tecnico: String(raw).slice(0, 8000),
      causa_provavel: '',
      impacto: '',
      recomendacao_tecnica: ''
    };
    dossier.layers.technical = { ...dossier.analysis.technical_structured, parse_fallback: true };
  }

  recordStage(dossier, {
    stage: 'technical_analysis',
    provider: Provider.CLAUDE,
    model_hint: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    summary: 'Análise técnica estruturada.'
  });
}

async function stageGptDraft(dossier, billing) {
  const sys = `Você gera um RASCUNHO interno (JSON) — NÃO é mensagem ao usuário.
Formato obrigatório JSON:
{"interpretacao_consolidada":"","plano_resposta":{"prioridade":"baixa|media|alta|critica","passos":[]},"prioridade":"baixa|media|alta|critica","bullets":["..."],"acao_sugerida":"","requer_validacao_humana":true}`;

  const usr = `Com base apenas no dossiê abaixo, produza o JSON.
${JSON.stringify({
    intent: dossier.context.intent,
    request: dossier.context.request,
    perception: dossier.analysis.perception_structured || dossier.analysis.perception,
    technical: dossier.analysis.technical_structured,
    technical_legacy: dossier.analysis.technical_analysis,
    hypotheses: dossier.analysis.hypotheses,
    risks: dossier.analysis.risks
}).slice(0, 24000)}`;

  const raw = await ai.chatCompletionMessages(
    [{ role: 'system', content: sys }, { role: 'user', content: usr }],
    {
      max_tokens: 900,
      billing,
      response_format: { type: 'json_object' },
      model: process.env.COGNITIVE_GPT_DRAFT_MODEL || 'gpt-4o-mini'
    }
  );

  if (typeof raw === 'string' && raw.startsWith('FALLBACK')) {
    return null;
  }
  let parsed = extractJsonBlock(raw);
  if (!parsed && typeof raw === 'string' && raw.trim().startsWith('{')) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  dossier.analysis.draft_recommendation = parsed;
  dossier.layers.draft = {
    interno: true,
    etapa: 'rascunho_gpt',
    gerado_em: new Date().toISOString()
  };
  recordStage(dossier, {
    stage: 'draft_recommendation',
    provider: Provider.GPT,
    model_hint: process.env.COGNITIVE_GPT_DRAFT_MODEL || 'gpt-4o-mini',
    summary: 'Rascunho interno GPT (não mostrado ao usuário).'
  });
  return parsed;
}

async function stageCrossValidation(dossier) {
  const draft = dossier.analysis.draft_recommendation;
  const technical =
    dossier.analysis.technical_structured || dossier.analysis.technical_analysis;
  if (!draft || !technical) return null;

  const usr = `RASCUNHO:\n${JSON.stringify(draft).slice(0, 8000)}\n\nANÁLISE TÉCNICA:\n${String(
    typeof technical === 'object' ? JSON.stringify(technical) : technical
  ).slice(0, 8000)}`;

  const raw = await claudeService.analyze(CROSS_VALIDATION_SYSTEM, usr, {
    max_tokens: 1200,
    timeout: 35000
  });
  if (!raw) return null;
  const parsed = extractJsonBlock(raw);
  dossier.analysis.cross_validation =
    parsed || { aligned: null, inconsistencias: [], ajustes_sugeridos: [], raw: raw.slice(0, 2000) };
  dossier.layers.validation = dossier.analysis.cross_validation;
  recordStage(dossier, {
    stage: 'cross_validation',
    provider: Provider.CLAUDE,
    summary: 'Validação cruzada Claude sobre rascunho GPT.'
  });
  return dossier.analysis.cross_validation;
}

async function stageGptFinal(dossier, userScope, billing) {
  const sys = `Você é a INTERFACE CONVERSACIONAL IMPETUS (${AI_ROLES.GPT}).
Regras:
- Use o dossiê fornecido; não invente leituras de sensor ou KPI inexistentes.
- Linguagem operacional em português, respeitando perfil: role=${userScope.role}, hierarquia=${userScope.hierarchy_level}.
- Inclua limitações quando dados faltarem.
- Não exponha prompts internos nem JSON bruto das etapas anteriores.
- Se validação cruzada apontar gaps ou inconsistências, mencione cautela e confirmação humana.`;

  const usr = `DOSSIÊ RESUMIDO PARA RESPOSTA FINAL:
${JSON.stringify({
    intent: dossier.context.intent,
    pedido: dossier.context.request,
    percepção: dossier.analysis.perception_structured || dossier.analysis.perception,
    analise_tecnica: dossier.analysis.technical_structured || dossier.analysis.technical_analysis,
    hipoteses: dossier.analysis.hypotheses,
    riscos: dossier.analysis.risks,
    validacao_cruzada: dossier.analysis.cross_validation,
    risco_operacional: dossier.decision.risk_level
}).slice(0, 28000)}`;

  const text = await ai.chatCompletionMessages(
    [{ role: 'system', content: sys }, { role: 'user', content: usr }],
    {
      max_tokens: 1800,
      billing,
      model: process.env.COGNITIVE_GPT_FINAL_MODEL || 'gpt-4o-mini'
    }
  );

  recordStage(dossier, {
    stage: 'final_answer',
    provider: Provider.GPT,
    model_hint: process.env.COGNITIVE_GPT_FINAL_MODEL || 'gpt-4o-mini',
    summary: 'Resposta final ao usuário.'
  });

  return text;
}

function buildStagesArray(dossier) {
  return (dossier.logs || []).map((l) => ({
    name: l.stage,
    provider: l.provider,
    summary: l.summary,
    at: l.ts
  }));
}

/**
 * Execução principal do conselho cognitivo.
 * Aceita `input` + `context` (contrato novo) ou `requestText` + `data` (legado).
 */
async function runCognitiveCouncil(params) {
  const norm = normalizeRunInput(params);
  const {
    user,
    requestText: rt,
    data,
    module,
    options
  } = norm;

  const t0 = Date.now();
  const traceId = uuidv4();
  const sanitized = sanitizeTextInput(rt);
  const scope = buildUserScope(user);
  assertSameCompany(user, user.company_id);

  const dossier = createEmptyDossier({
    traceId,
    user: scope,
    context: {
      module,
      request: sanitized,
      intent: null,
      pipeline_version: PIPELINE_VERSION
    },
    data
  });

  dossier.context.intent = classifyIntent(sanitized, dossier);
  seedLayerInput(dossier);

  const limitations = [];

  const risk = assessHeuristicRisk(sanitized, dossier);
  dossier.decision.risk_level = risk;
  dossier.decision.requires_human_validation = shouldForceHumanValidation(risk);

  const billing = user?.company_id
    ? { companyId: user.company_id, userId: user.id }
    : null;

  await stagePerception(dossier, billing, limitations);
  await stageTechnical(dossier, limitations);

  const wantCross = shouldRequireCrossValidation(risk, options);

  const draft = await stageGptDraft(dossier, billing);
  if (!draft) {
    dossier.meta.degraded = true;
    mergeLimitations(limitations, 'Rascunho GPT indisponível — possível falha OpenAI ou fallback.');
  }

  if (wantCross && draft) {
    const cross = await stageCrossValidation(dossier);
    if (!cross) mergeLimitations(limitations, 'Validação cruzada não executada (Claude).');
  }

  let finalText = await stageGptFinal(dossier, scope, billing);
  if (typeof finalText === 'string' && finalText.startsWith('FALLBACK')) {
    dossier.meta.degraded = true;
    mergeLimitations(limitations, finalText);
    finalText =
      'Não foi possível gerar a resposta assistida completa no momento. Utilize os dados já registrados no IMPETUS e envolva seu supervisor técnico.';
  }

  const synthesis = synthesize({
    finalText,
    dossier,
    validation: dossier.analysis.cross_validation,
    modelsUsed: dossier.meta.models_touched,
    degraded: dossier.meta.degraded,
    limitations
  });

  dossier.decision.recommendation = synthesis.answer;
  dossier.decision.confidence = synthesis.confidence;
  finalizeLayerFinal(dossier, { synthesis, finalText });

  const explanationLayer = {
    trace_id: traceId,
    rules_applied: [
      'Pipeline determinístico Gemini → Claude → GPT (rascunho) → validação opcional (Claude) → GPT final',
      `Intent=${dossier.context.intent}`,
      `Cross_validation=${wantCross ? 'requested' : 'skipped'}`,
      `Risk=${risk}`
    ],
    limitations,
    confidence: synthesis.confidence,
    based_on: synthesis.based_on
  };

  const duration = Date.now() - t0;
  const stages = buildStagesArray(dossier);
  const layersPublic = sanitizeLayersForHttpResponse(dossier);

  try {
    await cognitiveAudit.insertDecisionLog({
      trace_id: traceId,
      company_id: user.company_id,
      user_id: user.id,
      pipeline_version: PIPELINE_VERSION,
      module,
      intent: dossier.context.intent,
      risk_level: risk,
      models_used: dossier.meta.models_touched,
      dossier_summary: redactForPersistence(dossier),
      stages_detail: {
        logs: dossier.logs,
        cross_validation: dossier.analysis.cross_validation || null,
        degraded: dossier.meta.degraded,
        layers: layersPublic
      },
      final_output: synthesis,
      explanation_layer: explanationLayer,
      confidence: synthesis.confidence,
      requires_human_validation: dossier.decision.requires_human_validation !== false,
      requires_cross_validation: wantCross,
      degraded_mode: dossier.meta.degraded,
      duration_ms: duration
    });
  } catch (err) {
    console.warn('[COGNITIVE_AUDIT]', err.message);
  }

  const dossierForClient = redactForPersistence(dossier);

  return {
    ok: true,
    traceId,
    trace_id: traceId,
    result: {
      answer: synthesis.answer,
      confidence: synthesis.confidence,
      warnings: synthesis.warnings,
      based_on: synthesis.based_on,
      requires_action: synthesis.requires_action,
      degraded: dossier.meta.degraded,
      explanation: synthesis.explanation
    },
    stages,
    layers: layersPublic,
    dossier: dossierForClient,
    synthesis,
    explanation_layer: explanationLayer,
    duration_ms: duration,
    degraded: dossier.meta.degraded
  };
}

function exampleMaintenancePayload() {
  return {
    input: {
      text:
        'Linha 3 parou com alarme de temperatura no redutor da esteira; cheiro leve de óleo queimado.'
    },
    context: {
      assets: [{ tag: 'EST-03', linha: 'L3' }],
      events: [{ tipo: 'alarme', codigo: 'TMP-HI', timestamp: new Date().toISOString() }],
      kpis: [{ id: 'oee_l3', valor: 0.62 }]
    },
    module: 'manutencao_ia',
    options: { forceCrossValidation: true },
    requestText:
      'Linha 3 parou com alarme de temperatura no redutor da esteira; cheiro leve de óleo queimado.',
    data: {
      assets: [{ tag: 'EST-03', linha: 'L3' }],
      events: [{ tipo: 'alarme', codigo: 'TMP-HI', timestamp: new Date().toISOString() }],
      kpis: [{ id: 'oee_l3', valor: 0.62 }],
      images: []
    }
  };
}

module.exports = {
  runCognitiveCouncil,
  classifyIntent,
  exampleMaintenancePayload,
  normalizeRunInput,
  INTENT
};
