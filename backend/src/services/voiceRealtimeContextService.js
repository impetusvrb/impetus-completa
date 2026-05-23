/**
 * Contexto para voz OpenAI Realtime: dados internos IMPETUS já filtrados por hierarquia,
 * permissões e Base Estrutural (mesma governança que dashboard chat / Impetus IA).
 */
const hierarchicalFilter = require('./hierarchicalFilter');
const dashboardKPIs = require('./dashboardKPIs');
const dashboardAccessService = require('./dashboardAccessService');
const dashboardComposerService = require('./dashboardComposerService');
const structuralAIGovernance = require('./structuralAIGovernanceService');

const MAX_KPI_LINES = 14;
const MAX_INSTRUCTION_CHARS = 14000;

/**
 * @param {object} user req.user (sessão IMPETUS)
 * @param {{ queryText?: string }} [opts]
 * @returns {Promise<{ ok: true, instructions_append: string, fetched_at: string, intent?: string }>}
 */
async function buildVoiceRealtimeContext(user, opts = {}) {
  const queryText = String(opts.queryText || '').trim();
  const gov = await structuralAIGovernance.buildAIGovernancePackage(user, {
    channel: 'voice_realtime',
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

  const dataBlock = gov.allow_operational_data
    ? [
        'DADOS INTERNOS (snapshot na abertura da sessão de voz — só podes citar isto para números/indicadores da empresa):',
        sumLine,
        'Indicadores permitidos ao perfil (amostra):',
        kpiLines
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
    gov.allow_operational_data
      ? 'Se a pergunta exigir pormenor que não conste aqui, não suponhas: diz que não encontraste no sistema ou sugere verificar no painel IMPETUS com permissões adequadas.'
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
