/**
 * Contexto para voz OpenAI Realtime: dados internos IMPETUS já filtrados por hierarquia
 * e permissões (mesma base que /dashboard/me e KPIs).
 * A IA de voz recebe isto no system prompt — não substitui tool-calls turn-a-turn,
 * mas ancora respostas ao que o utilizador pode ver neste snapshot (ligação).
 */
const hierarchicalFilter = require('./hierarchicalFilter');
const dashboardKPIs = require('./dashboardKPIs');
const dashboardAccessService = require('./dashboardAccessService');
const dashboardComposerService = require('./dashboardComposerService');
const dashboardProfileResolver = require('./dashboardProfileResolver');
const userContext = require('./userContext');

const MAX_KPI_LINES = 14;
const MAX_INSTRUCTION_CHARS = 14000;

function buildAccessLines(user) {
  const config = dashboardProfileResolver.getDashboardConfigForUser(user);
  const allowedModules = dashboardAccessService.getAllowedModules(user);
  const depth = dashboardAccessService.getIADataDepth(user);
  const uc = userContext.buildUserContext(user);
  const area = user.functional_area || user.area || '—';
  const ucHint = uc ? `área ${uc.area}, âmbito de dados ${uc.scope}, profundidade ${uc.data_depth}` : '—';
  return [
    'REGRAS DE ACESSO (obrigatório — cumprir antes de responder):',
    `- Perfil IMPETUS: ${config.profile_code || '—'} (${(config.profile_config && config.profile_config.label) || ''}).`,
    `- Cargo/função: ${user.role || '—'}; área funcional: ${area}.`,
    `- Nível hierárquico (1=mais alto): ${user.hierarchy_level ?? '—'}.`,
    `- Profundidade de dados IA para este utilizador: ${depth} (strategic | analytical | operational | practical).`,
    `- Módulos/páginas que este utilizador pode aceder no IMPETUS: ${allowedModules.length ? allowedModules.join(', ') : 'nenhum listado'}.`,
    '- Se pedirem dados fora destes módulos, acima da profundidade, ou sensíveis sem permissão explícita, responde de forma educada que não tens permissão para fornecer essa informação.',
    '- Não inventes números, estados de linha, stocks ou métricas. Usa apenas o bloco «DADOS INTERNOS» abaixo; se não estiver lá, diz: «Não encontrei essa informação no sistema.»',
    '- Proibido usar conhecimento externo genérico (internet, outras empresas, suposições de mercado).',
    `- Contexto utilizador (resumo): ${ucHint} — não contradigas o perfil.`
  ].join('\n');
}

/**
 * @param {object} user req.user (sessão IMPETUS)
 * @returns {Promise<{ ok: true, instructions_append: string, fetched_at: string }>}
 */
async function buildVoiceRealtimeContext(user) {
  const scope = await hierarchicalFilter.resolveHierarchyScope(user).catch(() => null);

  let kpisRaw = [];
  try {
    kpisRaw = await dashboardKPIs.getDashboardKPIs(user, scope);
  } catch (_) {
    kpisRaw = [];
  }
  const kpisPersonalized = dashboardComposerService.applyPersonalizationToKpis(kpisRaw, user);
  const kpis = dashboardAccessService.getAllowedKpis(user, kpisPersonalized).slice(0, MAX_KPI_LINES);

  let summary;
  try {
    summary = await dashboardKPIs.getDashboardSummary(user);
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

  const access = buildAccessLines(user);
  const dataBlock = [
    'DADOS INTERNOS (snapshot na abertura da sessão de voz — só podes citar isto para números/indicadores gerais):',
    sumLine,
    'Indicadores permitidos ao perfil (amostra):',
    kpiLines
  ].join('\n');

  const instructions_append = [
    access,
    '',
    dataBlock,
    '',
    'Se a pergunta exigir pormenor que não conste aqui, não suponhas: diz que não encontraste no sistema ou sugere verificar no painel IMPETUS com permissões adequadas.'
  ].join('\n');

  const trimmed =
    instructions_append.length > MAX_INSTRUCTION_CHARS
      ? `${instructions_append.slice(0, MAX_INSTRUCTION_CHARS)}\n[contexto truncado por limite de tamanho]`
      : instructions_append;

  return {
    ok: true,
    instructions_append: trimmed,
    fetched_at: new Date().toISOString()
  };
}

module.exports = {
  buildVoiceRealtimeContext
};
