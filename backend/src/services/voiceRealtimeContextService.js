/**
 * Contexto para voz OpenAI Realtime: dados internos IMPETUS já filtrados por hierarquia,
 * permissões e Base Estrutural (mesma governança que dashboard chat / Impetus IA).
 */
const hierarchicalFilter = require('./hierarchicalFilter');
const dashboardKPIs = require('./dashboardKPIs');
const dashboardAccessService = require('./dashboardAccessService');
const dashboardComposerService = require('./dashboardComposerService');
const structuralAIGovernance = require('./structuralAIGovernanceService');
const softwareOperationalSnapshotService = require('./softwareOperationalSnapshotService');
const chatContextBridge = require('../runtimeUnification/bridge/chatContextBridge');
const conversationContextEngine = require('../conversationContext/conversationContextEngine');

const MAX_KPI_LINES = 14;
const MAX_INSTRUCTION_CHARS = 14000;

const IMPETUS_NAV_HINT = `IMPETUS — pode mostrar no painel direito qualquer área que o utilizador tenha permissão (telemetria, manutenção, produção, qualidade, ambiente, RH, Pró-Ação, chat, comunicações).
Após acordo, confirme execução no painel (ex.: «gerando a telemetria no painel»). Não peça «onde clicar» para dados que já estão no snapshot.`;

/**
 * @param {object} user req.user (sessão IMPETUS)
 * @param {{ queryText?: string, channel?: string, forceOperationalSnapshot?: boolean, modoApresentacao?: boolean, presentationRequested?: boolean, presentationLevel?: string, executiveBoardroomActive?: boolean, previousProfileId?: string }} [opts]
 * @returns {Promise<{ ok: true, instructions_append: string, fetched_at: string, intent?: string, conversation_context?: object }>}
 */
