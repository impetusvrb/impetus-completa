/**
 * Painel de comando visual — interpretação de pedido + hidratação com dados reais (servidor).
 * A IA escolhe tipo e datasets; números vêm sempre das APIs do dashboard (sem inventar métricas).
 */
const ai = require('./ai');
const claudeService = require('./claudeService');
const dashboardKPIs = require('./dashboardKPIs');
const hierarchicalFilter = require('./hierarchicalFilter');
const dashboardComposerService = require('./dashboardComposerService');
const dashboardAccessService = require('./dashboardAccessService');
const userContext = require('./userContext');
const personalizedInsightsService = require('./personalizedInsightsService');
const maintenanceService = require('./dashboardMaintenanceService');

let operationalBrain;
try {
  operationalBrain = require('./operationalBrainEngine');
} catch (_) {
  operationalBrain = null;
}

const AVAILABLE_DATA_SOURCES = [
  { id: 'operacoes', label: 'Operações / comunicações', permission: 'VIEW_OPERATIONAL' },
  { id: 'dashboard', label: 'Dashboard / KPIs', permission: 'VIEW_DASHBOARD' },
  { id: 'manutencao', label: 'Manutenção', permission: 'operational.view' },
  { id: 'inteligencia', label: 'Insights IA', permission: 'ACCESS_AI_ANALYTICS' },
  { id: 'financeiro', label: 'Financeiro / custos', permission: 'VIEW_FINANCIAL' },
  { id: 'estategico', label: 'Dados estratégicos', permission: 'VIEW_STRATEGIC' },
  { id: 'cerebro', label: 'Cérebro operacional', permission: 'ACCESS_AI_ANALYTICS' },
  { id: 'relatorios', label: 'Relatórios gerenciais', permission: 'VIEW_STRATEGIC' }
];

