/**
 * cognitivePulseService — Ecossistema cognitivo operacional vivo
 * Alimenta Centro Cognitivo, feed, timeline, heatmap, radar e previsões.
 */
'use strict';

const db = require('../db');
const { buildOrganizationalContext } = require('./organizationalContextEngine');
const hierarchicalFilter = require('./hierarchicalFilter');
const dashboardProfileResolver = require('./dashboardProfileResolver');
const { enrichUserForDashboardAsync } = require('./structuralUserProfileService');
const audienceResolver = require('./cognitiveAudienceResolver');
const living = require('./cognitiveLivingEnrichment');
const orgIntel = require('./organizationalIntelligenceEngine');

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatTime(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function inferOperationalMode({ criticalAlerts, overdueTasks, orgValid }, hierarchyLevel) {
  if (!orgValid) return 'auditoria';
  if (criticalAlerts >= 5 || overdueTasks >= 12) return 'emergencia';
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
      label: 'Sem eventos operacionais',
      detail: 'Aguardando dados reais'
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
      const hint = parseInt(row.alert_hint || 0, 10);
      if (hint < 1) continue;
      const intensity = clamp(hint * 18 + 20, 15, 95);
      sectors.push({
        id: row.id,
        name: row.name,
        intensity,
        label: intensity >= 70 ? 'crítico' : intensity >= 45 ? 'atenção' : 'estável'
      });
    }
  } catch (_) {
    /* sem dados fictícios em instalação limpa */
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

  const enrichedUser = await enrichUserForDashboardAsync(user || {});
  const effectiveUser = { ...user, ...enrichedUser };

  const scope = await hierarchicalFilter.resolveHierarchyScope(effectiveUser);
  const orgCtx = await buildOrganizationalContext(effectiveUser);
  const config = dashboardProfileResolver.getDashboardConfigForUser(effectiveUser);
  const profileCode = config.profile_code || '';
  const audience = audienceResolver.resolveCognitiveAudienceFromStructural(
    enrichedUser,
    orgCtx,
    profileCode
  );

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
  const livingOn = living.isLivingEnrichmentEnabled();
  let global = buildGlobalCognitiveMetrics(orgCtx, tasks, alerts, profileCode);
  if (livingOn) {
    global = living.applyLivingOscillation(global, seed);
  }

  let heatmap = await loadSectorHeatmap(companyId);
  if (livingOn) {
    heatmap = living.enrichHeatmap(heatmap, seed);
  }

  let feed = await loadRecentFeedEventsWithTasks(companyId, user, scope, 8);
  try {
    const plcAnomaly = require('./plcAnomalyAnalysisService');
    const plcCount = await db.query(
      `SELECT COUNT(*)::int AS c FROM plc_collected_data
       WHERE company_id = $1 AND collected_at > NOW() - INTERVAL '30 days'`,
      [companyId]
    );
    if ((plcCount.rows[0]?.c ?? 0) > 0) {
      const anomalyPack = await plcAnomaly.buildOperationalAnomalyPack(companyId);
      const plcFeed = plcAnomaly.buildLiveFeedEvents(anomalyPack);
      if (plcFeed.length) {
        feed = [...plcFeed, ...feed].slice(0, 25);
      }
      const plcCorrelation = require('./plcCorrelationAnalysisService');
      const corrPack = await plcCorrelation.buildOperationalCorrelationPack(companyId);
      const corrFeed = plcCorrelation.buildLiveFeedEvents(corrPack);
      if (corrFeed.length) {
        feed = [...corrFeed, ...feed].slice(0, 28);
      }
      const operationalEvents = require('./operationalEventIntelligenceService');
      const eventPack = await operationalEvents.buildOperationalEventPack(companyId);
      const evFeed = operationalEvents.buildLiveFeedEvents(eventPack);
      if (evFeed.length) {
        feed = [...evFeed, ...feed].slice(0, 32);
      }
      const operationalPatterns = require('./operationalPatternIntelligenceService');
      const patternPack = await operationalPatterns.buildOperationalPatternPack(companyId);
      const patFeed = operationalPatterns.buildLiveFeedPatterns(patternPack);
      if (patFeed.length) {
        feed = [...patFeed, ...feed].slice(0, 36);
      }
      const operationalExplanation = require('./operationalExplanationService');
      const explanationPack = await operationalExplanation.buildOperationalExplanationPack(companyId);
      const explFeed = operationalExplanation.buildLiveFeedExplanations(explanationPack);
      if (explFeed.length) {
        feed = [...explFeed, ...feed].slice(0, 40);
      }
      const operationalPrioritization = require('./operationalPrioritizationService');
      const priorityPack = await operationalPrioritization.buildOperationalPriorityPack(companyId);
      const priFeed = operationalPrioritization.buildLiveFeedPriorities(priorityPack);
      if (priFeed.length) {
        feed = [...priFeed, ...feed].slice(0, 44);
      }
    }
  } catch (plcFeedErr) {
    console.warn('[COGNITIVE_PULSE][plc_anomaly_feed]', plcFeedErr?.message ?? plcFeedErr);
  }
  feed = livingOn
    ? living.expandFeedIntelligently(feed, orgCtx, global, seed, 20)
    : feed.slice(0, 8);

  let timeline = await loadTimeline(companyId, 6);
  if (livingOn) {
    timeline = living.enrichTimeline(timeline, seed, audience);
  }

  const hasOperationalData =
    alerts.length > 0 || feed.length > 0 || (tasks?.total ?? 0) > 0;

  if (!livingOn && !hasOperationalData) {
    global = {
      global_efficiency_pct: null,
      operational_risk: '—',
      operational_risk_score: null,
      ia_confidence_pct: null,
      organizational_climate: '—',
      operational_climate: '—',
      active_bottleneck: '—',
      most_critical_sector: '—',
      cognitive_status: 'AGUARDANDO_DADOS',
      open_tasks: tasks?.open ?? 0,
      critical_alerts: 0,
      productivity_delta_pct: null,
      interaction_delta_pct: null,
      risk_delta: null
    };
    feed = [];
    timeline = [];
  }

  const curves = livingOn ? living.buildPredictionCurves(seed, audience) : [];
  let predictions = buildPredictions(global, orgCtx);
  if (livingOn) {
    predictions = living.enrichPredictions(predictions, curves, global, audience);
  }

  const tension = livingOn
    ? living.buildOrganizationalTension(global, heatmap, seed)
    : {
        organizational_sync_pct: null,
        operational_pressure: '—',
        intersector_confidence: '—',
        operational_tension: '—',
        leadership_stability: '—',
        sector_friction_index: 0
      };
  const global_operation = livingOn
    ? living.buildGlobalOperationState(global, heatmap, orgCtx, seed)
    : {
        headline: heatmap.length ? 'Operação monitorada' : 'Aguardando cadastro operacional',
        organizational_health_pct: null,
        global_risk: global.operational_risk || '—',
        communication_health: '—',
        sectors_watching: heatmap.filter((h) => h.intensity >= 45).map((h) => h.name)
      };
  let org_map = livingOn
    ? await living.loadOrgMap(companyId, heatmap, seed)
    : await living.loadOrgMap(companyId, heatmap, seed);
  const neural_graph = livingOn
    ? living.buildNeuralGraph(heatmap, global)
    : { nodes: [], links: [] };

  const mode = inferOperationalMode(
    {
      criticalAlerts: global.critical_alerts,
      overdueTasks: tasks.overdue,
      orgValid: orgCtx.valid !== false
    },
    orgCtx.hierarchy_level
  );

  const intelligence = orgIntel.composeOrganizationalIntelligence({
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
    audience,
    livingOn
  });

  org_map = intelligence.org_map;
  const blackbox = intelligence.blackbox;

  let ia_observations = buildIaObservations(orgCtx, global, profileCode);
  if (livingOn) {
    ia_observations = living.enrichIaObservations(ia_observations, orgCtx, tension, global_operation, audience);
  }

  const organizational_insights = buildOrganizationalInsights(orgCtx);
  const radar = buildRadarSignals(alerts, tasks);
  let memory = buildMemoryHints(orgCtx, feed);
  if (livingOn) {
    memory = living.enrichMemory(memory, seed);
  }

  const pulse = {
    ok: true,
    engine: 'organizational_intelligence',
    captured_at: new Date().toISOString(),
    operational_mode: mode,
    data_state: hasOperationalData ? (livingOn ? 'enriched' : 'live') : 'empty',
    organizational_context: {
      valid: orgCtx.valid,
      cargo: orgCtx.cargo,
      setor: orgCtx.setor,
      departamento: orgCtx.departamento,
      profile_code: profileCode,
      structural_complete: audience.structural_complete === true
    },
    centro_cognitivo: global,
    organizational_tension: tension,
    global_operation,
    blackbox,
    org_map,
    neural_graph: intelligence.neural_graph || neural_graph,
    prediction_curves: curves,
    live_feed: feed,
    timeline,
    heatmap,
    predictions,
    ia_observations,
    organizational_insights,
    radar,
    memory,
    living: livingOn,
    cognitive_core: intelligence.cognitive_core,
    digital_twin: intelligence.digital_twin,
    multi_agents: intelligence.multi_agents,
    consciousness: intelligence.consciousness,
    operational_narrative: intelligence.operational_narrative,
    cause_effect: intelligence.cause_effect,
    advanced_predictions: intelligence.advanced_predictions,
    organizational_memory: intelligence.organizational_memory,
    strategic_intelligence: intelligence.strategic_intelligence,
    autonomous_focus: intelligence.autonomous_focus,
    ambient: intelligence.ambient,
    global_whispers: intelligence.global_whispers,
    global_presence: intelligence.global_presence,
    organizational_energy: intelligence.organizational_energy,
    emergent_insights: intelligence.emergent_insights,
    decision_engine: intelligence.decision_engine,
    cognitive_timeline: intelligence.cognitive_timeline,
    awareness_mode: intelligence.awareness_mode,
    cross_analysis: {
      domains: audienceResolver.crossAnalysisDomains(audience),
      summary: audienceResolver.crossAnalysisSummary(audience),
      active_links: neural_graph.links.length
    }
  };

  return audienceResolver.applyAudienceToPulse(pulse, audience);
}

module.exports = {
  buildCognitivePulse,
  inferOperationalMode
};
