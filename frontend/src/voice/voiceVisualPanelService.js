/**
 * Painel dinâmico da IA por voz: infere intenção do texto falado e carrega dados reais do Impetus (API dashboard).
 * Extensível — acrescente intents e loaders conforme novos módulos.
 */
import { dashboard } from '../services/api';

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * @param {string} text
 * @returns {string|null} intent key
 */
export function inferVoiceVisualIntent(text) {
  const t = norm(text);
  if (t.length < 4) return null;
  if (/\b(limpar|esvaziar|tirar (o )?grafico|tirar (o )?gráfico|fechar (o )?painel)\b/.test(t)) return 'clear';
  if (
    /\b(painel completo|tudo no painel|mostra tudo|mostrar tudo|visao geral|visão geral|dashboard completo|o que acontece|situacao|situação)\b/.test(t)
  )
    return 'full_panel';
  if (/\b(relatorio|relatório|gera\b|gerar|exportar|excel|planilha|pdf|imprimir)\b/.test(t)) return 'export_pack';
  if (/\b(grafico|gráfico|chart|diagrama|tendencia|tendência|evolucao|evolução|linha temporal|historico|histórico)\b/.test(t))
    return 'trend';
  if (/\b(manutencao|manutenção|ordem de servico|ordem de serviço|\bos\b|maquinas|máquinas|equipamento)\b/.test(t))
    return 'maintenance';
  if (/\b(cerebro|cérebro|inteligencia operacional|operacional brain|brain)\b/.test(t)) return 'operational_brain';
  if (/\b(indicador|kpi|kpis|painel|numeros|números|metricas|métricas)\b/.test(t)) return 'summary_bar';
  if (/\b(mostrar|exibir|ver |quero ver|preciso ver)\b/.test(t) && t.length > 12) return 'summary_bar';
  if (/\b(politica|política|procedimento|norma|documento da empresa)\b/.test(t))
    return 'policy_hint';
  /* Pedido genérico mas claramente operacional: painel completo (gráficos + tabelas). */
  if (
    t.length >= 20 &&
    /\b(quero|preciso|mostrar|exibir|ver|dados|inform|resumo|status|lista|painel|dashboard|operac|operacional|tudo sobre)\b/.test(t)
  )
    return 'full_panel';
  return null;
}

function trendToChartData(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.slice(-16).map((d) => ({
    name: String(d.label || d.periodo || d.mes || d.name || '-').slice(0, 14),
    valor: Number(d.valor ?? d.total ?? d.count ?? 0)
  }));
}

