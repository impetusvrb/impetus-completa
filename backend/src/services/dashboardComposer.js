'use strict';

const { collectOperationalEvents } = require('./eventEngine');
const { rankRelevantEvents } = require('./relevanceEngine');
const { chooseVisualization } = require('./visualizationSelector');

function groupForEvent(event) {
  if (event?.criticality === 'high') return 'problemas_criticos';
  if (event?.requires_action) return 'acoes';
  if ((event?.type || '').includes('tendencia')) return 'tendencias';
  if ((event?.impact || '') === 'high') return 'atencoes';
  return 'recomendacoes';
}

function severityLabel(criticality) {
  if (criticality === 'high') return 'alta';
  if (criticality === 'medium') return 'media';
  return 'baixa';
}

function makeBlockFromEvent(event, idx) {
  const growth = Number(event?.payload?.growth);
  const hasGrowth = Number.isFinite(growth);
  const formattedGrowth = hasGrowth ? `${growth > 0 ? '+' : ''}${growth}%` : null;
  const contextualMessage =
    event?.payload?.message ||
    event?.payload?.interpretation ||
    (event?.payload?.value === 0
      ? 'Sem volume suficiente para análise detalhada nesta leitura.'
      : 'Evento relevante identificado para o seu contexto.');

  return {
    id: `blk_${event.id}_${idx}`,
    event_id: event.id,
    relevance: event.relevance || 0,
    group: groupForEvent(event),
    severity: severityLabel(event?.criticality),
    visualization: chooseVisualization(event),
    title: event?.payload?.title || event.type.replace(/_/g, ' '),
    subtitle: `${event.setor || 'operacional'} · ${event.criticality || 'low'}`,
    requires_action: event.requires_action === true,
    data: {
      value: event?.payload?.value ?? null,
      growth: event?.payload?.growth ?? null,
      growth_label: formattedGrowth,
      trend: event?.payload?.trend || null,
      message: contextualMessage
    }
  };
}

function buildFallbackSurface(user) {
  const area = user?.functional_area || user?.area || 'operacional';
  return [
    { id: 'blk_fallback_1', event_id: 'evt_fallback_1', relevance: 10, visualization: 'fallback', title: 'Painel vivo aguardando novos sinais', subtitle: `${area} · contexto inicial`, requires_action: false, data: { message: 'Ainda não há dados suficientes para análise deste setor.' } },
    { id: 'blk_fallback_2', event_id: 'evt_fallback_2', relevance: 10, visualization: 'insight', title: 'Sem alertas críticos para o seu perfil', subtitle: `${area} · monitoramento contínuo`, requires_action: false, data: { message: 'Nenhum evento relevante detectado no momento.' } }
  ];
}

function buildFocusMoment(blocks = []) {
  const top = blocks[0];
  if (!top) {
    return {
      status: 'estavel',
      title: 'Operação estável',
      message: 'Nenhum evento relevante detectado no momento.',
      cta: ['Atualizar contexto']
    };
  }
  if (top.severity === 'alta') {
    return {
      status: 'critico',
      title: 'Situação crítica detectada',
      message: `${top.title} · ${top.subtitle}`,
      cta: ['Ver detalhes', 'Criar ação']
    };
  }
  if (top.group === 'atencoes' || top.severity === 'media') {
    return {
      status: 'atencao',
      title: 'Atenção necessária',
      message: `${top.title} · ${top.data?.message || top.subtitle}`,
      cta: ['Analisar impacto']
    };
  }
  return {
    status: 'estavel',
    title: 'Operação estável',
    message: 'Sem risco crítico nas últimas leituras monitoradas.',
    cta: ['Ver tendências']
  };
}

function groupBlocks(blocks = []) {
  const out = {
    problemas_criticos: [],
    atencoes: [],
    tendencias: [],
    recomendacoes: [],
    acoes: []
  };
  for (const b of blocks) {
    if (!out[b.group]) out[b.group] = [];
    out[b.group].push(b);
  }
  return out;
}

async function composeLiveDashboardSurface(user) {
  const events = await collectOperationalEvents(user);
  const ranked = rankRelevantEvents(user, events);
  const blocks = ranked
    .slice(0, 14)
    .map((evt, idx) => makeBlockFromEvent(evt, idx))
    .sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
  const finalBlocks = blocks.length ? blocks : buildFallbackSurface(user);
  const grouped = groupBlocks(finalBlocks);
  const activeGroups = Object.entries(grouped)
    .filter(([, arr]) => Array.isArray(arr) && arr.length > 0)
    .map(([key, arr]) => ({ key, count: arr.length }));

  return {
    generated_at: new Date().toISOString(),
    dynamic: true,
    profile_context: { role: user?.role || 'colaborador', area: user?.functional_area || user?.area || 'operacional' },
    focus_moment: buildFocusMoment(finalBlocks),
    groups: grouped,
    active_groups: activeGroups,
    blocks: finalBlocks
  };
}

module.exports = { composeLiveDashboardSurface };