async function buildVoiceRealtimeContext(user, opts = {}) {
  const queryText = String(opts.queryText || '').trim();
  const channel = String(opts.channel || 'voice_realtime').trim() || 'voice_realtime';
  const forceOperationalSnapshot = opts.forceOperationalSnapshot === true || channel === 'anam_voice';
  const previousProfileId = String(opts.previousProfileId || '').trim() || null;
  const gov = await structuralAIGovernance.buildAIGovernancePackage(user, {
    channel,
    queryText
  });
  const effectiveUser = gov.enrichedUser || user;

  const scope = await hierarchicalFilter.resolveHierarchyScope(effectiveUser).catch(() => null);

  let kpisRaw = [];
  try {
    kpisRaw = await dashboardKPIs.getDashboardKPIs(effectiveUser, scope);
  } catch (_) {
    kpisRaw = [];
  }
  const kpisPersonalized = dashboardComposerService.applyPersonalizationToKpis(kpisRaw, effectiveUser);
  const kpis = dashboardAccessService.getAllowedKpis(effectiveUser, kpisPersonalized).slice(0, MAX_KPI_LINES);

  let summary;
  try {
    summary = await dashboardKPIs.getDashboardSummary(effectiveUser);
  } catch (_) {
    summary = null;
  }

  const kpiLines = kpis.length
    ? kpis
        .map((k) => {
          const title = k.title || k.key || k.id || 'Indicador';
          const val = k.value != null ? String(k.value) : '—';
          return `- ${title}: ${val.slice(0, 96)}`;
        })
        .join('\n')
    : '(nenhum indicador neste snapshot — não inventes valores)';

  const sumLine = summary
    ? [
        'Resumo agregado (já no escopo e permissões deste utilizador):',
        `- Alertas com prioridade crítica (amostra): ${summary.alerts?.critical ?? 0}`,
        `- Interações operacionais (últimos 7 dias): ${summary.operational_interactions?.total ?? 0}`,
        `- Propostas abertas (não concluídas/rejeitadas): ${summary.proposals?.total ?? 0}`,
        `- Insights IA (janela recente): ${summary.ai_insights?.total ?? 0}`
      ].join('\n')
    : 'Resumo agregado indisponível neste momento — não inventes totais.';

  const injectOperational = forceOperationalSnapshot || gov.allow_operational_data;

  let softwareBlock = '';
  let chatBlock = '';
  if (injectOperational) {
    try {
      const bundle = await softwareOperationalSnapshotService.buildSnapshotsForQuery(
        effectiveUser,
        queryText,
        { maxDomains: queryText.length >= 6 ? 4 : 2 }
      );
      softwareBlock = softwareOperationalSnapshotService.formatForAIPrompt(bundle);
    } catch (e) {
      console.warn('[voiceRealtimeContext] software snapshot', e?.message || e);
      softwareBlock = softwareOperationalSnapshotService.formatCatalogBlock(
        softwareOperationalSnapshotService.getSoftwareCatalogForUser(effectiveUser)
      );
    }
    try {
      const unified = await chatContextBridge.resolveChatContextForChannel(
        effectiveUser,
        queryText,
        chatContextBridge.CHANNELS.VOICE,
        { callerHint: 'voice_realtime' }
      );
      chatBlock = (unified.block || '').replace(/^\n+/, '');
      if (unified.source && unified.source !== 'legacy') {
        console.info(
          '[RUNTIME_UNIFICATION_VOICE]',
          JSON.stringify({ source: unified.source, explainability: unified.explainability })
        );
      }
    } catch (e) {
      console.warn('[voiceRealtimeContext] chat context', e?.message || e);
    }
  }

  const dataBlock = injectOperational
    ? [
        'DADOS INTERNOS IMPETUS (snapshot autorizado — USE ESTES NÚMEROS; não diga que não tem acesso ao software):',
        sumLine,
        'Indicadores permitidos ao perfil (amostra):',
        kpiLines,
        '',
        softwareBlock,
        chatBlock ? `\n${chatBlock}` : '',
        '',
        IMPETUS_NAV_HINT
      ].join('\n')
    : [
        'DADOS INTERNOS: não injectados neste turno (pergunta classificada como conhecimento geral).',
        'Podes explicar métodos e boas práticas; não cites KPIs ou estados operacionais desta empresa sem nova pergunta operacional.'
      ].join('\n');

  let truthAppendix = '';
  try {
    const truthEnforcement = require('./industrialTruthEnforcementService');
    truthAppendix = truthEnforcement.buildPromptTruthAppendix();
  } catch (e) {
    console.warn('[voiceRealtimeContext] truth appendix', e?.message || e);
  }

  let conversationContext = null;
  try {
    conversationContext = await conversationContextEngine.resolveConversationContext(user, {
      queryText,
      channel,
      modoApresentacao: opts.modoApresentacao === true,
      presentationRequested: opts.presentationRequested,
      presentationLevel: opts.presentationLevel,
      executiveBoardroomActive: opts.executiveBoardroomActive === true,
      previousProfileId
    });
  } catch (e) {
    console.warn('[voiceRealtimeContext] conversation context', e?.message || e);
  }

  const conversationBlock = conversationContext?.prompt_append
    ? `\n\n${conversationContext.prompt_append}`
    : '';

  const instructions_append = [
    gov.system_append,
    '',
    dataBlock,
    '',
    injectOperational
      ? 'Tens acesso aos dados acima nesta sessão. Não peças ao utilizador "onde clicar" para ver KPIs do snapshot. Se faltar um detalhe específico, diz que não está neste extracto e oferece aprofundar no módulo certo do IMPETUS.'
      : 'Mantém a identidade do utilizador (Base Estrutural) mas responde em modo educativo sem inventar dados do tenant.',
    truthAppendix ? `\n${truthAppendix}` : '',
    conversationBlock
  ].join('\n');

  const trimmed =
    instructions_append.length > MAX_INSTRUCTION_CHARS
      ? `${instructions_append.slice(0, MAX_INSTRUCTION_CHARS)}\n[contexto truncado por limite de tamanho]`
      : instructions_append;

  return {
    ok: true,
    instructions_append: trimmed,
    fetched_at: new Date().toISOString(),
    intent: gov.intent,
    structural_complete: gov.structural_complete,
    conversation_context: conversationContext
      ? {
          context_type: conversationContext.context_type,
          subcontext: conversationContext.subcontext,
          profile_id: conversationContext.profile_id,
          conversation_profile: conversationContext.conversation_profile,
          confidence: conversationContext.confidence,
          signals: conversationContext.signals,
          engine_enabled: conversationContext.engine_enabled,
          presentation_context: conversationContext.presentation_context || null,
          executive_conversation_domain: conversationContext.executive_conversation_domain || null
        }
      : null
  };
}

module.exports = {
  buildVoiceRealtimeContext
};
