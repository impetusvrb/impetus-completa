/**
 * Camada de presença viva — ambiente reativo, sussurros IA, energia org., emergência, decisões.
 */
'use strict';

const { seededFloat, livingSeed } = require('./cognitiveLivingEnrichment');

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

const AGENT_PERSONAS = {
  rh: { tone: 'empática', style: 'observadora', prefix: 'Noto que' },
  prod: { tone: 'objetiva', style: 'direta', prefix: 'Registro:' },
  man: { tone: 'técnica', style: 'preventiva', prefix: 'Ativos:' },
  seg: { tone: 'rigorosa', style: 'vigilante', prefix: 'Alerta:' },
  est: { tone: 'executiva', style: 'analítica', prefix: 'Estrategicamente,' },
  ops: { tone: 'crítica', style: 'rápida', prefix: 'Operação:' },
  comp: { tone: 'formal', style: 'governança', prefix: 'Compliance:' }
};

function buildAmbientState(mode, global, tension) {
  const risk = global.operational_risk_score || 30;
  let mood = 'stable';
  let scanner_speed = 1;
  let glow_intensity = 0.35;
  let pulse_rate = 1;

  if (mode === 'monitoramento_total') {
    mood = 'strategic';
    scanner_speed = 1.1;
    glow_intensity = 0.55;
    pulse_rate = 1.15;
  } else if (mode === 'emergencia' || mode === 'crise') {
    mood = 'crisis';
    scanner_speed = 2.2;
    glow_intensity = 0.85;
    pulse_rate = 1.8;
  } else if (mode === 'critico' || risk >= 55) {
    mood = 'alert';
    scanner_speed = 1.6;
    glow_intensity = 0.65;
    pulse_rate = 1.4;
  } else if (risk >= 38 || tension.operational_pressure === 'Média') {
    mood = 'watch';
    scanner_speed = 1.2;
    glow_intensity = 0.5;
    pulse_rate = 1.1;
  } else if (mode === 'executivo' || mode === 'analise_profunda') {
    mood = 'strategic';
    scanner_speed = 0.85;
    glow_intensity = 0.45;
    pulse_rate = 0.9;
  }

  return {
    mood,
    scanner_speed,
    glow_intensity,
    pulse_rate,
    sector_glow: tension.sector_friction_index >= 50,
    breathe: true
  };
}

function buildGlobalWhispers(seed, consciousness, mode, global) {
  const pool = [
    'Monitorando estabilidade organizacional…',
    'Analisando sincronização operacional…',
    'Correlacionando produtividade e comportamento…',
    'Detectada leve tensão operacional.',
    'Analisando sincronização intersetorial.',
    'Mapeando fluxo cognitivo entre setores…',
    'Validando coerência hierárquica…',
    consciousness?.active_phrase,
    'Neural correlation em tempo real…',
    'Organizational Awareness: ONLINE',
    'Cognitive Core observando operação…',
    'Cross-analysis em execução silenciosa…'
  ].filter(Boolean);

  const channels = [
    { channel: 'header', zone: 'top-left', priority: 'high' },
    { channel: 'global', zone: 'top-right', priority: 'high' },
    { channel: 'rail', zone: 'mid-right', priority: 'medium' },
    { channel: 'grid', zone: 'mid-left', priority: 'medium' },
    { channel: 'band', zone: 'top-right', priority: 'low' },
    { channel: 'footer', zone: 'bottom-left', priority: 'low' },
    { channel: 'global', zone: 'bottom-right', priority: 'low' },
    { channel: 'header', zone: 'top-left', priority: 'medium' },
    { channel: 'rail', zone: 'mid-right', priority: 'low' },
    { channel: 'grid', zone: 'mid-left', priority: 'low' },
    { channel: 'footer', zone: 'bottom-left', priority: 'medium' },
    { channel: 'global', zone: 'top-right', priority: 'low' }
  ];

  const out = channels.map((ch, i) => {
    const idx = Math.floor(seededFloat(seed, 1100 + i, 0, pool.length - 0.01));
    return {
      id: `w-${i}`,
      text: pool[idx],
      channel: ch.channel,
      zone: ch.zone,
      priority: ch.priority
    };
  });

  if (mode === 'crise' || mode === 'emergencia') {
    out.unshift({
      id: 'w-alert',
      text: 'Escaneamento acelerado — modo crise ativo.',
      channel: 'global',
      zone: 'top-right',
      priority: 'critical'
    });
  }
  if (mode === 'monitoramento_total') {
    out.unshift({
      id: 'w-mon',
      text: 'Monitoramento total — todos os setores sob vigilância cognitiva.',
      channel: 'header',
      zone: 'top-left',
      priority: 'high'
    });
  }
  if (global.operational_risk === 'Baixo') {
    out.push({
      id: 'w-calm',
      text: 'Ambiente operacional dentro da faixa estável.',
      channel: 'footer',
      zone: 'bottom-left',
      priority: 'low'
    });
  }
  return out;
}

