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
const impetusChatOperationalContextService = require('./impetusChatOperationalContextService');

const MAX_KPI_LINES = 14;
const MAX_INSTRUCTION_CHARS = 14000;

const IMPETUS_NAV_HINT = `IMPETUS — pode mostrar no painel direito qualquer área que o utilizador tenha permissão (telemetria, manutenção, produção, qualidade, ambiente, RH, Pró-Ação, chat, comunicações).
Após acordo, confirme execução no painel (ex.: «gerando a telemetria no painel»). Não peça «onde clicar» para dados que já estão no snapshot.`;

/**
 * @param {object} user req.user (sessão IMPETUS)
 * @param {{ queryText?: string }} [opts]
 * @returns {Promise<{ ok: true, instructions_append: string, fetched_at: string, intent?: string }>}
 */
async function buildVoiceRealtimeContext(user, opts = {}) {
  const queryText = String(opts.queryText || '').trim();
  const channel = String(opts.channel || 'voice_realtime').trim() || 'voice_realtime';
  const forceOperationalSnapshot = opts.forceOperationalSnapshot === true || channel === 'anam_voice';
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
    if (impetusChatOperationalContextService.userHasChatAccess(effectiveUser)) {
      try {
        const chatCtx = await impetusChatOperationalContextService.buildChatOperationalContext(
          effectiveUser,
          queryText
        );
        chatBlock = impetusChatOperationalContextService.formatForVoiceAppend(chatCtx);
      } catch (e) {
        console.warn('[voiceRealtimeContext] chat context', e?.message || e);
      }
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

  const instructions_append = [
    gov.system_append,
    '',
    dataBlock,
    '',
    injectOperational
      ? 'Tens acesso aos dados acima nesta sessão. Não peças ao utilizador "onde clicar" para ver KPIs do snapshot. Se faltar um detalhe específico, diz que não está neste extracto e oferece aprofundar no módulo certo do IMPETUS.'
      : 'Mantém a identidade do utilizador (Base Estrutural) mas responde em modo educativo sem inventar dados do tenant.'
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
    structural_complete: gov.structural_complete
  };
}

module.exports = {
  buildVoiceRealtimeContext
};
