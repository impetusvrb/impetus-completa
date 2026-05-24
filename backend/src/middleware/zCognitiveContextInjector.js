'use strict';

/**
 * zCognitiveContextInjector
 *
 * Middleware / Decorator para o pipeline de chat.
 *
 * Quando SZ2 está em Z_OPERATIONAL_ASSISTIVE ou superior, enriquece
 * o system prompt da IA com:
 *   - Contexto herdado (continuidade)
 *   - Narrativa operacional madura (SZ3)
 *   - Cenário industrial identificado
 *   - Prioridade amadurecida
 *   - PreparedActions disponíveis
 *
 * NUNCA executa acções — apenas enriquece o contexto textual da IA.
 * A IA pode usar estes dados para responder de forma mais contextual.
 *
 * Pattern: Decorator sobre buildDashboardChatPrompt
 */

const coordinator = require('../activation/cognitiveActivationCoordinator');

const ACTIVE_STAGES = new Set([
  'Z_OPERATIONAL_ASSISTIVE',
  'Z_STATEFUL_REASONING',
  'Z_COGNITIVE_SOVEREIGN'
]);

const MATURATION_ACTIVE_STAGES = new Set([
  'CALIBRATION_ACTIVE',
  'ERGONOMICS_ACTIVE',
  'MATURATION_SOVEREIGN'
]);

/**
 * Devolve um bloco de texto para injectar no system prompt.
 * Se SZ2/SZ3 não estiverem activos, devolve ''.
 *
 * @param {object} sz2Payload   — legacyResponse.runtime_z_cognitive_os
 * @param {object} sz3Payload   — legacyResponse.runtime_z_maturation
 * @returns {string}            — bloco a concatenar ao system prompt
 */
function buildCognitiveContextBlock(sz2Payload, sz3Payload) {
  const sz2Stage = process.env.IMPETUS_SZ2_DEFAULT_STAGE || 'Z_COGNITIVE_SHADOW';
  const sz3Stage = process.env.IMPETUS_SZ3_DEFAULT_STAGE || 'OBSERVATION_ONLY';

  if (!ACTIVE_STAGES.has(sz2Stage)) return '';

  const parts = [];

  // ── SZ2: Continuidade de intenção ──────────────────────────────────────
  const inherited = sz2Payload?.continuity?.inherited_context;
  if (inherited?.summary) {
    parts.push(
      `[CONTEXTO_HERDADO] O utilizador está a continuar a partir de: "${String(inherited.summary).slice(0, 200)}".` +
        ` Intenção anterior: ${inherited.intent || 'não determinada'}.` +
        ` Âncoras: ${(inherited.anchors || []).slice(0, 6).join(', ') || 'nenhuma'}.` +
        ` Não peças novamente este contexto — já está disponível.`
    );
  }

  // ── SZ2: Estado operacional ─────────────────────────────────────────────
  const operational = sz2Payload?.context?.operational;
  if (operational?.state && operational.state !== 'idle') {
    parts.push(
      `[ESTADO_OPERACIONAL] Estado actual: ${operational.state}.` +
        ` Incidentes abertos: ${operational.open_incidents || 0} (críticos: ${operational.critical_incidents || 0}).` +
        ` Tarefas abertas: ${operational.open_tasks || 0}.`
    );
  }

  // ── SZ2: Turno e temporal ────────────────────────────────────────────────
  const shift = sz2Payload?.context?.shift;
  const temporal = sz2Payload?.context?.temporal;
  if (shift?.shift_name && temporal?.part_of_day) {
    parts.push(
      `[TURNO] ${shift.shift_name.replace('turno_', 'Turno ')} — período: ${temporal.part_of_day}.` +
        ` Horário comercial: ${temporal.business_hours ? 'sim' : 'não'}.`
    );
  }

  // ── SZ2: Raciocínio e criticidade ───────────────────────────────────────
  const reasoning = sz2Payload?.reasoning;
  if (reasoning?.criticality?.level && reasoning.criticality.level !== 'low') {
    parts.push(
      `[CRITICIDADE] Nível: ${reasoning.criticality.level.toUpperCase()}.` +
        ` Prioridade: ${reasoning?.priority?.tier || 'P4'}.` +
        (reasoning.detected_risks?.length
          ? ` Riscos detectados: ${reasoning.detected_risks.join(', ')}.`
          : '')
    );
  }

  // ── SZ3: Narrativa madura (se SZ3 activo) ───────────────────────────────
  if (MATURATION_ACTIVE_STAGES.has(sz3Stage) && sz3Payload?.mature_narrative?.narrative) {
    parts.push(
      `[NARRATIVA_OPERACIONAL_Z] ${sz3Payload.mature_narrative.narrative}`
    );
  }

  // ── SZ3: Cenário industrial ──────────────────────────────────────────────
  const scenario = sz3Payload?.scenario;
  if (MATURATION_ACTIVE_STAGES.has(sz3Stage) && scenario?.matched && scenario.expected_behaviors?.length) {
    parts.push(
      `[CENÁRIO_INDUSTRIAL] Cenário identificado: ${scenario.scenario.replace(/_/g, ' ')}.` +
        ` Comportamentos esperados: ${scenario.expected_behaviors.slice(0, 3).join('; ')}.` +
        ` Tom de resposta sugerido: ${scenario.response_tone || 'structured'}.`
    );
  }

  // ── SZ2: Acções preparadas ───────────────────────────────────────────────
  const actions = sz2Payload?.actions;
  if (actions?.count > 0) {
    const titles = (actions.actions || [])
      .slice(0, 3)
      .map((a) => a.title || a.kind)
      .filter(Boolean);
    parts.push(
      `[AÇÕES_PREPARADAS] ${actions.count} acção(ões) assistive preparada(s): ${titles.join('; ')}.` +
        ` Nenhuma foi executada — aguardam revisão humana.`
    );
  }

  // ── SZ2: Workflow activo ─────────────────────────────────────────────────
  const workflow = sz2Payload?.continuity?.workflow;
  if (workflow?.has_active_workflow && workflow.active_workflows?.length) {
    const wfSummary = workflow.active_workflows[0]?.summary || 'workflow em curso';
    parts.push(`[WORKFLOW_ACTIVO] "${String(wfSummary).slice(0, 120)}" — estado: ${workflow.active_workflows[0]?.state || 'preparing'}.`);
  }

  if (!parts.length) return '';

  return (
    '\n\n--- CONTEXTO COGNITIVO RUNTIME Z (SZ2/SZ3) ---\n' +
    parts.join('\n') +
    '\n--- FIM CONTEXTO COGNITIVO ---\n'
  );
}