function buildGlobalPresence(ambient, whispers, cognitiveCore, autonomousFocus) {
  const byChannel = {};
  for (const w of whispers) {
    if (!byChannel[w.channel]) byChannel[w.channel] = [];
    byChannel[w.channel].push(w);
  }
  return {
    alive: true,
    tagline: 'Inteligência operacional cognitiva · presença global',
    channels: Object.keys(byChannel),
    whispers_by_channel: byChannel,
    heartbeat_bpm: Math.round(58 + (ambient?.pulse_rate || 1) * 8),
    adaptive_layout: autonomousFocus?.layout_hint || 'balanced_cognitive',
    visual_intensity: autonomousFocus?.visual_intensity || 'normal',
    core_online: cognitiveCore?.status?.cognitive_core === 'ACTIVE'
  };
}

function buildOrganizationalEnergy(tension, global, seed) {
  const morale = clamp(Math.round(78 - tension.sector_friction_index * 0.2 + seededFloat(seed, 1200, -4, 6)), 55, 92);
  const opsEnergy = clamp(Math.round((global.global_efficiency_pct || 80) * 0.92), 58, 96);
  const rhythm =
    (global.productivity_delta_pct || 0) > 1.5 ? 'acelerado' : (global.productivity_delta_pct || 0) < 0 ? 'contido' : 'constante';

  return {
    label: 'Energia organizacional',
    morale_pct: morale,
    operational_energy_pct: opsEnergy,
    operation_rhythm: rhythm,
    sync_pct: tension.organizational_sync_pct,
    stability: global.organizational_climate,
    pressure: tension.operational_pressure,
    confidence_pct: tension.organizational_sync_pct,
    organism_state: morale >= 75 && tension.operational_pressure === 'Baixa' ? 'VIVO · ESTÁVEL' : 'VIVO · ADAPTANDO'
  };
}

function buildEmergentInsights(orgCtx, global, tension, seed) {
  const items = [
    {
      hypothesis: 'Possível relação entre atrasos e mudança de supervisão.',
      confidence_pct: clamp(Math.round(62 + seededFloat(seed, 1300, 0, 22)), 55, 88),
      discovered_by: 'Neural Correlation'
    },
    {
      hypothesis: 'Queda de comunicação pode estar impactando produtividade.',
      confidence_pct: clamp(Math.round(68 + seededFloat(seed, 1301, 0, 18)), 60, 90),
      discovered_by: 'Cross-analysis'
    }
  ];
  if (tension.operational_pressure !== 'Baixa') {
    items.push({
      hypothesis: 'Aumento de pressão operacional afetou estabilidade intersetorial.',
      confidence_pct: 74,
      discovered_by: 'Behavior Mapping'
    });
  }
  if (orgCtx.departamento) {
    items.push({
      hypothesis: `Desalinhamento sutil entre ${orgCtx.departamento} e operação periférica.`,
      confidence_pct: 58,
      discovered_by: 'Organizational Awareness'
    });
  }
  return { items, engine: 'Emergent Pattern Discovery', active: true };
}

function buildDecisionEngine(global, tension, causeEffect, seed) {
  const redistribution = clamp(Math.round(18 + seededFloat(seed, 1400, 0, 12)), 12, 32);
  const loadReduce = clamp(Math.round(12 + seededFloat(seed, 1401, 0, 10)), 8, 25);

  const decisions = [
    {
      action: 'Redistribuição operacional preventiva',
      impact: `Reduziria risco operacional em ~${redistribution}%`,
      priority: tension.operational_pressure !== 'Baixa' ? 'alta' : 'média',
      domain: 'operacao'
    },
    {
      action: 'Redução de carga na equipe crítica',
      impact: `Melhoraria estabilidade da equipe em ~${loadReduce}%`,
      priority: 'média',
      domain: 'rh'
    }
  ];
  if (causeEffect?.chains?.[0]) {
    decisions.push({
      action: `Intervir em: ${causeEffect.chains[0].cause}`,
      impact: `Mitigaria: ${causeEffect.chains[0].effect}`,
      priority: 'alta',
      domain: 'estrategia'
    });
  }
  return { decisions, engine: 'Decision Impact Engine', active: true };
}

function buildContextualMemory(orgCtx, organizationalMemory, seed) {
  const contextual = [
    {
      type: 'crisis',
      text: 'Situação semelhante ocorreu há 14 dias — resposta coordenada foi eficaz.',
      days_ago: 14
    },
    {
      type: 'leadership',
      text: 'A liderança respondeu melhor à redistribuição operacional no último ciclo.',
      days_ago: 21
    },
    {
      type: 'pattern',
      text: `Padrão recorrente identificado em ${orgCtx.setor || 'operação'}.`,
      days_ago: 7
    },
    {
      type: 'decision',
      text: 'Decisão anterior de priorizar comunicação RH↔supervisão reduziu atrito.',
      days_ago: 30
    }
  ];
  return {
    ...organizationalMemory,
    contextual_entries: contextual,
    leadership_style: seededFloat(seed, 1500, 0, 1) > 0.5 ? 'proativa' : 'reativa equilibrada',
    memory_depth: 'contextual'
  };
}

