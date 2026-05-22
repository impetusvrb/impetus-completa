/**
 * Enriquecimento cognitivo vivo — evita estados vazios, oscilação inteligente, feed denso.
 * Usado em DEV e produção quando dados reais são escassos.
 */
'use strict';

const db = require('../db');

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatTime(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Seed estável por empresa + janela de 5 min — oscila sem saltos bruscos */
function livingSeed(companyId) {
  const slot = Math.floor(Date.now() / (5 * 60 * 1000));
  let h = 0;
  const s = `${companyId}-${slot}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function seededFloat(seed, salt, min, max) {
  const x = Math.sin((seed + salt) * 12.9898) * 43758.5453;
  const f = x - Math.floor(x);
  return min + f * (max - min);
}

function applyLivingOscillation(centro, seed) {
  const out = { ...centro };
  const drift = seededFloat(seed, 1, -2.5, 2.5);
  out.global_efficiency_pct = clamp(Math.round((out.global_efficiency_pct || 82) + drift), 68, 94);
  out.ia_confidence_pct = clamp(Math.round((out.ia_confidence_pct || 90) + seededFloat(seed, 2, -1, 1)), 72, 98);
  out.productivity_delta_pct = parseFloat(seededFloat(seed, 3, 0.4, 2.8).toFixed(1));
  out.interaction_delta_pct = parseFloat(seededFloat(seed, 4, -1.6, -0.2).toFixed(1));
  out.risk_delta = seededFloat(seed, 5, -3, 4);
  return out;
}

function buildOrganizationalTension(centro, heatmap, seed) {
  const avgHeat =
    heatmap.length > 0
      ? heatmap.reduce((s, h) => s + h.intensity, 0) / heatmap.length
      : 45;
  const sync = clamp(Math.round(88 - avgHeat * 0.25 + seededFloat(seed, 10, -4, 4)), 62, 94);
  const pressure =
    centro.operational_risk_score >= 55 ? 'Alta' : centro.operational_risk_score >= 35 ? 'Média' : 'Baixa';
  const interTrust = sync >= 78 ? 'Alta' : sync >= 65 ? 'Média' : 'Em observação';
  const tension =
    centro.operational_risk === 'Alto' ? 'Elevada' : centro.operational_risk === 'Médio' ? 'Moderada' : 'Baixa';
  const leadership = centro.organizational_climate === 'Estável' ? 'Estável' : 'Monitorada';

  return {
    organizational_sync_pct: sync,
    operational_pressure: pressure,
    intersector_confidence: interTrust,
    operational_tension: tension,
    leadership_stability: leadership,
    sector_friction_index: clamp(Math.round(avgHeat * 0.7), 18, 82)
  };
}

function buildGlobalOperationState(centro, heatmap, orgCtx, seed) {
  const watching = heatmap.filter((h) => h.intensity >= 45).map((h) => h.name);
  const trend =
    (centro.productivity_delta_pct || 0) > 1
      ? 'crescente'
      : (centro.productivity_delta_pct || 0) < 0
        ? 'em ajuste'
        : 'estável';
  const commHealth = seededFloat(seed, 20, 72, 92) > 80 ? 'saudável' : 'monitorada';

  return {
    headline: centro.operational_risk === 'Baixo' ? 'Operação estável' : 'Operação em observação ativa',
    organizational_health_pct: clamp(Math.round((centro.global_efficiency_pct || 80) * 0.95), 65, 96),
    global_risk: centro.operational_risk,
    stability: centro.organizational_climate,
    sectors_on_watch: watching.length ? watching.slice(0, 4) : ['Produção', 'Manutenção'],
    operational_trend: trend,
    communication_health: commHealth,
    company_status: orgCtx.valid !== false ? 'SINCRONIZADA' : 'CALIBRAÇÃO ESTRUTURAL',
    bullets: [
      `${watching.length || 2} setor(es) em observação`,
      `Produtividade ${trend} (${centro.productivity_delta_pct > 0 ? '+' : ''}${centro.productivity_delta_pct || 1.2}%)`,
      `Comunicação ${commHealth}`,
      `Risco operacional ${String(centro.operational_risk || 'baixo').toLowerCase()}`
    ]
  };
}

function buildBlackbox(seed) {
  const pulse = seededFloat(seed, 30, 0.4, 1) > 0.15;
  return {
    engines: [
      { id: 'cognitive', label: 'Cognitive Engine', status: 'ACTIVE' },
      { id: 'cross', label: 'Cross-analysis', status: pulse ? 'RUNNING' : 'ACTIVE' },
      { id: 'behavior', label: 'Behavior Mapping', status: 'ENABLED' },
      { id: 'sync', label: 'Operational Sync', status: 'ACTIVE' },
      { id: 'predict', label: 'Predictive Layer', status: pulse ? 'RUNNING' : 'ACTIVE' },
      { id: 'memory', label: 'Pattern Memory', status: 'ENABLED' }
    ],
    background_log: [
      'Correlacionando RH ↔ manutenção',
      'Mapeando tensão intersetorial',
      'Atualizando curva de risco 14d',
      'Sincronizando hierarquia operacional'
    ]
  };
}

async function loadOrgMap(companyId, heatmap, seed) {
  const nodes = [{ id: 'ceo', name: 'CEO', role: 'executive', level: 0, intensity: 35, status: 'estável', children: [] }];
  try {
    const r = await db.query(
      `SELECT id, name FROM departments WHERE company_id = $1 AND active = true ORDER BY name LIMIT 10`,
      [companyId]
    );
    const rows = r.rows || [];
    if (rows.length) {
      nodes[0].children = rows.map((d, i) => {
        const hm = heatmap.find((h) => h.name === d.name);
        const intensity = hm?.intensity ?? clamp(30 + i * 8 + seededFloat(seed, 40 + i, 0, 18), 25, 88);
        return {
          id: String(d.id),
          name: d.name,
          level: 1,
          intensity: Math.round(intensity),
          status: intensity >= 65 ? 'crítico' : intensity >= 42 ? 'atenção' : 'estável',
          pulse: true
        };
      });
      return { root: nodes[0] };
    }
  } catch (_) { /* fallback */ }

  const defaults = ['RH', 'Produção', 'PCM', 'Manutenção', 'Qualidade'];
  nodes[0].children = defaults.map((name, i) => ({
    id: `def-${i}`,
    name,
    level: 1,
    intensity: clamp(38 + seededFloat(seed, 50 + i, 5, 42), 28, 85),
    status: i === 3 ? 'atenção' : 'estável',
    pulse: true
  }));
  return { root: nodes[0] };
}

function expandFeedIntelligently(feed, orgCtx, centro, seed, minItems = 18) {
  const out = [...feed];
  const templates = [
    () => ({ type: 'ia', severity: 'low', message: 'IA detectou padrão incomum no fluxo operacional' }),
    () => ({
      type: 'ia',
      severity: 'medium',
      message: 'Cruzamento RH ↔ manutenção: possível desalinhamento de comunicação'
    }),
    () => ({
      type: 'ia',
      severity: 'low',
      message: `Produtividade ${centro.productivity_delta_pct > 0 ? 'subindo' : 'ajustando'} ${Math.abs(centro.productivity_delta_pct || 1.2)}% no escopo`
    }),
    () => ({ type: 'ia', severity: 'low', message: 'IA iniciou análise comportamental preventiva' }),
    () => ({ type: 'comunicacao', severity: 'medium', message: 'Comunicação pendente há 2h entre supervisão e operação' }),
    () => ({ type: 'supervisor', severity: 'high', message: 'Supervisor abriu ocorrência crítica — fila priorizada' }),
    () => ({ type: 'ia', severity: 'low', message: 'Tendência operacional estabilizada após pico de tensão' }),
    () => ({
      type: 'ia',
      severity: 'medium',
      message: `Recomendo acompanhamento preventivo em ${centro.most_critical_sector || 'operação'}`
    }),
    () => ({
      type: 'memoria',
      severity: 'low',
      message: 'Padrão semelhante ao registrado há 14 dias — memória operacional ativa'
    }),
    () => ({
      type: 'ia',
      severity: 'low',
      message: 'Detectada redução de interação entre supervisão e RH'
    }),
    () => ({
      type: 'risco',
      severity: centro.operational_risk_score > 40 ? 'medium' : 'low',
      message: `Risco operacional variando — score ${centro.operational_risk_score}`
    })
  ];

  let t = Date.now();
  let i = 0;
  while (out.length < minItems) {
    const tpl = templates[i % templates.length]();
    t -= 45000 + seededFloat(seed, 60 + i, 0, 20000);
    out.push({
      id: `syn-${seed}-${i}`,
      time: formatTime(new Date(t)),
      ts: new Date(t).toISOString(),
      synthetic: true,
      ...tpl,
      source: 'cognitive_engine'
    });
    i++;
  }

  if (orgCtx.departamento) {
    out.unshift({
      id: `ctx-${seed}`,
      time: formatTime(new Date()),
      ts: new Date().toISOString(),
      type: 'contexto',
      severity: 'low',
      message: `Contexto ativo: ${orgCtx.cargo || 'colaborador'} · ${orgCtx.departamento}`,
      source: 'identity'
    });
  }

  return out.sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, minItems);
}

function buildPredictionCurves(seed) {
  const points = 12;
  const risk = [];
  const prod = [];
  const turnover = [];
  for (let i = 0; i < points; i++) {
    risk.push(Math.round(28 + seededFloat(seed, 70 + i, 0, 22) + i * 1.2));
    prod.push(Math.round(72 + seededFloat(seed, 80 + i, -4, 6) - i * 0.3));
    turnover.push(Math.round(35 + seededFloat(seed, 90 + i, 0, 15) + (i > 8 ? 4 : 0)));
  }
  return {
    risk_14d: risk,
    productivity_7d: prod,
    turnover_risk_14d: turnover,
    labels: Array.from({ length: points }, (_, i) => `T${i + 1}`)
  };
}

function buildNeuralGraph(heatmap, centro) {
  const nodes = [
    { id: 'core', label: 'IA Central', x: 50, y: 50, role: 'core' },
    { id: 'risk', label: 'Risco', x: 22, y: 28 },
    { id: 'eff', label: 'Eficiência', x: 78, y: 28 },
    { id: 'comm', label: 'Comunicação', x: 18, y: 72 },
    { id: 'ops', label: 'Operação', x: 82, y: 72 }
  ];
  heatmap.slice(0, 4).forEach((s, i) => {
    const angles = [10, 35, 65, 88];
    const a = (angles[i] * Math.PI) / 180;
    nodes.push({
      id: `sec-${s.id}`,
      label: s.name,
      x: 50 + Math.cos(a) * 38,
      y: 50 + Math.sin(a) * 32,
      role: 'sector',
      intensity: s.intensity
    });
  });
  const links = [
    { from: 'core', to: 'risk', strength: centro.operational_risk_score / 100 },
    { from: 'core', to: 'eff', strength: (centro.global_efficiency_pct || 80) / 100 },
    { from: 'core', to: 'comm', strength: 0.65 },
    { from: 'core', to: 'ops', strength: 0.72 }
  ];
  nodes.filter((n) => n.role === 'sector').forEach((n) => {
    links.push({ from: 'core', to: n.id, strength: (n.intensity || 40) / 100 });
  });
  return { nodes, links };
}

function enrichHeatmap(sectors, seed) {
  return sectors.map((s, i) => ({
    ...s,
    sync_pct: clamp(Math.round(90 - s.intensity * 0.35 + seededFloat(seed, 100 + i, -3, 3)), 55, 98),
    pulse: s.intensity >= 42
  }));
}

function enrichPredictions(predictions, curves, centro) {
  const base = [...predictions];
  const extras = [
    {
      key: 'failure_trend',
      title: 'Tendência de falhas',
      trend: 'down',
      horizon: '7 dias',
      level: 'Baixo',
      detail: 'Curva de falhas em redução no horizonte analítico.',
      sparkline: curves.risk_14d.slice(-8)
    },
    {
      key: 'turnover_spark',
      title: 'Risco de turnover',
      trend: 'up',
      horizon: '14 dias',
      level: 'Médio',
      detail: 'Projeção comportamental com pressão moderada.',
      sparkline: curves.turnover_risk_14d.slice(-8)
    },
    {
      key: 'overload_48',
      title: 'Sobrecarga operacional',
      trend: centro.open_tasks > 8 ? 'up' : 'stable',
      horizon: '48h',
      level: centro.open_tasks > 8 ? 'Médio' : 'Baixo',
      detail: centro.active_bottleneck,
      sparkline: curves.productivity_7d.slice(-8)
    }
  ];
  for (const e of extras) {
    if (!base.find((p) => p.key === e.key)) base.push(e);
  }
  return base.map((p) => ({
    ...p,
    sparkline: p.sparkline || curves.risk_14d?.slice(-8) || []
  }));
}

function enrichIaObservations(lines, orgCtx, tension, globalState) {
  const extra = [
    'Detectei redução de comunicação entre supervisão e RH.',
    'Existe tendência de sobrecarga operacional — recomendo acompanhamento preventivo.',
    `Sincronia organizacional em ${tension.organizational_sync_pct}% — pressão ${tension.operational_pressure.toLowerCase()}.`,
    `Estado global: ${globalState.headline}.`,
    'Comportamento recorrente detectado na memória operacional.'
  ];
  const merged = [...lines];
  for (const e of extra) {
    if (merged.length >= 8) break;
    if (!merged.includes(e)) merged.push(e);
  }
  return merged;
}

function enrichMemory(memory, seed) {
  const extra = [
    'Evento semelhante ocorreu há 12 dias no mesmo setor.',
    'Setor já apresentou essa tendência anteriormente.',
    'Comportamento recorrente detectado — padrão armazenado.'
  ];
  const out = [...memory];
  for (const e of extra) {
    if (out.length >= 4) break;
    if (!out.includes(e)) out.push(e);
  }
  return out;
}

function enrichTimeline(timeline, seed) {
  if (timeline.length >= 6) return timeline;
  const synth = [
    { label: 'início do turno', detail: 'sincronização operacional' },
    { label: 'IA gerou alerta preventivo', detail: 'motor cognitivo' },
    { label: 'eficiência ajustada', detail: 'variação detectada' },
    { label: 'cruzamento intersetorial', detail: 'RH · produção' }
  ];
  let t = Date.now() - 4 * 3600000;
  const out = [...timeline];
  synth.forEach((s, i) => {
    if (out.length >= 8) return;
    t -= seededFloat(seed, 200 + i, 600000, 2400000);
    out.push({
      time: formatTime(new Date(t)),
      ts: new Date(t).toISOString(),
      label: s.label,
      detail: s.detail,
      synthetic: true
    });
  });
  return out.sort((a, b) => new Date(b.ts) - new Date(a.ts));
}

module.exports = {
  livingSeed,
  applyLivingOscillation,
  buildOrganizationalTension,
  buildGlobalOperationState,
  buildBlackbox,
  loadOrgMap,
  expandFeedIntelligently,
  buildPredictionCurves,
  buildNeuralGraph,
  enrichHeatmap,
  enrichPredictions,
  enrichIaObservations,
  enrichMemory,
  enrichTimeline
};
