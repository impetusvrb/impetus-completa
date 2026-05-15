'use strict';

/**
 * Cognitive Controller — orquestrador externo (firewall opcional + conselho oficial).
 *
 * Não duplica o pipeline de {@link runCognitiveCouncil}; apenas:
 * 1) Prompt firewall opcional (`analyzePrompt`) — desativável quando o adapter HTTP já correu
 * 2) Delegação ao conselho com `data`/`context` vazios por omissão; opcionalmente
 *    `cognitiveAttachment` validado (allowlist) → mapeado em ingresso oficial
 *    + bloco semântico opcional (unidade, janela, as_of) no texto do pedido ao conselho
 * 3) Preservação do envelope do council (trace, explanation_layer, transparência)
 *
 * Não acopla HTTP; `aiComplaintChatBridge` permanece no adapter de rotas.
 *
 * Incidentes: `ai_incidents.trace_id` é NOT NULL com FK para `ai_interaction_traces`.
 * Só se cria incidente com o `trace_id` realmente associado à execução que falhou
 * (devolvido pelo council / envelope). Sem trace → log explícito, sem vincular a
 * outro trace (evita auditoria falsa).
 *
 * Severidade: `aiIncidentService.createIncident` normaliza para o enum da BD
 * (`LOW` | `MEDIUM` | `HIGH` | `CRITICAL`); aqui usa-se `'medium'` por convenção de entrada.
 */

const crypto = require('crypto');
const { analyzePrompt } = require('../middleware/promptFirewall');
const { runCognitiveCouncil } = require('../ai/cognitiveOrchestrator');
const eventPipelineGovernanceService = require('./eventPipelineGovernanceService');
const aiProviderService = require('./aiProviderService');
const aiIncidentService = require('./aiIncidentService');
const {
  buildEnvironmentalAttachmentFromDashboardPack,
  attachmentToCouncilIngress
} = require('./cognitiveAttachmentIngress');
const { formatCognitiveBlock } = require('../cognitive/promptBlock');

const ALLOWED_STRUCTURED_TYPES = ['environmental'];

/**
 * Prompt sintético determinístico para domínio ambiental (structured_input).
 * @param {object} payload
 * @returns {string}
 */
function buildEnvironmentalStructuredSyntheticPrompt(payload) {
  const p = payload && typeof payload === 'object' ? payload : {};
  const m = p.metrics && typeof p.metrics === 'object' ? p.metrics : {};
  const w = m.water_intensity && typeof m.water_intensity === 'object' ? m.water_intensity : {};
  const e = m.energy_intensity && typeof m.energy_intensity === 'object' ? m.energy_intensity : {};
  const r = m.waste_ratio && typeof m.waste_ratio === 'object' ? m.waste_ratio : {};

  return `
Analise o seguinte cenário ambiental industrial.

Consumo de água (intensidade): ${w.value ?? 'N/D'}
Energia (intensidade): ${e.value ?? 'N/D'}
Resíduos (intensidade): ${r.value ?? 'N/D'}

Desvios:
Água: ${w.deviation ?? 'N/D'}
Energia: ${e.deviation ?? 'N/D'}
Resíduos: ${r.deviation ?? 'N/D'}

Contexto:
Janela: ${p.window ?? 'N/D'}
Qualidade dos dados: ${p.data_quality ?? 'N/D'}

Avalie:
- eficiência operacional
- risco ambiental
- possíveis ações
`.trim();
}

/**
 * Texto auxiliar com unidade, janela temporal e referência temporal para o conselho.
 *
 * @param {object} councilData — data já mapeada do attachment (meta, metrics, …)
 * @returns {string}
 */
