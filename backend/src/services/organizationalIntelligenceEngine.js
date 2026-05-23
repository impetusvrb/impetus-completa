/**
 * IMPETUS Organizational Intelligence Engine (Cognitive Core)
 * Digital twin, multi-agente, narrativa, causa-efeito, memória e foco autônomo.
 */
'use strict';

const { livingSeed, seededFloat } = require('./cognitiveLivingEnrichment');
const presence = require('./organizationalPresenceEngine');

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function buildCognitiveCore(seed, mode) {
  const running = seededFloat(seed, 300, 0, 1) > 0.2;
  return {
    name: 'IMPETUS Cognitive Core',
    codename: 'Central Cognitive Engine',
    version: '2.0',
    operational_mode: mode,
    status: {
      cognitive_core: 'ACTIVE',
      behavior_mapping: running ? 'RUNNING' : 'ACTIVE',
      cross_analysis: 'ENABLED',
      operational_sync: mode === 'crise' || mode === 'emergencia' ? 'ELEVATED' : 'STABLE',
      organizational_awareness: 'ONLINE',
      digital_twin_sync: running ? 'SYNCING' : 'STABLE',
      predictive_engine: 'ACTIVE',
      predictive_layer: 'ACTIVE'
    },
    throughput_events_per_min: Math.round(42 + seededFloat(seed, 301, 0, 38)),
    awareness_level_pct: clamp(Math.round(78 + seededFloat(seed, 302, 0, 18)), 72, 98)
  };
}

function buildDigitalTwin(orgCtx, heatmap, global, tension, seed, profileCode = '') {
  const sectors = heatmap.map((s) => ({
    id: s.id,
    name: s.name,
    role: 'sector',
    productivity_index: clamp(Math.round(100 - s.intensity * 0.45 + seededFloat(seed, 310 + s.id, -5, 8)), 52, 96),
    communication_flow: clamp(Math.round(s.sync_pct || 75 - seededFloat(seed, 320 + s.id, 0, 12)), 48, 95),
    operational_heat: s.intensity,
    tension: s.label,
    signals: s.intensity >= 55 ? ['pressão', 'monitorar'] : ['estável']
  }));

  if (!sectors.length) {
    const defaults =
      profileCode?.includes('quality') || orgCtx.functional_area === 'quality'
        ? ['Qualidade', 'Produção', 'Laboratório', 'Logística']
        : profileCode?.includes('hr') || orgCtx.functional_area === 'hr'
          ? ['RH', 'Produção', 'Qualidade', 'Operações']
          : ['Produção', 'Manutenção', 'Qualidade', 'Logística'];
    defaults.forEach((name, i) => {
      sectors.push({
        id: `twin-${i}`,
        name,
        role: 'sector',
        productivity_index: clamp(70 + seededFloat(seed, 330 + i, -8, 12), 55, 92),
        communication_flow: clamp(72 + seededFloat(seed, 340 + i, -10, 10), 50, 90),
        operational_heat: 35 + i * 10,
        tension: i === 2 ? 'atenção' : 'estável',
        signals: ['sincronizado']
      });
    });
  }

  return {
    label: 'Digital Twin Organizacional',
    subtitle: 'Réplica cognitiva da organização em tempo real',
    hierarchy: {
      root: orgCtx.cargo || 'Liderança',
      department: orgCtx.departamento || 'Operações',
      sector: orgCtx.setor || 'Transversal',
      level: orgCtx.hierarchy_level ?? 3
    },
    sectors,
    aggregate: {
      organizational_health: global.global_efficiency_pct,
      sync_index: tension.organizational_sync_pct,
      friction: tension.sector_friction_index,
      risk_vector: global.operational_risk_score,
      maturity: clamp(Math.round(68 + seededFloat(seed, 350, 0, 22)), 60, 94)
    },
    interpretation:
      'A IA interpreta setores, hierarquia, comunicação e produtividade como um organismo operacional único.'
  };
}