function parseKpiNumericValue(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(String(v).replace(/%/g, '').replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** @param {unknown} kpisArray */
function kpisToBarData(kpisArray) {
  const arr = Array.isArray(kpisArray) ? kpisArray : [];
  return arr.slice(0, 14).map((k) => ({
    name: String(k?.title || k?.key || k?.id || '-').slice(0, 24),
    valor: parseKpiNumericValue(k?.value)
  }));
}

function summaryToBarData(s) {
  if (!s) return [];
  return [
    { name: 'Interações', valor: Number(s?.operational_interactions?.total ?? 0) },
    { name: 'Insights IA', valor: Number(s?.ai_insights?.total ?? 0) },
    { name: 'Alertas crít.', valor: Number(s?.alerts?.critical ?? 0) },
    { name: 'Propostas', valor: Number(s?.proposals?.total ?? 0) }
  ];
}

/** @param {string} t normalized phrase */
function detectReportFocusModules(t) {
  const mods = new Set();
  if (/\b(custo|custos|nexus|perdas?|financeiro|dinheiro|desperdicio|desperdício)\b/.test(t)) mods.add('costs');
  if (/\b(previs(ao|ão)|forecast|projec(ao|ão)|eficiencia|eficiência|lucro|p&l|perda e lucro)\b/.test(t))
    mods.add('forecast');
  if (/\b(vazamento|leakage|gasto oculto|mapa de vazamentos)\b/.test(t)) mods.add('leakage');
  if (/\b(insight|inteligencia|inteligência)\b/.test(t)) mods.add('insights');
  if (/\b(interac(ao|ão)|atividade recente|historico de uso|histórico)\b/.test(t)) mods.add('interactions');
  if (/\b(industrial|maquin|máquin|linha de produc(ao|ão)|turno|produc(ao|ão))\b/.test(t)) mods.add('industrial');
  if (
    mods.size === 0 &&
    /\b(relatorio|relatório|completo|geral|imprimir|exportar|pdf|excel|planilha)\b/.test(t)
  ) {
    mods.add('insights');
    mods.add('interactions');
    mods.add('costs');
  }
  return mods;
}

function allReportModules() {
  return new Set(['costs', 'forecast', 'leakage', 'insights', 'interactions', 'industrial']);
}

/** Sempre acrescenta tabelas úteis além do gráfico (custos, insights, interações). */
function expandFocusForRichPanel(focusSet) {
  const s = new Set(focusSet);
  ['insights', 'interactions', 'costs'].forEach((k) => s.add(k));
  return s;
}

function flattenObjectRows(obj, maxRows = 14) {
  if (!obj || typeof obj !== 'object') return [];
  const entries = Object.entries(obj).filter(([, v]) => v != null && typeof v !== 'object');
  return entries.slice(0, maxRows).map(([k, v]) => [String(k), String(v)]);
}

/**
 * @param {string} userPhrase
 * @param {{ full?: boolean, rich?: boolean, title?: string, prependExtraTables?: { title: string, columns: string[], rows: string[][] }[] }} [options]
 * @returns {Promise<object>}
 */
async function buildDynamicReportPackage(userPhrase, options = {}) {
  const t = norm(userPhrase);
  const full = options.full === true;
  const rich = options.rich === true || full;
  let focus = full ? allReportModules() : detectReportFocusModules(t);
  if (rich && !full) focus = expandFocusForRichPanel(focus);
  const phraseLabel = String(userPhrase || '').trim().slice(0, 72) || 'Pedido por voz';

  const FOCUS_LABELS = {
    costs: 'custos',
    forecast: 'previsão',
    leakage: 'vazamentos financeiros',
    insights: 'insights',
    interactions: 'interações',
    industrial: 'industrial'
  };
  const focusHint = full
    ? 'visão alargada (indicadores, tendência, custos, previsão, vazamentos, industrial)'
    : focus.size > 0
      ? [...focus].map((k) => FOCUS_LABELS[k] || k).join(' · ')
      : 'indicadores e tendência';

  /** @type {Array<[string, Promise<unknown>]>} */
  const fetches = [
    ['trend', dashboard.getTrend(6)],
    ['summary', dashboard.getSummary()],
    ['kpis', dashboard.getKPIs()]
  ];
  if (focus.has('costs')) {
    fetches.push(['costTop', dashboard.costs.getTopLoss()]);
    fetches.push(['costExec', dashboard.costs.getExecutiveSummary()]);
  }
  if (focus.has('forecast')) {
    fetches.push(['pl', dashboard.forecasting.getProfitLoss(14)]);
  }
  if (focus.has('leakage')) {
    fetches.push(['leakRank', dashboard.financialLeakage.getRanking()]);
  }
  if (focus.has('insights')) {
    fetches.push(['dashInsights', dashboard.getInsights(10, 0)]);
  }
  if (focus.has('interactions')) {
    fetches.push(['recentIx', dashboard.getRecentInteractions(10, 0)]);
  }
  if (focus.has('industrial')) {
    fetches.push(['indStatus', dashboard.industrial.getStatus()]);
  }

  const settled = await Promise.all(fetches.map(([, p]) => p.catch(() => ({}))));
  const bag = Object.fromEntries(fetches.map(([k], i) => [k, settled[i]]));

  const trendRaw = bag.trend?.data?.data ?? bag.trend?.data?.trend ?? bag.trend?.data ?? [];
  const trendData = trendToChartData(trendRaw);
  const s = bag.summary?.data?.summary;
  const summaryBar = summaryToBarData(s);

  const kpiList = bag.kpis?.data?.kpis ?? bag.kpis?.kpis ?? [];
  let barData = kpisToBarData(kpiList);
  const kpiHasSignal = barData.some((x) => x.valor !== 0);
  if (!barData.length || !kpiHasSignal) barData = summaryBar;

  /** @type {{ title: string, columns: string[], rows: string[][] }[]} */
  const extraTables = [...(options.prependExtraTables || [])];

  if (focus.has('costs')) {
    const list = bag.costTop?.data?.list ?? bag.costTop?.data ?? [];
    const rows = (Array.isArray(list) ? list : []).slice(0, 10).map((item) => [
      String(item?.origin || item?.name || item?.label || '-').slice(0, 44),
      String(item?.value ?? item?.total ?? item?.perda ?? '—')
    ]);
    if (rows.length) extraTables.push({ title: 'Principais perdas (custos)', columns: ['Origem', 'Valor'], rows });

    const ex = bag.costExec?.data?.summary ?? bag.costExec?.data?.text ?? bag.costExec?.data;
    const txt = typeof ex === 'string' ? ex : ex?.resumo;
    if (txt && String(txt).trim()) {
      extraTables.push({
        title: 'Resumo executivo de custos',
        columns: ['Texto'],
        rows: [[String(txt).slice(0, 600)]]
      });
    }
  }

  if (focus.has('forecast')) {
    const pl = bag.pl?.data;
    if (pl && typeof pl === 'object') {
      if (Array.isArray(pl.series)) {
        const rows = pl.series.slice(0, 12).map((row) =>
          typeof row === 'object' && row
            ? [String(row.label ?? row.period ?? row.date ?? '-'), String(row.value ?? row.valor ?? '-')]
            : [String(row), '']
        );
        if (rows.length) extraTables.push({ title: 'Previsão / série', columns: ['Período', 'Valor'], rows });
      } else if (Array.isArray(pl)) {
        const rows = pl.slice(0, 12).map((x) => [String(x), '']);
        extraTables.push({ title: 'Previsão (lista)', columns: ['Item', ''], rows });
      } else {
        const flat = flattenObjectRows(pl, 16);
        if (flat.length) extraTables.push({ title: 'Previsão / P&L (campos)', columns: ['Campo', 'Valor'], rows: flat });
      }
    }
  }

  if (focus.has('leakage')) {
    const rank = bag.leakRank?.data?.ranking ?? bag.leakRank?.data?.items ?? bag.leakRank?.data;
    const list = Array.isArray(rank) ? rank : [];
    const rows = list.slice(0, 10).map((item) => {
      if (item && typeof item === 'object') {
        return [
          String(item.leak_label ?? item.tipo ?? item.type ?? item.label ?? '-').slice(0, 36),
          String(item.impact ?? item.total ?? item.score ?? item.sector ?? '—')
        ];
      }
      return [String(item), ''];
    });
    if (rows.length) extraTables.push({ title: 'Ranking de vazamentos', columns: ['Tipo / setor', 'Impacto'], rows });
  }

  if (focus.has('insights')) {
    const insights = bag.dashInsights?.data?.insights ?? bag.dashInsights?.insights ?? [];
    const rows = (Array.isArray(insights) ? insights : []).slice(0, 10).map((ins) => [
      String(ins?.title || ins?.id || '-').slice(0, 40),
      String(ins?.summary || ins?.message || '-').slice(0, 120),
      String(ins?.severity || ins?.priority || '')
    ]);
    if (rows.length) extraTables.push({ title: 'Insights (amostra)', columns: ['Título', 'Resumo', 'Gravidade'], rows });
  }

  if (focus.has('interactions')) {
    const ix = bag.recentIx?.data?.interactions ?? bag.recentIx?.data?.items ?? bag.recentIx?.data ?? [];
    const list = Array.isArray(ix) ? ix : [];
    const rows = list.slice(0, 10).map((it) => {
      if (it && typeof it === 'object') {
        return [
          String(it.action ?? it.type ?? it.label ?? '-').slice(0, 28),
          String(it.detail ?? it.description ?? it.summary ?? JSON.stringify(it)).slice(0, 100)
        ];
      }
      return [String(it), ''];
    });
    if (rows.length) extraTables.push({ title: 'Interações recentes', columns: ['Ação', 'Detalhe'], rows });
  }

  if (focus.has('industrial')) {
    const st = bag.indStatus?.data ?? bag.indStatus;
    const flat = flattenObjectRows(st, 14);
    if (flat.length) extraTables.push({ title: 'Estado industrial', columns: ['Métrica', 'Valor'], rows: flat });
  }

  const barMax = barData.length ? Math.max(...barData.map((x) => x.valor), 0) : 0;
  const sparseBars = barMax === 0 && barData.length > 0;
  const subtitleParts = [
    full ? 'Painel completo: gráficos e tabelas abaixo' : `Foco: ${focusHint}`,
    'Exportar Excel, PDF ou imprimir',
    sparseBars ? 'Barras com valores baixos no período — veja as tabelas.' : null
  ].filter(Boolean);

  const exportRows = [
    ...barData.map((x) => ['Indicadores (barras)', x.name, String(x.valor)]),
    ...trendData.map((x) => ['Tendência', x.name, String(x.valor)])
  ];
  for (const tb of extraTables) {
    for (const row of tb.rows) {
      const joined = row.length > 1 ? row.slice(1).join(' | ') : '';
      exportRows.push([tb.title, String(row[0] ?? ''), joined]);
    }
  }

  const panelTitle = (options.title || `Painel — ${phraseLabel}`).slice(0, 88);
  const hasCharts = barData.length > 0 || trendData.length > 0;
  const hasTables = extraTables.some((tb) => (tb.rows || []).length > 0);
  if (!hasCharts && !hasTables) {
    return { kind: 'empty', title: panelTitle, hint: 'Sem dados para montar o painel neste momento.' };
  }

  return {
    kind: 'mixed',
    title: panelTitle,
    subtitle: subtitleParts.join(' · '),
    trendData,
    barData,
    extraTables,
    exportRows,
    exportColumns: ['Secção', 'Rótulo', 'Valor / detalhe']
  };
}

/**
 * @param {string} userPhrase
 * @returns {Promise<object|null>}
 */
export async function buildVoicePanelVisual(userPhrase) {
  const intent = inferVoiceVisualIntent(userPhrase);
  if (!intent) return null;
  if (intent === 'clear') return { kind: 'clear' };

  try {
    if (intent === 'full_panel') {
      const phraseLabel = String(userPhrase || '').trim().slice(0, 56);
      return await buildDynamicReportPackage(userPhrase, {
        full: true,
        title: `Painel operacional — ${phraseLabel}`.slice(0, 88)
      });
    }

    if (intent === 'trend') {
      const phraseLabel = String(userPhrase || '').trim().slice(0, 56);
      return await buildDynamicReportPackage(userPhrase, {
        rich: true,
        title: `Tendência e contexto — ${phraseLabel}`.slice(0, 88)
      });
    }

    if (intent === 'summary_bar') {
      const phraseLabel = String(userPhrase || '').trim().slice(0, 56);
      return await buildDynamicReportPackage(userPhrase, {
        rich: true,
        title: `Indicadores e contexto — ${phraseLabel}`.slice(0, 88)
      });
    }

    if (intent === 'maintenance') {
      const phraseLabel = String(userPhrase || '').trim().slice(0, 56);
      const [sumR, cardsR] = await Promise.all([
        dashboard.maintenance.getSummary().catch(() => ({ data: {} })),
        dashboard.maintenance.getCards().catch(() => ({ data: {} }))
      ]);
      const cards = cardsR?.data?.cards || cardsR?.data?.items || [];
      const rows = (Array.isArray(cards) ? cards : []).slice(0, 15).map((c) => [
        String(c.title || c.label || c.name || c.id || '—').slice(0, 80),
        String(c.value ?? c.count ?? c.status ?? '—').slice(0, 40),
        String(c.hint || c.subtitle || '').slice(0, 60)
      ]);
      if (!rows.length) {
        const d = sumR?.data || {};
        const flat = Object.entries(d)
          .filter(([, v]) => v != null && typeof v !== 'object')
          .slice(0, 12);
        flat.forEach(([k, v]) => rows.push([k, String(v), '']));
      }
      const maintRows = rows.length ? rows : [['—', 'Sem dados', '']];
      return await buildDynamicReportPackage(userPhrase, {
        rich: true,
        title: `Manutenção e painel — ${phraseLabel}`.slice(0, 88),
        prependExtraTables: [
          {
            title: 'Manutenção (amostra)',
            columns: ['Item', 'Valor', 'Detalhe'],
            rows: maintRows
          }
        ]
      });
    }

    if (intent === 'operational_brain') {
      const phraseLabel = String(userPhrase || '').trim().slice(0, 56);
      const r = await dashboard.operationalBrain.getSummary().catch(() => ({ data: {} }));
      const payload = r?.data || {};
      const alerts = payload.alertas || payload.alerts || [];
      const alertRows = (Array.isArray(alerts) ? alerts : []).slice(0, 12).map((a) => [
        String(a.id ?? a.alert_id ?? '-'),
        String(a.title ?? a.message ?? a.descricao ?? '-').slice(0, 120),
        String(a.priority ?? a.severity ?? '-')
      ]);
      const rows =
        alertRows.length > 0 ? alertRows : [['—', 'Sem alertas na resposta atual.', '—']];
      return await buildDynamicReportPackage(userPhrase, {
        rich: true,
        title: `Cérebro operacional — ${phraseLabel}`.slice(0, 88),
        prependExtraTables: [
          {
            title: 'Alertas (cérebro operacional)',
            columns: ['ID', 'Descrição', 'Prioridade'],
            rows
          }
        ]
      });
    }

    if (intent === 'policy_hint') {
      const phraseLabel = String(userPhrase || '').trim().slice(0, 40);
      return await buildDynamicReportPackage(userPhrase, {
        rich: true,
        title: `Políticas e indicadores — ${phraseLabel}`.slice(0, 88),
        prependExtraTables: [
          {
            title: 'Políticas e documentos',
            columns: ['Como aceder', 'Detalhe'],
            rows: [
              ['Menu lateral', 'Abra «Instruções e Procedimentos» ou «Biblioteca» no painel.'],
              [
                'Exportação',
                'Use Excel, PDF e Imprimir neste painel para levar os dados para fora da aplicação.'
              ]
            ]
          }
        ]
      });
    }

    if (intent === 'export_pack') {
      return await buildDynamicReportPackage(userPhrase, { rich: true });
    }
  } catch (e) {
    return {
      kind: 'error',
      title: 'Visual',
      hint: e?.message || 'Falha ao carregar dados.'
    };
  }

  return null;
}
