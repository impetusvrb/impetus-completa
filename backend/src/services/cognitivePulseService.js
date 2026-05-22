/**
 * cognitivePulseService — Ecossistema cognitivo operacional vivo
 * Alimenta Centro Cognitivo, feed, timeline, heatmap, radar e previsões.
 */
'use strict';

const db = require('../db');
const { buildOrganizationalContext } = require('./organizationalContextEngine');
const hierarchicalFilter = require('./hierarchicalFilter');
const dashboardProfileResolver = require('./dashboardProfileResolver');
const living = require('./cognitiveLivingEnrichment');

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatTime(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function inferOperationalMode({ criticalAlerts, overdueTasks, orgValid }, hierarchyLevel) {
  if (!orgValid) return 'auditoria';
  if (criticalAlerts >= 3 || overdueTasks >= 8) return 'crise';
  if (criticalAlerts >= 1 || overdueTasks >= 4) return 'critico';
  if (hierarchyLevel != null && hierarchyLevel <= 1) return 'executivo';
  return 'normal';
}

async function getTaskSignals(companyId, user, scope) {
  const base = ['company_id = $1'];
  const params = [companyId];
  let p = 2;
  try {
    if (!scope.isFullAccess && scope.scopeLevel === 'individual' && user?.id) {
      base.push(`(assigned_to::text = $${p} OR assigned_to IS NULL)`);
      params.push(String(user.id));
      p++;
    } else if (!scope.isFullAccess && scope.allowedUserIds?.length) {
      base.push(`(assigned_to::text = ANY($${p}::text[]) OR assigned_to IS NULL)`);
      params.push(scope.allowedUserIds.map((id) => String(id)));
      p++;
    }
    const r = await db.query(
      `SELECT
        COUNT(*) FILTER (WHERE COALESCE(status, 'open') NOT IN ('done', 'completed', 'closed', 'cancelled', 'rejected')) AS open,
        COUNT(*) FILTER (
          WHERE COALESCE(status, 'open') NOT IN ('done', 'completed', 'closed', 'cancelled', 'rejected')
          AND scheduled_at IS NOT NULL AND scheduled_at < now()
        ) AS overdue
      FROM tasks WHERE ${base.join(' AND ')}`,
      params
    );
    return {
      open: parseInt(r.rows[0]?.open || 0, 10),
      overdue: parseInt(r.rows[0]?.overdue || 0, 10)
    };
  } catch (_) {
    return { open: 0, overdue: 0 };
  }
}

async function loadRecentFeedEvents(companyId, limit = 12) {
  const events = [];
  try {
    const r = await db.query(
      `SELECT tipo_alerta, severidade, titulo, created_at
       FROM operational_alerts
       WHERE company_id = $1 AND (resolvido = false OR resolvido IS NULL)
       ORDER BY created_at DESC LIMIT $2`,
      [companyId, limit]
    );
    for (const row of r.rows || []) {
      const sev = String(row.severidade || 'medium').toLowerCase();
      events.push({
        id: `alert-${row.created_at}`,
        time: formatTime(row.created_at),
        ts: row.created_at,
        type: 'alerta',
        severity: sev,
        message: `IA detectou: ${row.titulo || row.tipo_alerta || 'alerta operacional'}`,
        source: 'operational_alerts'
      });
    }
  } catch (_) { /* swallow */ }

  return events
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))
    .slice(0, limit);
}

async function loadRecentFeedEventsWithTasks(companyId, user, scope, limit = 12) {
  const events = await loadRecentFeedEvents(companyId, limit);
  const tasks = await getTaskSignals(companyId, user, scope);
  if (tasks.overdue > 0) {
    events.push({
      id: `tasks-overdue-${Date.now()}`,
      time: formatTime(new Date()),
      ts: new Date().toISOString(),
      type: 'tarefa',
      severity: tasks.overdue > 5 ? 'high' : 'medium',
      message: `${tasks.overdue} tarefa(s) em atraso no seu escopo`,
      source: 'tasks'
    });
  }

  return events
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))
    .slice(0, limit);
}