function buildEnvironmentalSyntheticPrompt(councilData) {
  if (!councilData || typeof councilData !== 'object') return '';
  const meta = councilData.meta && typeof councilData.meta === 'object' ? councilData.meta : {};
  const unitMeta = meta.unit != null && String(meta.unit).trim() !== '' ? String(meta.unit).trim() : '';
  const windowMeta = meta.window != null && String(meta.window).trim() !== '' ? String(meta.window).trim() : '';
  const asOf = meta.as_of != null && String(meta.as_of).trim() !== '' ? String(meta.as_of).trim() : '';

  const metrics =
    councilData.metrics && typeof councilData.metrics === 'object' && !Array.isArray(councilData.metrics)
      ? councilData.metrics
      : {};

  let valueStr = '—';
  let unitForLine = unitMeta;
  let windowForLine = windowMeta;

  const wi = metrics.water_intensity;
  if (wi && typeof wi === 'object') {
    valueStr = wi.value != null ? String(wi.value) : '—';
    if (wi.unit != null && String(wi.unit).trim() !== '') {
      unitForLine = String(wi.unit).trim();
    }
    if (wi.window != null && String(wi.window).trim() !== '') {
      windowForLine = String(wi.window).trim();
    }
  } else {
    const keys = Object.keys(metrics);
    if (keys.length === 1) {
      const m = metrics[keys[0]];
      if (m && typeof m === 'object' && m.value != null) {
        valueStr = String(m.value);
      }
    }
  }

  const consumptionLine =
    `Consumo de água (intensidade): ${valueStr}${unitForLine ? ` ${unitForLine}` : ''}`.trim();

  const completenessRaw =
    typeof meta.completeness === 'number' && Number.isFinite(meta.completeness)
      ? Math.max(0, Math.min(1, meta.completeness))
      : 0;
  const completenessPct = Math.round(completenessRaw * 100);
  const sourceLabel =
    meta.source != null && String(meta.source).trim() !== ''
      ? String(meta.source).trim()
      : 'mixed';

  const lines = [
    consumptionLine,
    `Janela de medição: ${windowForLine || 'não informado'}`,
    `Data de referência: ${asOf || 'não informado'}`,
    `Qualidade dos dados: ${completenessPct}% completos`,
    `Fonte dos dados: ${sourceLabel}`,
    '',
    'Considere que:',
    '- Métricas podem estar em unidades diferentes',
    '- Desvios só são válidos se comparados na mesma janela temporal',
    '- Dados podem estar incompletos',
    '',
    'Avalie com cautela e indique incerteza se necessário.'
  ];

  const hasSignal =
    unitMeta ||
    windowMeta ||
    asOf ||
    (wi && typeof wi === 'object') ||
    Object.keys(metrics).length > 0;
  if (!hasSignal) return '';

  return lines.join('\n');
}

/**
 * @param {object} params
 * @param {{ id: string, company_id: string }} params.user
 * @param {string} params.message
 * @param {object} [params.context] Legado / ignorado (não repassado; usar cognitiveAttachment).
 * @param {{ kind: string, version?: number, payload: object }} [params.cognitiveAttachment]
 *        Anexo server-side validado (ex. kind `environmental`).
 * @param {{ traceId?: string, intent?: string, summary?: string, entities?: any[], confidence?: number, metadata?: object }} [params.cognitiveSnapshot]
 *        Overlay opcional vinda do event-pipeline (`cognitive/cognitiveAttachment`).
 *        Não altera roteamento — apenas prepende um bloco "COGNITIVE ANALYSIS"
 *        ao texto enviado ao conselho, como dica para a IA.
 * @param {{ type: string, payload: object }} [params.structured_input] Domínio cognitivo estruturado (ex.: environmental).
 * @param {{ skipPromptFirewall?: boolean }} [params.options]
 * @returns {Promise<object>}
 */