/**
 * Enriquece o sz2 payload com um turn conversacional para futura continuidade.
 * Opt-in — só regista, não bloqueia.
 */
function ingestTurnForContinuity(tenantId, user, message, responseText) {
  if (!ACTIVE_STAGES.has(process.env.IMPETUS_SZ2_DEFAULT_STAGE || '')) return;
  try {
    const facade = require('../runtime-z-cognitive-os/facade/zCognitiveOperatingSystemFacade');
    facade.ingestConversationTurn(tenantId, user, {
      message,
      response: String(responseText || '').slice(0, 500),
      summary: String(message || '').slice(0, 120),
      intent: null,
      conversation_id: `${tenantId}_${Date.now()}`
    });
    coordinator.recordActivation('sz2_cognitive_os');
  } catch (err) {
    coordinator.recordError('sz2_cognitive_os', err, true);
  }
}

/**
 * Aplica SZ2/SZ3 ao contexto de um request de chat.
 * Devolve o bloco de system append cognitivo.
 *
 * @param {object} user
 * @param {string} message
 * @param {object} legacyResponse   — pode ser parcial (só precisa de runtime_z_*)
 * @returns {{ block: string, sz2Active: boolean, sz3Active: boolean }}
 */
function applyCognitiveEnrichment(user, message, legacyResponse = {}) {
  const sz2Stage = process.env.IMPETUS_SZ2_DEFAULT_STAGE || 'Z_COGNITIVE_SHADOW';
  const sz3Stage = process.env.IMPETUS_SZ3_DEFAULT_STAGE || 'OBSERVATION_ONLY';

  const sz2Active = ACTIVE_STAGES.has(sz2Stage);
  const sz3Active = MATURATION_ACTIVE_STAGES.has(sz3Stage);

  if (!sz2Active) {
    return { block: '', sz2Active: false, sz3Active };
  }

  try {
    // Se o payload cognitivo ainda não está calculado (chamada de chat sem /me),
    // calcula-o agora de forma leve
    let sz2Payload = legacyResponse?.runtime_z_cognitive_os || null;
    let sz3Payload = legacyResponse?.runtime_z_maturation || null;

    if (!sz2Payload) {
      const sz2Facade = require('../runtime-z-cognitive-os/facade/zCognitiveOperatingSystemFacade');
      const sz2Out = sz2Facade.applyCognitiveOperatingSystem(user, legacyResponse, {
        tenant_id: user?.company_id,
        profile: user?.role_code || user?.role,
        message
      });
      sz2Payload = sz2Out?.payload?.runtime_z_cognitive_os || null;
    }

    if (!sz3Payload && sz2Payload) {
      const sz3Facade = require('../runtime-z-maturation/facade/zMaturationFacade');
      const sz3Out = sz3Facade.applyMaturation(user, sz2Payload, {
        tenant_id: user?.company_id,
        profile: user?.role_code || user?.role,
        message
      });
      sz3Payload = sz3Out?.payload?.runtime_z_maturation || null;
    }

    const block = buildCognitiveContextBlock(sz2Payload, sz3Payload);
    coordinator.recordActivation('sz2_cognitive_os');
    return { block, sz2Active, sz3Active, sz2Payload, sz3Payload };
  } catch (err) {
    coordinator.recordError('sz2_cognitive_os', err, true);
    return { block: '', sz2Active, sz3Active, error: err?.message };
  }
}

module.exports = {
  buildCognitiveContextBlock,
  applyCognitiveEnrichment,
  ingestTurnForContinuity,
  ACTIVE_STAGES,
  MATURATION_ACTIVE_STAGES
};