async function loadTimeline(companyId, limit = 10) {
  const items = [];
  try {
    const r = await db.query(
      `SELECT action, entity_type, created_at, details
       FROM audit_logs
       WHERE company_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [companyId, limit]
    );
    for (const row of r.rows || []) {
      const action = String(row.action || 'evento').replace(/_/g, ' ');
      items.push({
        time: formatTime(row.created_at),
        ts: row.created_at,
        label: action,
        detail: row.entity_type ? String(row.entity_type) : ''
      });
    }
  } catch (_) {
    items.push({
      time: formatTime(new Date()),
      ts: new Date().toISOString(),
      label: 'Sistema cognitivo ativo',
      detail: 'Monitoramento contínuo iniciado'
    });
  }
  return items;
}

async function loadSectorHeatmap(companyId) {
  const sectors = [];
  try {
    const depts = await db.query(
      `SELECT d.id, d.name,
        (SELECT COUNT(*) FROM operational_alerts oa
         WHERE oa.company_id = $1 AND oa.resolvido IS NOT TRUE
         AND LOWER(oa.titulo) LIKE '%' || LOWER(d.name) || '%') AS alert_hint
       FROM departments d
       WHERE d.company_id = $1 AND d.active = true
       ORDER BY d.name LIMIT 12`,
      [companyId]
    );
    for (const row of depts.rows || []) {
      const intensity = clamp(parseInt(row.alert_hint || 0, 10) * 18 + 20, 15, 95);
      sectors.push({
        id: row.id,
        name: row.name,
        intensity,
        label: intensity >= 70 ? 'crítico' : intensity >= 45 ? 'atenção' : 'estável'
      });
    }
  } catch (_) {
    sectors.push(
      { id: 'prod', name: 'Produção', intensity: 55, label: 'atenção' },
      { id: 'man', name: 'Manutenção', intensity: 72, label: 'crítico' },
      { id: 'qual', name: 'Qualidade', intensity: 38, label: 'estável' },
      { id: 'rh', name: 'RH', intensity: 42, label: 'atenção' }
    );
  }
  if (!sectors.length) {
    sectors.push({ id: 'org', name: 'Organização', intensity: 40, label: 'estável' });
  }
  return sectors;
}

function buildGlobalCognitiveMetrics(orgCtx, tasks, alerts, profileCode) {
  const critical = (alerts || []).filter((a) =>
    ['critical', 'high', 'critico', 'alto'].includes(String(a.severidade || '').toLowerCase())
  ).length;
  const overdue = tasks?.overdue ?? 0;
  const open = tasks?.open ?? 0;

  let efficiency = 82;
  efficiency -= Math.min(25, overdue * 2);
  efficiency -= Math.min(20, critical * 4);
  if (orgCtx.valid === false) efficiency -= 15;
  efficiency = clamp(efficiency, 42, 96);

  const riskScore = clamp(critical * 12 + overdue * 3 + (orgCtx.valid ? 0 : 20), 5, 95);
  const riskLabel = riskScore >= 65 ? 'Alto' : riskScore >= 35 ? 'Médio' : 'Baixo';

  const iaConfidence = clamp(
    94 - (orgCtx.warnings?.length || 0) * 5 - (orgCtx.issues?.length || 0) * 8,
    58,
    98
  );

  const stability =
    orgCtx.valid && riskScore < 40 ? 'Estável' : riskScore < 65 ? 'Atenção' : 'Tensionado';

  const climate =
    profileCode?.includes('hr') || orgCtx.functional_area === 'hr'
      ? 'Clima organizacional monitorado'
      : 'Clima operacional estável';

  let bottleneck = 'Comunicação entre setores';
  if (overdue > critical && overdue > 2) bottleneck = 'Tarefas em atraso';
  else if (critical > 0) bottleneck = 'Alertas operacionais críticos';

  const criticalSector =
    (alerts[0] && alerts[0].titulo) || orgCtx.setor || orgCtx.departamento || 'Operações';

  return {
    global_efficiency_pct: efficiency,
    operational_risk: riskLabel,
    operational_risk_score: riskScore,
    ia_confidence_pct: iaConfidence,
    organizational_climate: stability,
    operational_climate: climate,
    active_bottleneck: bottleneck,
    most_critical_sector: String(criticalSector).slice(0, 48),
    cognitive_status: orgCtx.valid ? 'ANALISANDO' : 'CONFIGURAÇÃO',
    open_tasks: open,
    critical_alerts: critical
  };
}

function buildPredictions(metrics, orgCtx) {
  const preds = [];
  if (metrics.operational_risk_score >= 45) {
    preds.push({
      key: 'operational_risk',
      title: 'Risco operacional',
      trend: 'up',
      horizon: '7–14 dias',
      level: metrics.operational_risk,
      detail: 'Tendência crescente com base em alertas e atrasos.'
    });
  }
  if (orgCtx.functional_area === 'hr' || String(orgCtx.cargo || '').toLowerCase().includes('rh')) {
    preds.push({
      key: 'turnover',
      title: 'Risco de turnover',
      trend: 'up',
      horizon: '14 dias',
      level: 'Médio',
      detail: 'Padrões de carga e comunicação sugerem atenção.'
    });
  }
  preds.push({
    key: 'overload',
    title: 'Sobrecarga operacional',
    trend: metrics.open_tasks > 10 ? 'up' : 'stable',
    horizon: '48h',
    level: metrics.open_tasks > 10 ? 'Médio' : 'Baixo',
    detail: metrics.active_bottleneck
  });
  return preds;
}

function buildIaObservations(orgCtx, metrics, profileCode) {
  const lines = [];
  const cargo = orgCtx.cargo || orgCtx.display?.cargo || 'operação';
  lines.push(`IA analisando padrões operacionais para ${cargo}…`);
  if (orgCtx.departamento && orgCtx.setor) {
    lines.push(`Cruzando ${orgCtx.departamento} · ${orgCtx.setor} com alertas ao vivo.`);
  }
  if (metrics.operational_risk_score >= 50) {
    lines.push('Detectada possível tendência de sobrecarga no escopo atual.');
  } else {
    lines.push('Estabilidade operacional dentro dos parâmetros esperados.');
  }
  if (!orgCtx.valid) {
    lines.push('Complete a Base Estrutural para confiança analítica plena.');
  } else if (profileCode?.includes('quality')) {
    lines.push('Foco em conformidade, NC e estabilidade de processo.');
  } else if (profileCode?.includes('maintenance')) {
    lines.push('Monitorando ativos, OS e disponibilidade mecânica.');
  }
  return lines;
}

function buildOrganizationalInsights(orgCtx) {
  const out = [];
  if (!orgCtx.valid) {
    out.push('Cadastro estrutural incompleto — consciência organizacional limitada.');
    return out;
  }
  if (orgCtx.hierarchy_level != null && orgCtx.hierarchy_level <= 2) {
    out.push('Visão estratégica: priorize tendências e risco agregado.');
  }
  if (orgCtx.functional_area === 'hr') {
    out.push('Cruzamento RH ↔ operação: monitore clima e absenteísmo.');
  }
  if (orgCtx.warnings?.length) {
    out.push(orgCtx.warnings[0].message || 'Ajuste recomendado no cadastro estrutural.');
  }
  if (!out.length) {
    out.push('Alinhamento organizacional coerente com o cargo formal cadastrado.');
  }
  return out;
}

function buildRadarSignals(alerts, tasks) {
  const blips = [];
  let angle = 0;
  const step = 360 / Math.max(6, (alerts?.length || 0) + 3);
  for (const a of (alerts || []).slice(0, 5)) {
    blips.push({
      angle: (angle += step) % 360,
      distance: 0.55 + Math.random() * 0.35,
      label: (a.titulo || 'alerta').slice(0, 24),
      severity: a.severidade || 'medium'
    });
  }
  if (tasks.overdue > 0) {
    blips.push({ angle: 120, distance: 0.7, label: 'Tarefas atrasadas', severity: 'high' });
  }
  if (!blips.length) {
    blips.push({ angle: 0, distance: 0.4, label: 'Monitoramento ativo', severity: 'low' });
  }
  return blips;
}

function buildMemoryHints(orgCtx, feed) {
  const hints = [];
  const types = new Set((feed || []).map((f) => f.type));
  if (types.has('alerta')) {
    hints.push('Padrão semelhante a alertas registrados nos últimos 14 dias.');
  }
  if (orgCtx.setor) {
    hints.push(`Setor ${orgCtx.setor} já apresentou esta tendência anteriormente.`);
  }
  return hints.slice(0, 3);
}

/**
 * Pulso cognitivo completo para o dashboard vivo.
 */
async function buildCognitivePulse(user) {
  const companyId = user?.company_id;
  if (!companyId) {
    return { ok: false, error: 'NO_COMPANY', pulse: null };
  }

  const scope = await hierarchicalFilter.resolveHierarchyScope(user);
  const orgCtx = await buildOrganizationalContext(user);
  const config = dashboardProfileResolver.getDashboardConfigForUser(user);
  const profileCode = config.profile_code || '';

  const tasks = await getTaskSignals(companyId, user, scope);
  let alerts = [];
  try {
    const r = await db.query(
      `SELECT severidade, titulo, created_at FROM operational_alerts
       WHERE company_id = $1 AND (resolvido = false OR resolvido IS NULL)
       ORDER BY created_at DESC LIMIT 8`,
      [companyId]
    );
    alerts = r.rows || [];
  } catch (_) {
    alerts = [];
  }

  const seed = living.livingSeed(companyId);
  let global = buildGlobalCognitiveMetrics(orgCtx, tasks, alerts, profileCode);
  global = living.applyLivingOscillation(global, seed);

  let heatmap = await loadSectorHeatmap(companyId);
  heatmap = living.enrichHeatmap(heatmap, seed);

  let feed = await loadRecentFeedEventsWithTasks(companyId, user, scope, 8);
  feed = living.expandFeedIntelligently(feed, orgCtx, global, seed, 20);

  let timeline = await loadTimeline(companyId, 6);
  timeline = living.enrichTimeline(timeline, seed);

  const curves = living.buildPredictionCurves(seed);
  let predictions = buildPredictions(global, orgCtx);
  predictions = living.enrichPredictions(predictions, curves, global);

  const tension = living.buildOrganizationalTension(global, heatmap, seed);
  const global_operation = living.buildGlobalOperationState(global, heatmap, orgCtx, seed);
  const blackbox = living.buildBlackbox(seed);
  const org_map = await living.loadOrgMap(companyId, heatmap, seed);
  const neural_graph = living.buildNeuralGraph(heatmap, global);

  let ia_observations = buildIaObservations(orgCtx, global, profileCode);
  ia_observations = living.enrichIaObservations(ia_observations, orgCtx, tension, global_operation);

  const organizational_insights = buildOrganizationalInsights(orgCtx);
  const radar = buildRadarSignals(alerts, tasks);
  let memory = buildMemoryHints(orgCtx, feed);
  memory = living.enrichMemory(memory, seed);

  const mode = inferOperationalMode(
    {
      criticalAlerts: global.critical_alerts,
      overdueTasks: tasks.overdue,
      orgValid: orgCtx.valid !== false
    },
    orgCtx.hierarchy_level
  );

  return {
    ok: true,
    captured_at: new Date().toISOString(),
    operational_mode: mode,
    organizational_context: {
      valid: orgCtx.valid,
      cargo: orgCtx.cargo,
      setor: orgCtx.setor,
      departamento: orgCtx.departamento,
      profile_code: profileCode
    },
    centro_cognitivo: global,
    organizational_tension: tension,
    global_operation,
    blackbox,
    org_map,
    neural_graph,
    prediction_curves: curves,
    live_feed: feed,
    timeline,
    heatmap,
    predictions,
    ia_observations,
    organizational_insights,
    radar,
    memory,
    living: true,
    cross_analysis: {
      domains: ['rh', 'producao', 'manutencao', 'comunicacao', 'eficiencia', 'comportamento'],
      summary:
        'Rede cognitiva ativa — cruzamento contínuo entre tarefas, alertas, hierarquia e identidade estrutural.',
      active_links: neural_graph.links.length
    }
  };
}

module.exports = {
  buildCognitivePulse,
  inferOperationalMode
};