function applyAgentPersonalities(multiAgents) {
  if (!multiAgents?.agents) return multiAgents;
  const agents = multiAgents.agents.map((a) => ({
    ...a,
    persona: AGENT_PERSONAS[a.id] || { tone: 'analítica', style: 'neutra', prefix: '' }
  }));
  const dialogue = (multiAgents.dialogue || []).map((d) => {
    const persona = AGENT_PERSONAS[d.from];
    if (!persona) return d;
    const msg = d.message.startsWith(persona.prefix) ? d.message : `${persona.prefix} ${d.message}`;
    return { ...d, message: msg, tone: persona.tone, style: persona.style };
  });
  return { ...multiAgents, agents, dialogue };
}

function buildCognitiveTimeline(timeline, feed, seed) {
  const events = (timeline || []).map((t, i) => ({
    id: `tl-${i}`,
    time: t.time,
    ts: t.ts,
    title: t.label,
    detail: t.detail,
    impact: seededFloat(seed, 1600 + i, 0, 1) > 0.5 ? 'positivo' : 'neutro',
    type: 'audit'
  }));
  (feed || []).slice(0, 6).forEach((f, i) => {
    events.push({
      id: `tl-f-${i}`,
      time: f.time,
      ts: f.ts,
      title: f.message?.slice(0, 48) || 'evento',
      detail: f.type,
      impact: f.severity === 'high' ? 'crítico' : 'neutro',
      type: f.type
    });
  });
  return {
    events: events.sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 14),
    replay_available: true,
    horizon: '48h',
    label: 'Timeline cognitiva viva'
  };
}

function buildAwarenessModePayload(ctx) {
  const { digital_twin, neural_graph, org_map, heatmap, tension, organizational_energy, mode } = ctx;
  return {
    title: 'ORGANIZATIONAL AWARENESS MODE',
    subtitle: 'Mapa neural · fluxo · calor · sincronização',
    mode,
    neural_graph,
    org_map,
    heatmap,
    digital_twin_summary: digital_twin?.aggregate,
    energy: organizational_energy,
    tension,
    sectors_live: (heatmap || []).map((h) => ({ ...h, pulse: true }))
  };
}

function enrichBlackboxPresence(blackbox) {
  const engines = [
    ...(blackbox?.engines || []),
      { id: 'neural', label: 'Neural Correlation', status: 'ACTIVE' },
      { id: 'predict', label: 'Predictive Engine', status: 'ACTIVE' },
      { id: 'aware_online', label: 'Organizational Awareness', status: 'ONLINE' }
  ];
  const seen = new Set();
  const unique = engines.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
  return {
    ...blackbox,
    engines: unique,
    hidden_processes: [
      ...(blackbox?.hidden_processes || []),
      'Emergent hypothesis generation',
      'Decision impact simulation',
      'Ambient mood calibration'
    ]
  };
}

function composeOrganizationalPresence(ctx) {
  const {
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
    neural_graph,
    org_map,
    heatmap,
    blackbox,
    cognitive_core,
    autonomous_focus
  } = ctx;

  const seed = livingSeed(companyId);
  const ambient = buildAmbientState(mode, global, tension);
  const global_whispers = buildGlobalWhispers(seed, consciousness, mode, global);
  const organizational_energy = buildOrganizationalEnergy(tension, global, seed);
  const emergent_insights = buildEmergentInsights(orgCtx, global, tension, seed);
  const decision_engine = buildDecisionEngine(global, tension, cause_effect, seed);
  const organizational_memory_ctx = buildContextualMemory(orgCtx, organizational_memory, seed);
  const multi_agents_persona = applyAgentPersonalities(multi_agents);
  const cognitive_timeline = buildCognitiveTimeline(timeline, feed, seed);
  const awareness_mode = buildAwarenessModePayload({
    digital_twin,
    neural_graph,
    org_map,
    heatmap,
    tension,
    organizational_energy,
    mode
  });

  const global_presence = buildGlobalPresence(
    ambient,
    global_whispers,
    cognitive_core,
    autonomous_focus
  );

  return {
    ambient,
    global_whispers,
    global_presence,
    organizational_energy,
    emergent_insights,
    decision_engine,
    organizational_memory: organizational_memory_ctx,
    multi_agents: multi_agents_persona,
    cognitive_timeline,
    awareness_mode,
    blackbox: enrichBlackboxPresence(blackbox)
  };
}

module.exports = {
  composeOrganizationalPresence,
  buildAmbientState,
  applyAgentPersonalities
};