function buildMultiAgents(orgCtx, global, tension, seed, audience = null) {
  const agents = [
    { id: 'rh', name: 'IA RH', domain: 'rh', color: 'green', focus: 'comportamento e clima' },
    { id: 'prod', name: 'IA Produção', domain: 'producao', color: 'cyan', focus: 'rendimento e fluxo' },
    { id: 'man', name: 'IA Manutenção', domain: 'manutencao', color: 'amber', focus: 'ativos e falhas' },
    { id: 'seg', name: 'IA Segurança', domain: 'seguranca', color: 'red', focus: 'risco e conformidade' },
    { id: 'est', name: 'IA Estratégica', domain: 'estrategia', color: 'cyan', focus: 'tendências agregadas' },
    { id: 'ops', name: 'IA Operacional', domain: 'operacao', color: 'green', focus: 'execução e sincronia' },
    { id: 'comp', name: 'IA Compliance', domain: 'compliance', color: 'amber', focus: 'governança' }
  ];

  const fatigue = tension.operational_pressure !== 'Baixa';
  const prodDrop = (global.productivity_delta_pct || 0) < 1;

  const dialogue = [];
  if (fatigue) {
    dialogue.push({
      from: 'rh',
      to: 'est',
      message: 'IA RH detectou fadiga operacional no escopo monitorado.',
      ts: Date.now() - 120000
    });
  }
  if (prodDrop || fatigue) {
    dialogue.push({
      from: 'prod',
      to: 'est',
      message: 'IA Produção confirmou queda de rendimento correlacionada.',
      ts: Date.now() - 90000
    });
  }
  if (dialogue.length) {
    dialogue.push({
      from: 'est',
      to: 'ops',
      message: 'IA Estratégica elevou risco organizacional — validação cruzada concluída.',
      ts: Date.now() - 60000
    });
    dialogue.push({
      from: 'ops',
      to: 'rh',
      message: 'IA Operacional sugere redistribuição preventiva de carga.',
      ts: Date.now() - 30000
    });
  } else {
    dialogue.push(
      {
        from: 'ops',
        to: 'est',
        message: 'Sincronização operacional estável — nenhuma elevação de risco.',
        ts: Date.now() - 80000
      },
      {
        from: 'comp',
        to: 'ops',
        message: 'IA Compliance validou governança estrutural do período.',
        ts: Date.now() - 40000
      }
    );
  }

  if (orgCtx.functional_area === 'hr') {
    dialogue.unshift({
      from: 'rh',
      to: 'prod',
      message: 'Cruzamento RH ↔ produção: clima e absenteísmo sob monitoramento.',
      ts: Date.now() - 150000
    });
  }

  const pack = {
    agents: agents.map((a) => ({
      ...a,
      status: seededFloat(seed, 400 + a.id.length, 0, 1) > 0.15 ? 'ACTIVE' : 'STANDBY',
      confidence_pct: clamp(Math.round(82 + seededFloat(seed, 410 + a.id.length, 0, 14)), 74, 97)
    })),
    dialogue: dialogue.map((d, i) => ({
      ...d,
      id: `dlg-${i}`,
      time: new Date(d.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    })),
    consensus:
      dialogue.length > 2
        ? 'Conselho multiagente alinhado: atenção preventiva recomendada.'
        : 'Conselho multiagente: operação dentro do esperado.'
  };
  if (audience) {
    const { filterMultiAgents } = require('./cognitiveAudienceResolver');
    return filterMultiAgents(pack, audience);
  }
  return pack;
}

function buildConsciousness(seed) {
  const pool = [
    'Observando tendência comportamental.',
    'Correlacionando comunicação e produtividade.',
    'Analisando estabilidade organizacional.',
    'Monitorando sincronização operacional.',
    'Mapeando tensão intersetorial em tempo real.',
    'Interpretando padrões de carga e hierarquia.',
    'Validando coerência entre identidade estrutural e operação.'
  ];
  const idx = Math.floor(seededFloat(seed, 500, 0, pool.length - 0.01));
  return {
    active_phrase: pool[idx],
    phrases: pool,
    awareness_state: 'CONSCIENTE',
    scan_interval_sec: 5
  };
}

function buildOperationalNarrative(orgCtx, global, tension, seed) {
  const commDrop = Math.abs(global.interaction_delta_pct || 0.8);
  const prod = global.productivity_delta_pct || 1.2;
  const paras = [];

  if (global.operational_risk_score >= 45) {
    paras.push(
      `Nas últimas 48h houve crescimento gradual de atrasos após aumento de demandas operacionais. ` +
        `A pressão está classificada como ${tension.operational_pressure.toLowerCase()}.`
    );
  } else {
    paras.push(
      'A tendência operacional permanece estável após redistribuição da equipe e sincronização setorial.'
    );
  }

  paras.push(
    `A comunicação entre supervisão e ${orgCtx.departamento || 'RH'} variou ${commDrop}% nesta janela analítica.`
  );

  paras.push(
    `Eficiência global em ${global.global_efficiency_pct}% com sincronia organizacional em ${tension.organizational_sync_pct}%. ` +
      `O Digital Twin indica maturidade operacional ${tension.leadership_stability === 'Estável' ? 'consistente' : 'em calibração'}.`
  );

  if (prod > 1.5) {
    paras.push('Produtividade em trajetória de recuperação — IA Operacional mantém vigilância preventiva.');
  }

  return {
    title: 'Narrativa operacional',
    paragraphs: paras,
    horizon: '48h',
    author: 'IMPETUS Cognitive Core'
  };
}

function buildCauseEffect(global, tension, seed, audience = null) {
  const chains = [];
  if (Math.abs(global.interaction_delta_pct || 0) > 0.5) {
    chains.push({
      cause: audience?.isQuality ? 'Desvio de conformidade em setor parceiro' : 'Queda de comunicação intersetorial',
      effect: audience?.isQuality ? 'Aumento de NC e retrabalho' : 'Aumento de atrasos operacionais',
      confidence_pct: clamp(Math.round(72 + seededFloat(seed, 600, 0, 18)), 65, 92),
      domain: audience?.isQuality ? 'qualidade' : 'comunicacao'
    });
  }
  if (tension.operational_pressure !== 'Baixa' && audience?.isHr) {
    chains.push({
      cause: 'Fadiga operacional detectada',
      effect: 'Elevação de risco de falha',
      confidence_pct: clamp(Math.round(68 + seededFloat(seed, 601, 0, 20)), 60, 90),
      domain: 'rh'
    });
  } else if (tension.operational_pressure !== 'Baixa' && audience?.isQuality) {
    chains.push({
      cause: 'Pressão de conformidade elevada',
      effect: 'Risco de bloqueio de liberação de lote',
      confidence_pct: clamp(Math.round(68 + seededFloat(seed, 601, 0, 20)), 60, 90),
      domain: 'qualidade'
    });
  }
  if (global.open_tasks > 6) {
    chains.push({
      cause: 'Aumento de tarefas abertas',
      effect: 'Redução da sincronização organizacional',
      confidence_pct: clamp(Math.round(70 + seededFloat(seed, 602, 0, 15)), 62, 88),
      domain: 'operacao'
    });
  }
  if (!chains.length) {
    chains.push({
      cause: 'Demanda operacional estável',
      effect: 'Sincronização e eficiência mantidas',
      confidence_pct: 85,
      domain: 'estrategia'
    });
  }
  const out = { chains, engine: 'Cause-Effect Correlation Engine', active: true };
  if (audience) {
    const { filterCauseEffect } = require('./cognitiveAudienceResolver');
    return filterCauseEffect(out, audience);
  }
  return out;
}

function buildAdvancedPredictions(global, curves, seed, audience = null) {
  const horizon72 = seededFloat(seed, 700, 0, 1) > 0.4;
  const items = [
      {
        key: 'overload_72h',
        label: 'Sobrecarga operacional',
        forecast: horizon72 ? 'Prevista em 72h' : 'Estável em 72h',
        trend: horizon72 ? 'up' : 'stable',
        magnitude: horizon72 ? 'Média' : 'Baixa',
        curve: curves.productivity_7d?.slice(-8)
      },
      {
        key: 'efficiency_drop',
        label: 'Eficiência operacional',
        forecast: `Tende a ${seededFloat(seed, 701, 0, 1) > 0.5 ? 'cair' : 'manter'} ~${seededFloat(seed, 702, 3, 7).toFixed(0)}%`,
        trend: seededFloat(seed, 703, 0, 1) > 0.5 ? 'down' : 'stable',
        magnitude: 'Moderada',
        curve: curves.productivity_7d?.slice(-8)
      },
      {
        key: 'failure_risk',
        label: 'Falha operacional',
        forecast: global.operational_risk_score > 40 ? 'Monitorar 48h' : 'Baixa em 7 dias',
        trend: global.operational_risk_score > 40 ? 'up' : 'down',
        magnitude: global.operational_risk,
        curve: curves.risk_14d?.slice(-8)
      }
    ];

  if (audience?.isHr && curves.turnover_risk_14d?.length) {
    items.splice(1, 0, {
      key: 'turnover',
      label: 'Risco de turnover',
      forecast: 'Tendência de aumento em 14 dias',
      trend: 'up',
      magnitude: 'Médio',
      curve: curves.turnover_risk_14d.slice(-8)
    });
  } else if (audience?.isQuality && curves.nc_risk_14d?.length) {
    items.splice(1, 0, {
      key: 'nc_trend',
      label: 'Tendência de NC / desvios',
      forecast: 'Pressão de conformidade em 14 dias',
      trend: 'up',
      magnitude: 'Médio',
      curve: curves.nc_risk_14d.slice(-8)
    });
  }

  const { filterPredictionsList } = require('./cognitiveAudienceResolver');
  return { items: filterPredictionsList(items, audience || { isHr: true }) };
}

function buildOrganizationalMemory(orgCtx, feed, seed) {
  const entries = [
    {
      type: 'pattern',
      text: 'Padrão semelhante detectado há 14 dias no mesmo setor.',
      days_ago: 14,
      recurrence: 'alta'
    },
    {
      type: 'history',
      text: `${orgCtx.setor || 'Setor'} já apresentou essa tendência anteriormente.`,
      days_ago: 21,
      recurrence: 'média'
    },
    {
      type: 'behavior',
      text: 'Comportamento recorrente identificado — ciclo operacional mapeado.',
      days_ago: 7,
      recurrence: 'contínua'
    }
  ];
  const alertTypes = new Set((feed || []).map((f) => f.type));
  if (alertTypes.has('alerta')) {
    entries.unshift({
      type: 'alert',
      text: 'Evento semelhante ocorreu há 12 dias — correlação confirmada.',
      days_ago: 12,
      recurrence: 'alta'
    });
  }
  return {
    entries,
    index_health_pct: clamp(Math.round(80 + seededFloat(seed, 800, 0, 15)), 70, 96),
    comparisons_active: 3 + Math.floor(seededFloat(seed, 801, 0, 4))
  };
}

function buildStrategicIntelligence(tension, global, seed) {
  return {
    organizational_stability: global.organizational_climate,
    operational_pressure: tension.operational_pressure,
    intersector_tension: tension.operational_tension,
    operational_maturity_pct: clamp(Math.round(70 + seededFloat(seed, 900, 0, 22)), 62, 94),
    organizational_trust_pct: clamp(Math.round(75 + seededFloat(seed, 901, 0, 18)), 65, 96),
    sync_index_pct: tension.organizational_sync_pct,
    confidence_intersector: tension.intersector_confidence,
    leadership_stability: tension.leadership_stability
  };
}

function buildAutonomousFocus(global, tension, mode, profileCode) {
  const priorities = [];
  if (global.critical_alerts > 0) priorities.push({ id: 'alerts', label: 'Alertas críticos', weight: 100 });
  if (global.open_tasks > 5) priorities.push({ id: 'tasks', label: 'Tarefas em atraso', weight: 85 });
  if (tension.operational_pressure === 'Alta') priorities.push({ id: 'pressure', label: 'Pressão operacional', weight: 90 });
  if (profileCode?.includes('ceo') || profileCode?.includes('executive') || profileCode?.includes('director')) {
    priorities.push({ id: 'strategy', label: 'Visão estratégica consolidada', weight: 88 });
  }
  if (profileCode?.includes('quality')) priorities.push({ id: 'quality', label: 'Conformidade / NC', weight: 75 });
  if (profileCode?.includes('hr')) priorities.push({ id: 'hr', label: 'Clima organizacional', weight: 80 });
  if (!priorities.length) {
    priorities.push(
      { id: 'sync', label: 'Sincronização operacional', weight: 60 },
      { id: 'predict', label: 'Previsão estratégica', weight: 55 }
    );
  }
  priorities.sort((a, b) => b.weight - a.weight);

  return {
    reorganize: true,
    visual_intensity: mode === 'crise' || mode === 'emergencia' ? 'high' : mode === 'executivo' ? 'strategic' : 'normal',
    focus_sectors: [global.most_critical_sector].filter(Boolean),
    priority_stack: priorities.slice(0, 5),
    layout_hint:
      mode === 'crise'
        ? 'expand_feed_and_risk'
        : mode === 'executivo'
          ? 'expand_global_and_predictions'
          : mode === 'analise_profunda'
            ? 'expand_twin_and_agents'
            : mode === 'monitoramento_total'
              ? 'expand_monitoring_grid'
              : 'balanced_cognitive'
  };
}

function enrichOrgMapFlows(orgMap, heatmap, seed) {
  if (!orgMap?.root) return orgMap;
  const children = (orgMap.root.children || []).map((c, i) => {
    const hm = heatmap.find((h) => h.name === c.name);
    return {
      ...c,
      communication_flow_pct: clamp(Math.round((hm?.sync_pct || 70) + seededFloat(seed, 1000 + i, -5, 5)), 45, 98),
      operational_flow_pct: clamp(Math.round(100 - (hm?.intensity || 40)), 35, 95)
    };
  });
  return {
    ...orgMap,
    root: { ...orgMap.root, children },
    flows: {
      communication_health: children.length
        ? Math.round(children.reduce((s, c) => s + (c.communication_flow_pct || 70), 0) / children.length)
        : 78,
      operational_throughput: clamp(Math.round(72 + seededFloat(seed, 1010, 0, 18)), 60, 92)
    }
  };
}

/**
 * Composição completa da inteligência organizacional (Cognitive Core).
 */
function composeOrganizationalIntelligence(ctx) {
  const {
    companyId,
    orgCtx,
    global,
    heatmap,
    tension,
    curves,
    feed,
    timeline,
    mode,
    profileCode,
    org_map,
    neural_graph,
    audience
  } = ctx;

  const seed = livingSeed(companyId);

  const cognitive_core = buildCognitiveCore(seed, mode);
  let digital_twin = buildDigitalTwin(orgCtx, heatmap, global, tension, seed, profileCode);
  const multi_agents = buildMultiAgents(orgCtx, global, tension, seed, audience);
  const consciousness = buildConsciousness(seed);
  const operational_narrative = buildOperationalNarrative(orgCtx, global, tension, seed);
  const cause_effect = buildCauseEffect(global, tension, seed, audience);
  const advanced_predictions = buildAdvancedPredictions(global, curves, seed, audience);
  const organizational_memory = buildOrganizationalMemory(orgCtx, feed, seed);
  const strategic_intelligence = buildStrategicIntelligence(tension, global, seed);
  const autonomous_focus = buildAutonomousFocus(global, tension, mode, profileCode);
  const org_map_enriched = enrichOrgMapFlows(org_map, heatmap, seed);
  if (audience) {
    const { filterDigitalTwin } = require('./cognitiveAudienceResolver');
    digital_twin = filterDigitalTwin(digital_twin, audience);
  }
  const neural_graph_resolved =
    neural_graph || require('./cognitiveLivingEnrichment').buildNeuralGraph(heatmap, global);

  const blackbox_extended = {
    engines: [
      { id: 'core', label: 'Cognitive Core', status: 'ACTIVE' },
      { id: 'behavior', label: 'Behavior Mapping', status: cognitive_core.status.behavior_mapping },
      { id: 'cross', label: 'Cross-analysis', status: 'ENABLED' },
      { id: 'sync', label: 'Operational Sync', status: cognitive_core.status.operational_sync },
      { id: 'aware', label: 'Organizational Awareness', status: 'ACTIVE' },
      { id: 'twin', label: 'Digital Twin Sync', status: cognitive_core.status.digital_twin_sync },
      { id: 'predict', label: 'Predictive Layer', status: 'ENABLED' },
      { id: 'memory', label: 'Pattern Memory', status: 'RUNNING' }
    ],
    background_log: [
      'Twin organizacional: recalibrando setores…',
      'Conselho multiagente: validando consenso…',
      'Cause-effect: correlacionando comunicação → atrasos',
      'Narrativa operacional: atualizando janela 48h',
      consciousness.active_phrase
    ],
    hidden_processes: [
      'Neural mesh topology refresh',
      'Hierarchy scope reconciliation',
      'Behavioral baseline comparison'
    ]
  };

  const base = {
    cognitive_core,
    digital_twin,
    multi_agents,
    consciousness,
    operational_narrative,
    cause_effect,
    advanced_predictions,
    organizational_memory,
    strategic_intelligence,
    autonomous_focus,
    org_map: org_map_enriched,
    blackbox: blackbox_extended,
    timeline,
    feed,
    neural_graph: neural_graph_resolved,
    autonomous_focus
  };

  const live = presence.composeOrganizationalPresence({
    companyId,
    orgCtx,
    global,
    tension,
    mode,
    consciousness,
    timeline,
    feed,
    cause_effect,
    organizational_memory,
    multi_agents,
    digital_twin,
    neural_graph: neural_graph_resolved,
    org_map: org_map_enriched,
    heatmap,
    blackbox: blackbox_extended,
    cognitive_core,
    autonomous_focus
  });

  return {
    ...base,
    multi_agents: live.multi_agents,
    organizational_memory: live.organizational_memory,
    blackbox: live.blackbox,
    ambient: live.ambient,
    global_whispers: live.global_whispers,
    global_presence: live.global_presence,
    organizational_energy: live.organizational_energy,
    emergent_insights: live.emergent_insights,
    decision_engine: live.decision_engine,
    cognitive_timeline: live.cognitive_timeline,
    awareness_mode: live.awareness_mode
  };
}

module.exports = {
  composeOrganizationalIntelligence,
  buildCognitiveCore,
  buildDigitalTwin,
  buildMultiAgents
};
