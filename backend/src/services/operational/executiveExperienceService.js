'use strict';

/**
 * FASE 7 — EXECUTIVE EXPERIENCE REFINEMENT
 *
 * Consolida experiência executiva madura com narrativa contextual,
 * priorização dinâmica de widgets e governance de densidade cognitiva.
 *
 * Feature flag: EXECUTIVE_EXPERIENCE_ENABLED (default true)
 */

const ENABLED = process.env.EXECUTIVE_EXPERIENCE_ENABLED !== 'false';
const MAX_WIDGETS_PER_PROFILE = parseInt(process.env.EXECUTIVE_MAX_WIDGETS || '8', 10);
const ALERT_SATURATION_THRESHOLD = parseInt(process.env.EXECUTIVE_ALERT_SATURATION || '12', 10);

/**
 * Constrói narrativa executiva consolidada a partir de dados brutos.
 */
function buildExecutiveNarrative(data = {}) {
  if (!ENABLED) return null;

  const { kpis = [], alerts = [], tasks = [], events = [], profile } = data;
  const parts = [];

  const criticalAlerts = alerts.filter(a => a.severity === 'critica' || a.severity === 'alta');
  if (criticalAlerts.length > 0) {
    parts.push(`⚠️ ${criticalAlerts.length} alerta(s) crítico(s) exigem atenção imediata.`);
  }

  const overdueTasks = tasks.filter(t => t.scheduled_at && new Date(t.scheduled_at) < new Date());
  if (overdueTasks.length > 0) {
    parts.push(`📋 ${overdueTasks.length} tarefa(s) com prazo vencido.`);
  }

  const recentEvents = events.slice(0, 3);
  if (recentEvents.length > 0) {
    parts.push(`📊 Últimos eventos: ${recentEvents.map(e => e.descricao || e.tipo_evento).join('; ')}.`);
  }

  if (kpis.length > 0) {
    const highlights = kpis.filter(k => k.trend === 'down' || k.status === 'critical').slice(0, 3);
    if (highlights.length) {
      parts.push(`📉 KPIs em atenção: ${highlights.map(k => k.label || k.name).join(', ')}.`);
    }
  }

  if (parts.length === 0) {
    parts.push('✅ Sem alertas críticos no momento. Operação estável.');
  }

  return {
    narrative: parts.join('\n'),
    priority: criticalAlerts.length > 0 ? 'high' : overdueTasks.length > 0 ? 'medium' : 'low',
    density: _computeDensity(data)
  };
}

/**
 * Prioriza widgets dinamicamente baseado em contexto temporal e hierárquico.
 */
function prioritizeWidgets(widgets = [], context = {}) {
  if (!ENABLED) return widgets;

  const scored = widgets.map(w => {
    let score = w.baseScore || 50;
    if (w.hasCriticalData) score += 30;
    if (w.hasOverdue) score += 20;
    if (w.lastInteraction && Date.now() - w.lastInteraction < 3600000) score += 10;
    if (w.matchesRole && w.matchesRole === context.role) score += 15;
    if (w.temporalRelevance) score += w.temporalRelevance;
    return { ...w, _score: Math.min(score, 100) };
  });

  return scored
    .sort((a, b) => b._score - a._score)
    .slice(0, MAX_WIDGETS_PER_PROFILE);
}

function _computeDensity(data) {
  const totalItems = (data.kpis?.length || 0) + (data.alerts?.length || 0) +
    (data.tasks?.length || 0) + (data.events?.length || 0);

  if (totalItems > ALERT_SATURATION_THRESHOLD) {
    return { level: 'saturated', recommendation: 'Reduzir visibilidade de itens não-críticos' };
  }
  if (totalItems > ALERT_SATURATION_THRESHOLD * 0.7) {
    return { level: 'high', recommendation: 'Priorizar apenas alertas críticos' };
  }
  return { level: 'optimal', recommendation: null };
}

/**
 * Verifica saturação cognitiva e recomenda redução se necessário.
 */
function checkCognitiveSaturation(alertCount, taskCount) {
  const total = (alertCount || 0) + (taskCount || 0);
  if (total > ALERT_SATURATION_THRESHOLD) {
    return {
      saturated: true,
      total,
      threshold: ALERT_SATURATION_THRESHOLD,
      action: 'reduce_non_critical'
    };
  }
  return { saturated: false, total };
}

module.exports = {
  buildExecutiveNarrative,
  prioritizeWidgets,
  checkCognitiveSaturation,
  isEnabled: () => ENABLED
};
