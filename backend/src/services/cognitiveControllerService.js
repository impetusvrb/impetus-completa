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
 * @param {{ skipPromptFirewall?: boolean }} [params.options]
 * @returns {Promise<object>}
 */
async function handleCognitiveRequest({
  user,
  message,
  context: _context,
  cognitiveAttachment,
  cognitiveSnapshot,
  options
} = {}) {
  let councilResult;

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

  const text = message != null ? String(message) : '';
  const skipPromptFirewall = !!(options && options.skipPromptFirewall);

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

    if (cognitiveAttachment != null) {
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
      (options && options.traceId && String(options.traceId)) ||
      (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `tmp-${Date.now()}`);

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

    const rawOpts = options && typeof options === 'object' ? { ...options } : {};
    delete rawOpts.skipPromptFirewall;
    const councilOptions = { ...rawOpts, skipRecursiveUnified: true };
    councilOptions._pipelineGovernance = pipelineGovernance;

    let requestPayloadText = text;
    if (
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
  buildEnvironmentalSyntheticPrompt
};