async function handleCognitiveRequest({
  user,
  message,
  context: _context,
  structured_input: structuredInput,
  cognitiveAttachment,
  cognitiveSnapshot,
  options
} = {}) {
  let councilResult;
  let environmentalStructuredActive = false;

  if (!user || !user.id || !user.company_id) {
    return {
      ok: false,
      trace_id: null,
      error: {
        code: 'INVALID_USER',
        message: 'User inválido ou incompleto',
        stage: 'validation'
      }
    };
  }

  if (structuredInput != null && cognitiveAttachment != null) {
    return {
      ok: false,
      trace_id: null,
      error: {
        code: 'STRUCTURED_INPUT_ATTACHMENT_CONFLICT',
        message: 'Use structured_input ou cognitiveAttachment, não ambos.',
        stage: 'validation'
      }
    };
  }

  if (structuredInput != null) {
    if (!structuredInput.type) {
      return {
        ok: false,
        trace_id: null,
        error: {
          code: 'INVALID_STRUCTURED_INPUT_TYPE',
          message: 'structured_input.type é obrigatório',
          stage: 'validation'
        }
      };
    }
    if (!structuredInput.payload) {
      return {
        ok: false,
        trace_id: null,
        error: {
          code: 'INVALID_STRUCTURED_INPUT_PAYLOAD',
          message: 'structured_input.payload é obrigatório',
          stage: 'validation'
        }
      };
    }
    if (!ALLOWED_STRUCTURED_TYPES.includes(structuredInput.type)) {
      return {
        ok: false,
        trace_id: null,
        error: {
          code: 'STRUCTURED_INPUT_TYPE_NOT_ALLOWED',
          message: `Tipo não permitido: ${String(structuredInput.type)}`,
          stage: 'validation'
        }
      };
    }
    if (structuredInput.type === 'environmental') {
      if (!structuredInput.payload.metrics || typeof structuredInput.payload.metrics !== 'object') {
        return {
          ok: false,
          trace_id: null,
          error: {
            code: 'INVALID_ENVIRONMENTAL_PAYLOAD',
            message: 'payload.metrics é obrigatório para domínio ambiental',
            stage: 'validation'
          }
        };
      }
    }
  }

  const effectiveOptions =
    structuredInput != null
      ? { ...(options && typeof options === 'object' ? options : {}), skipPromptFirewall: true }
      : options && typeof options === 'object'
        ? { ...options }
        : {};

  const text = message != null ? String(message) : '';
  const skipPromptFirewall = !!effectiveOptions.skipPromptFirewall;

  try {
    if (!skipPromptFirewall) {
      const pf = await analyzePrompt(text, user);
      if (pf.allowed === false) {
        return {
          ok: false,
          trace_id: null,
          error: {
            code: 'PROMPT_BLOCKED',
            message: pf.message || pf.reason || 'Prompt bloqueado',
            stage: 'ingress'
          }
        };
      }
    }

    let councilData = {};
    let councilContext;
    let councilModule = 'cognitive_council';
    let useEnvironmentalStructured = false;

    if (structuredInput != null && structuredInput.type === 'environmental') {
      useEnvironmentalStructured = true;
      environmentalStructuredActive = true;
      const payload =
        structuredInput.payload && typeof structuredInput.payload === 'object'
          ? structuredInput.payload
          : {};
      councilData = {
        ...payload,
        kpis: Array.isArray(payload.kpis) ? payload.kpis : [],
        events: Array.isArray(payload.events) ? payload.events : [],
        assets: Array.isArray(payload.assets) ? payload.assets : [],
        contextual_data:
          payload.contextual_data && typeof payload.contextual_data === 'object'
            ? payload.contextual_data
            : {}
      };
      councilContext = {
        module: 'environmental',
        source: 'cognitive_controller_structured_input',
        structured_input_type: 'environmental'
      };
      councilModule = 'environmental';
    } else if (cognitiveAttachment != null) {
      try {
        const mapped = attachmentToCouncilIngress(cognitiveAttachment);
        councilData = mapped.data;
        councilContext = mapped.context;
        councilModule = mapped.module;
      } catch (attErr) {
        return {
          ok: false,
          trace_id: null,
          error: {
            code: attErr && attErr.code ? attErr.code : 'ATTACHMENT_INVALID',
            message:
              attErr && attErr.message
                ? String(attErr.message)
                : 'Anexo cognitivo inválido',
            stage: 'validation'
          }
        };
      }
    }

    const sensorTrace =
      (effectiveOptions && effectiveOptions.traceId && String(effectiveOptions.traceId)) ||
      (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `tmp-${Date.now()}`);

    if (useEnvironmentalStructured) {
      try {
        console.info(
          JSON.stringify({
            event: 'ENVIRONMENTAL_COGNITIVE_REQUEST',
            trace_id: sensorTrace,
            company_id: user.company_id,
            module: 'environmental'
          })
        );
      } catch (_log) {}
    }

    let pipelineSensor = null;
    if (process.env.IMPETUS_PIPELINE_HTTP_SENSOR !== 'false') {
      pipelineSensor = await eventPipelineGovernanceService.runTextSensor(text, {
        traceId: sensorTrace,
        userId: user.id,
        priority: 'medium'
      });
    }

    const controllerIntentLabel = eventPipelineGovernanceService.inferControllerIntentLabel(
      text,
      councilModule
    );
    const pipeIntent = pipelineSensor && pipelineSensor.intent ? String(pipelineSensor.intent) : null;
    const intentConflict = !!(
      pipeIntent &&
      controllerIntentLabel &&
      pipeIntent !== controllerIntentLabel
    );
    eventPipelineGovernanceService.maybeLogDecisionConflict({
      controllerIntent: controllerIntentLabel,
      pipelineIntent: pipeIntent,
      confidence: pipelineSensor && pipelineSensor.confidence,
      traceId: pipelineSensor && pipelineSensor.traceId
    });
    const pipelineGovernance = eventPipelineGovernanceService.evaluateGovernance({
      confidence: pipelineSensor && pipelineSensor.confidence,
      conflict: intentConflict
    });

    const rawOpts = effectiveOptions && typeof effectiveOptions === 'object' ? { ...effectiveOptions } : {};
    delete rawOpts.skipPromptFirewall;
    const councilOptions = { ...rawOpts, skipRecursiveUnified: true };
    councilOptions._pipelineGovernance = pipelineGovernance;

    let requestPayloadText = text;
    if (useEnvironmentalStructured && structuredInput) {
      const syntheticText = buildEnvironmentalStructuredSyntheticPrompt(structuredInput.payload);
      requestPayloadText = text.trim() ? `${text.trim()}\n\n${syntheticText}` : syntheticText;
    } else if (
      cognitiveAttachment != null &&
      councilContext &&
      councilData &&
      typeof councilData === 'object'
    ) {
      const envPrompt = buildEnvironmentalSyntheticPrompt(councilData);
      if (envPrompt) {
        requestPayloadText = `${text}\n\n[Contexto semântico — snapshot ambiental]\n${envPrompt}`;
      }
    }
    if (cognitiveSnapshot && typeof cognitiveSnapshot === 'object') {
      const cogBlock = formatCognitiveBlock(cognitiveSnapshot);
      if (cogBlock) {
        requestPayloadText = `${requestPayloadText}\n\n[Contexto semântico — overlay event-pipeline]\n${cogBlock}`;
      }
    }
    if (pipelineSensor && typeof pipelineSensor === 'object') {
      const sensorBlock = formatCognitiveBlock(pipelineSensor);
      if (sensorBlock) {
        requestPayloadText = `${requestPayloadText}\n\n[Sensor semântico — pipeline interno]\n${sensorBlock}`;
      }
    }

    councilResult = await runCognitiveCouncil({
      user,
      requestText: requestPayloadText,
      input: { text: requestPayloadText },
      data: councilData,
      context: councilContext,
      module: councilModule,
      options: councilOptions
    });

    const trace_id = councilResult.trace_id || councilResult.traceId || null;

    if (useEnvironmentalStructured) {
      try {
        console.info(
          JSON.stringify({
            event: 'ENVIRONMENTAL_COGNITIVE_RESPONSE',
            trace_id,
            company_id: user.company_id,
            module: 'environmental',
            ok: true
          })
        );
      } catch (_log) {}
    }
    const resPart = councilResult.result || {};
    const rawContent =
      resPart.content != null && resPart.content !== '' ? resPart.content : resPart.answer;
    const content =
      typeof rawContent === 'string' ? rawContent : rawContent != null ? String(rawContent) : '';

    let { processing_transparency: processing_transparency } = councilResult;
    if (processing_transparency == null && user.company_id) {
      try {
        processing_transparency = await aiProviderService.getCognitivePipelineDisclosure(
          user.company_id
        );
      } catch (e) {
        console.warn(
          '[cognitiveControllerService][getCognitivePipelineDisclosure]',
          e && e.message ? e.message : e
        );
      }
    }

    try {
      const decisionLabel =
        (resPart && resPart.intent != null && String(resPart.intent)) ||
        (resPart && resPart.decision != null && String(resPart.decision)) ||
        (content ? String(content).slice(0, 160) : 'council_ok');
      eventPipelineGovernanceService.logCognitiveImpact({
        traceId: trace_id,
        companyId: user.company_id,
        userId: user.id,
        decision: decisionLabel,
        pipelineIntent: pipeIntent,
        confidence: pipelineSensor && pipelineSensor.confidence,
        degraded: !!(councilResult.degraded ?? resPart.degraded)
      });
    } catch (_e) {
      /* log não pode derrubar resposta */
    }

    return {
      ok: true,
      trace_id,
      content,
      confidence_score: resPart.confidence_score,
      requires_action: resPart.requires_action,
      degraded: councilResult.degraded ?? councilResult.result?.degraded ?? false,
      explanation_layer: councilResult.explanation_layer,
      processing_transparency
    };
  } catch (err) {
    const trace_id =
      (councilResult && (councilResult.trace_id || councilResult.traceId)) || null;
    const msg = err && err.message ? String(err.message) : String(err);
    if (environmentalStructuredActive) {
      try {
        console.warn(
          JSON.stringify({
            event: 'ENVIRONMENTAL_COGNITIVE_ERROR',
            trace_id,
            company_id: user.company_id,
            module: 'environmental',
            message: msg.slice(0, 500)
          })
        );
      } catch (_log) {}
    }
    console.error('[COGNITIVE_CONTROLLER_ERROR]', msg, err && err.code ? { code: err.code } : {});

    try {
      if (trace_id && user.company_id && user.id) {
        await aiIncidentService.createIncident({
          traceId: trace_id,
          userId: user.id,
          companyId: user.company_id,
          incidentType: 'UNKNOWN',
          userComment: msg.slice(0, 50000),
          severity: 'medium'
        });
      } else {
        console.warn({
          event: 'INCIDENT_SKIPPED_NO_TRACE',
          user_id: user.id,
          company_id: user.company_id,
          error: msg
        });
      }
    } catch (incErr) {
      console.error('[COGNITIVE_CONTROLLER_INCIDENT_FAILED]', incErr && incErr.message, incErr);
    }

    return {
      ok: false,
      trace_id,
      error: {
        code: err && err.code ? err.code : 'COGNITIVE_CONTROLLER_ERROR',
        message: msg,
        stage: 'cognitive'
      }
    };
  }
}

/** @deprecated Preferir handleCognitiveRequest — mesmo contrato. */
const runCognitiveController = handleCognitiveRequest;

module.exports = {
  handleCognitiveRequest,
  runCognitiveController,
  buildEnvironmentalAttachmentFromDashboardPack,
  buildEnvironmentalSyntheticPrompt,
  buildEnvironmentalStructuredSyntheticPrompt,
  ALLOWED_STRUCTURED_TYPES
};