function permSet(user) {
  const p = new Set(dashboardAccessService.getEffectivePermissions(user));
  if ((user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'ceo') p.add('*');
  return p;
}

function hasAnyPerm(user, codes) {
  const s = permSet(user);
  if (s.has('*')) return true;
  return codes.some((c) => s.has(c));
}

function canUseDataset(user, dataset) {
  const d = String(dataset || '').toLowerCase();
  if (['financeiro', 'costs', 'financial'].includes(d)) {
    return hasAnyPerm(user, ['VIEW_FINANCIAL', 'VIEW_STRATEGIC', '*']);
  }
  if (['strategic', 'estategico'].includes(d)) {
    return hasAnyPerm(user, ['VIEW_STRATEGIC', '*']);
  }
  return true;
}

function filterDatasets(user, datasets) {
  const out = [];
  for (const d of datasets || []) {
    const id = String(d).toLowerCase();
    if (canUseDataset(user, id)) out.push(id);
  }
  return [...new Set(out)];
}

function parseAiJson(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const t = raw.trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

/**
 * Quando a IA devolve "chart" ou "mixed" por hábito, alinha o tipo ao pedido em português.
 * @returns {string | null}
 */
function inferPanelTypeFromUserText(raw) {
  const t = String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (!t.trim()) return null;

  if (/\b(relatorio|relatório|narrativ|texto|descrev|explic|sumario escrito|por escrito)\b/.test(t)) {
    return 'report';
  }
  if (/\b(tabela|lista\s+em\s+tabela|tabular|linhas?\s+e\s+colunas?|folha\s+de\s+dados|lista\s+detalhada)\b/.test(t)) {
    return 'table';
  }
  if (/\bresumo\s+dos?\s+(meus\s+)?(indicadores?|kpis?|metricas?)\b/.test(t)) {
    return 'kpi_cards';
  }
  if (/\b(alerta|avisos?|criticos?|críticos?|prioridade\s+maxima)\b/.test(t)) {
    return 'alert';
  }
  if (/\b(comparar|comparativo|versus|\bvs\b|lado\s+a\s+lado)\b/.test(t)) {
    return 'comparison';
  }
  if (/\b(cartoes|cartões|cards?\s+de\s+kpi|kpi\s+cards?|painel\s+numerico|metricas\s+principais)\b/.test(t)) {
    return 'kpi_cards';
  }
  if (/\b(indicadores?\s+com|barras?\s+de\s+progresso|sem\s+grafico|sem\s+gráfico)\b/.test(t)) {
    return 'indicator';
  }
  if (
    /\b(grafico|gráfico|barras?|pizza|donut|circular|evolucao|evolução|tendencia|tendência|linha\s+temporal|chart)\b/.test(t)
  ) {
    return 'chart';
  }
  return null;
}

function normalizeAiPlan(parsed, rawInput) {
  const allowedTypes = new Set([
    'chart',
    'table',
    'kpi_cards',
    'report',
    'alert',
    'comparison',
    'indicator',
    'mixed'
  ]);
  let type = allowedTypes.has(parsed?.type) ? parsed.type : 'mixed';
  const inferred = inferPanelTypeFromUserText(rawInput);
  if (inferred && (type === 'mixed' || type === 'chart')) {
    type = inferred;
  }
  const title =
    String(parsed?.title || '').trim().slice(0, 120) ||
    `Análise — ${String(rawInput || '').slice(0, 48)}`;
  const chartType = ['bar', 'line', 'area', 'pie', 'donut'].includes(parsed?.chartType)
    ? parsed.chartType
    : 'bar';
  let datasets = Array.isArray(parsed?.datasets) ? parsed.datasets.map((x) => String(x).toLowerCase()) : [];
  if (!datasets.length) datasets = ['kpis', 'summary'];
  let exportOptions = Array.isArray(parsed?.exportOptions)
    ? parsed.exportOptions.filter((x) => ['excel', 'pdf', 'print'].includes(x))
    : ['excel', 'pdf', 'print'];
  if (!exportOptions.length) exportOptions = ['excel', 'pdf', 'print'];
  return {
    permissionGranted: parsed?.permissionGranted !== false,
    denialReason: parsed?.denialReason ? String(parsed.denialReason).slice(0, 500) : null,
    type,
    title,
    chartType,
    datasets,
    exportOptions: [...new Set(exportOptions)],
    narrative: parsed?.narrative ? String(parsed.narrative).slice(0, 8000) : '',
    reportContent: parsed?.reportContent ? String(parsed.reportContent).slice(0, 12000) : ''
  };
}

async function loadInsightRows(user, scope, limit = 8) {
  const kpisRaw = await dashboardKPIs.getDashboardKPIs(user, scope).catch(() => []);
  const kpis = dashboardComposerService.applyPersonalizationToKpis(kpisRaw, user);
  const raw = kpis.slice(0, limit).map((k, i) => ({
    id: `ins-${k.key || k.id || i}`,
    title: k.title || 'Indicador',
    summary: personalizedInsightsService.buildInsightSummaryForKpi(k, user),
    severity: personalizedInsightsService.severityFromKpi(k)
  }));
  const insights = personalizedInsightsService.adaptInsightsToProfile(user, raw);
  return (insights || []).map((ins) => [
    String(ins?.title || ins?.id || '-').slice(0, 44),
    String(ins?.summary || ins?.message || '-').slice(0, 160),
    String(ins?.severity || ins?.priority || '')
  ]);
}

function summaryToBars(s) {
  if (!s) return [];
  return [
    { name: 'Interações', valor: Number(s?.operational_interactions?.total ?? 0) },
    { name: 'Insights IA', valor: Number(s?.ai_insights?.total ?? 0) },
    { name: 'Alertas crít.', valor: Number(s?.alerts?.critical ?? 0) },
    { name: 'Propostas', valor: Number(s?.proposals?.total ?? 0) }
  ];
}

function kpiToBarData(kpis) {
  const arr = Array.isArray(kpis) ? kpis : [];
  return arr.slice(0, 14).map((k) => {
    let v = k?.value;
    if (typeof v === 'string') {
      const n = parseFloat(String(v).replace(/%/g, '').replace(',', '.'));
      v = Number.isFinite(n) ? n : 0;
    }
    return {
      name: String(k?.title || k?.key || k?.id || '-').slice(0, 22),
      valor: typeof v === 'number' && Number.isFinite(v) ? v : 0
    };
  });
}

function kpiToCards(kpis) {
  const arr = Array.isArray(kpis) ? kpis : [];
  return arr.slice(0, 12).map((k) => {
    const val = k?.value;
    const strVal = val != null ? String(val) : '—';
    let level = 'ok';
    if (typeof val === 'number') {
      if (val < 0) level = 'crit';
      else if (val === 0) level = 'warn';
    }
    return {
      title: String(k?.title || k?.key || '-').slice(0, 48),
      value: strVal,
      subtitle: String(k?.route || '').slice(0, 80),
      level
    };
  });
}

async function hydrate(user, plan) {
  const scope = await hierarchicalFilter.resolveHierarchyScope(user).catch(() => null);
  const datasets = filterDatasets(user, plan.datasets);
  if (!datasets.length) {
    return {
      permissionGranted: false,
      denialReason: 'O seu perfil não tem permissão para estes dados. Peça ao administrador.',
      type: 'report',
      title: plan.title,
      exportOptions: plan.exportOptions,
      reportContent: plan.denialReason || 'Sem permissão.'
    };
  }

  const [kpisRaw, summary, maint, brain] = await Promise.all([
    datasets.some((d) => ['kpis', 'kpi', 'summary', 'insights', 'comparativo', 'comparison'].includes(d))
      ? dashboardKPIs.getDashboardKPIs(user, scope).catch(() => [])
      : Promise.resolve([]),
    datasets.some((d) => ['summary', 'comparativo', 'comparison', 'mixed'].includes(d))
      ? dashboardKPIs.getDashboardSummary(user).catch(() => null)
      : Promise.resolve(null),
    datasets.includes('maintenance') || datasets.includes('manutencao')
      ? maintenanceService.getCards(user).catch(() => ({}))
      : Promise.resolve(null),
    datasets.includes('operational') || datasets.includes('cerebro')
      ? operationalBrain?.getOperationalSummary?.(user.company_id, {}).catch(() => null)
      : Promise.resolve(null)
  ]);

  const kpis = dashboardComposerService.applyPersonalizationToKpis(
    dashboardAccessService.getAllowedKpis(user, kpisRaw),
    user
  );

  let insightRows = [];
  if (datasets.includes('insights') || datasets.includes('inteligencia')) {
    insightRows = await loadInsightRows(user, scope, 10);
  }

  const summaryBars = summaryToBars(summary);
  let barData = kpiToBarData(kpis);
  /* Só usa o resumo fixo (Interações / Insights IA / …) quando não há KPIs para mostrar.
     Se existirem KPIs ainda que zerados, mantém os respetivos nomes — evita o mesmo gráfico genérico sempre. */
  if (!barData.length) {
    barData = summaryBars;
  }

  const lineData =
    barData.length > 0 ? barData.map((b) => ({ name: b.name, valor: b.valor })) : summaryBars;

  const extraTables = [];
  if (insightRows.length) {
    extraTables.push({
      title: 'Insights (IA)',
      columns: ['Indicador', 'Resumo', 'Gravidade'],
      rows: insightRows
    });
  }

  if (maint?.cards && typeof maint.cards === 'object') {
    const rows = Object.entries(maint.cards).map(([k, v]) => [
      k.replace(/_/g, ' '),
      String(v ?? '—')
    ]);
    if (rows.length) {
      extraTables.push({ title: 'Manutenção (resumo)', columns: ['Métrica', 'Valor'], rows });
    }
  }

  if (brain && typeof brain === 'object') {
    const alerts = brain.alertas || brain.alerts || [];
    if (Array.isArray(alerts) && alerts.length) {
      const rows = alerts.slice(0, 12).map((a) => [
        String(a.id ?? a.alert_id ?? '-'),
        String(a.title ?? a.message ?? a.descricao ?? '-').slice(0, 120),
        String(a.priority ?? a.severity ?? '-')
      ]);
      extraTables.push({
        title: 'Alertas (cérebro operacional)',
        columns: ['ID', 'Descrição', 'Prioridade'],
        rows
      });
    }
  }

  if (summary) {
    extraTables.push({
      title: 'Resumo executivo (números)',
      columns: ['Métrica', 'Valor'],
      rows: [
        ['Interações (7 dias)', String(summary.operational_interactions?.total ?? '—')],
        ['Crescimento %', String(summary.operational_interactions?.growth_percentage ?? '—')],
        ['Insights IA (7 dias)', String(summary.ai_insights?.total ?? '—')],
        ['Alertas críticos', String(summary.alerts?.critical ?? '—')],
        ['Propostas abertas', String(summary.proposals?.total ?? '—')]
      ]
    });
  }

  const kpiCards = kpiToCards(kpis);

  const narrative = plan.narrative
    ? `${plan.narrative}\n\n`
    : '';
  const reportContent =
    plan.reportContent ||
    `${narrative}**Resumo automático (dados do seu perfil)**\n\n` +
      `- KPIs carregados: ${kpis.length}\n` +
      `- Interações (semana): ${summary?.operational_interactions?.total ?? '—'}\n` +
      `- Propostas em aberto: ${summary?.proposals?.total ?? '—'}\n`;

  const alertsUi = [];
  const crit = Number(summary?.alerts?.critical ?? 0);
  if (crit > 0) {
    alertsUi.push({
      severity: 'critical',
      title: 'Alertas críticos',
      message: `${crit} comunicação(ões) com prioridade máxima no seu escopo.`
    });
  }

  const type = plan.type;

  return {
    permissionGranted: true,
    denialReason: null,
    type,
    title: plan.title,
    chartType: plan.chartType,
    chartData: plan.chartType === 'pie' || plan.chartType === 'donut' ? barData : lineData,
    barData,
    trendData: plan.chartType === 'area' || plan.chartType === 'line' ? lineData : null,
    kpiCards,
    table:
      extraTables[0] ||
      (summary
        ? {
            title: 'Resumo',
            columns: ['Métrica', 'Valor'],
            rows: [
              ['Interações', String(summary.operational_interactions?.total ?? '—')],
              ['Propostas', String(summary.proposals?.total ?? '—')]
            ]
          }
        : null),
    extraTables,
    reportContent,
    alerts: alertsUi,
    comparison: {
      columns: ['Métrica', 'Valor atual'],
      rows: summaryBars.map((x) => [x.name, String(x.valor)])
    },
    indicators: barData.slice(0, 8).map((b) => ({
      label: b.name,
      value: b.valor,
      level: b.valor > 0 ? 'ok' : 'warn',
      progress: Math.min(100, Math.max(0, Number(b.valor) * 10))
    })),
    exportOptions: plan.exportOptions,
    hydratedDatasets: datasets,
    userContextHint: {
      dataScope: userContext.buildUserContext(user)?.scope || 'individual',
      iaDepth: dashboardAccessService.getIADataDepth(user)
    }
  };
}

function buildSystemPrompt(userCtxPayload) {
  return `És o motor de análise do IMPETUS IA (painel de comando visual).

Recebes o comando do utilizador em português, o perfil (JSON) e a lista de fontes de dados disponíveis.

Regras:
1. Se o pedido pedir dados que o perfil NÃO cobre (ex.: financeiro sem permissão), responde permissionGranted: false e denialReason curto e amigável em português.
2. Caso contrário permissionGranted: true.
3. Escolhe UM type principal (não uses "chart" nem "mixed" por defeito):
   - chart → só quando pedirem gráfico, barras, pizza, evolução, tendência ou visualização comparativa por eixos.
   - table → listas, tabelas, dados em linhas/colunas, "mostra numa tabela".
   - kpi_cards → cartões de KPI, números grandes, painel de métricas principais, "resumo em números" sem pedir gráfico.
   - report → relatório narrativo, texto, explicação por escrito, sumário descritivo.
   - alert → foco em alertas, avisos, prioridade crítica.
   - comparison → comparar períodos, áreas, ou métricas lado a lado (tabela comparativa).
   - indicator → indicadores com estado/progresso (sem pedir gráfico de barras).
   - mixed → APENAS se o pedido for explicitamente "dashboard completo", "mostra tudo", ou várias visualizações ao mesmo tempo.
4. chartType: bar | line | area | pie | donut — só quando type for chart ou mixed com gráfico.
5. datasets: lista de ids entre: kpis, summary, insights, maintenance, manutencao, operational, cerebro, financeiro, strategic, comparativo
   — usa só o que faz sentido ao pedido. Por omissão ["kpis","summary"].
6. Não inventes números em narrative/reportContent — descreve o que vais pedir ao sistema; os números serão preenchidos no servidor.
7. exportOptions: ["excel","pdf","print"].

Exemplos (type correto):
- "Quero um gráfico de propostas" → type chart, chartType bar
- "Mostra numa tabela os insights" → type table
- "Relatório textual da semana" → type report
- "Só os KPIs principais" → type kpi_cards
- "Alertas críticos agora" → type alert

Responde APENAS um JSON válido com as chaves:
permissionGranted, denialReason (ou null), type, title, chartType, datasets, exportOptions, narrative (opcional), reportContent (opcional)

Perfil e fontes:
${JSON.stringify(userCtxPayload)}`;
}

/**
 * Interpretação do pedido do painel: Claude (Anthropic) por defeito se existir ANTHROPIC_API_KEY;
 * SMART_PANEL_AI_PROVIDER=openai força GPT; claude|anthropic força Claude mesmo sem outras chaves (falha se não houver key).
 */
function smartPanelInterpreterProvider() {
  const ex = (process.env.SMART_PANEL_AI_PROVIDER || '').toLowerCase().trim();
  if (ex === 'openai') return 'openai';
  if (ex === 'claude' || ex === 'anthropic') return 'claude';
  if (process.env.ANTHROPIC_API_KEY) return 'claude';
  return 'openai';
}

async function runPanelInterpreter(messages, billing) {
  const wantClaude = smartPanelInterpreterProvider() === 'claude';
  if (wantClaude && claudeService.isAvailable()) {
    const c = await claudeService.completeOpenAIStyleMessages(messages, {
      max_tokens: 1200,
      billing,
      timeout: 45000
    });
    if (typeof c === 'string' && c.startsWith('FALLBACK:')) return c;
    if (typeof c === 'string' && c.trim().length > 0) return c;
  }
  return ai.chatCompletionMessages(messages, {
    max_tokens: 1200,
    billing,
    response_format: { type: 'json_object' },
    timeout: 45000
  });
}

/**
 * @param {object} user — req.user
 * @param {string} rawInput
 */
async function processPanelCommand(user, rawInput) {
  const ctx = userContext.buildUserContext(user);
  const modules = dashboardAccessService.getAllowedModules(user);
  const perms = dashboardAccessService.getEffectivePermissions(user);
  const userCtxPayload = {
    userId: String(user.id),
    role: user.role || 'colaborador',
    department: user.area || user.functional_area || ctx?.department || '',
    permissions: perms,
    dataScope: ctx?.data_scope || 'department',
    visibleModules: modules,
    iaDataDepth: dashboardAccessService.getIADataDepth(user),
    availableDataSources: AVAILABLE_DATA_SOURCES
  };

  const billing =
    user.company_id && user.id ? { companyId: user.company_id, userId: user.id } : null;

  const messages = [
    { role: 'system', content: buildSystemPrompt(userCtxPayload) },
    { role: 'user', content: String(rawInput || '').trim().slice(0, 4000) }
  ];

  let content = await runPanelInterpreter(messages, billing);

  if (typeof content !== 'string' || content.startsWith('FALLBACK:')) {
    const plan = normalizeAiPlan(
      {
        permissionGranted: true,
        type: 'mixed',
        title: 'Painel operacional',
        chartType: 'bar',
        datasets: ['kpis', 'summary', 'insights'],
        exportOptions: ['excel', 'pdf', 'print'],
        narrative: ''
      },
      rawInput
    );
    return hydrate(user, plan);
  }

  const parsed = parseAiJson(content) || {};
  const plan = normalizeAiPlan(parsed, rawInput);

  if (!plan.permissionGranted) {
    return {
      permissionGranted: false,
      denialReason: plan.denialReason || 'Não foi possível validar o pedido com o seu perfil.',
      type: 'report',
      title: plan.title,
      exportOptions: ['excel', 'pdf', 'print'],
      reportContent: plan.denialReason || 'Pedido não autorizado.'
    };
  }

  return hydrate(user, plan);
}

module.exports = {
  processPanelCommand,
  AVAILABLE_DATA_SOURCES
};
