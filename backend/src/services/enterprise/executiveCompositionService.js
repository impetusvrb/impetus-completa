'use strict';

/**
 * IMPETUS — Executive Composition Service (Fase 2.1 + 2.2 + 2.3 + 2.4)
 * Priorização contextual de widgets, narrative layer e density control
 * para dashboards executivos.
 *
 * Consolida: dashboardComposerService, executiveMode, smartSummary,
 * dashboardWidgetRegistry em um motor de composição enterprise.
 *
 * Feature flag: IMPETUS_EXECUTIVE_COMPOSITION_ENABLED (default: false — shadow mode)
 */

const COMPOSITION_ENABLED =
  String(process.env.IMPETUS_EXECUTIVE_COMPOSITION_ENABLED || 'false').trim().toLowerCase() === 'true';

const URGENCY_WEIGHTS = Object.freeze({
  critical_alert: 100,
  operational_anomaly: 85,
  financial_risk: 80,
  maintenance_failure: 75,
  quality_deviation: 70,
  workforce_issue: 60,
  trend_negative: 50,
  trend_positive: 30,
  informational: 10
});

const DENSITY_LIMITS = Object.freeze({
  ceo: { max_widgets: 8, max_kpi_cards: 5, max_charts: 3, max_alerts: 3 },
  director: { max_widgets: 10, max_kpi_cards: 6, max_charts: 4, max_alerts: 4 },
  manager: { max_widgets: 12, max_kpi_cards: 8, max_charts: 5, max_alerts: 5 },
  default: { max_widgets: 15, max_kpi_cards: 10, max_charts: 6, max_alerts: 6 }
});

const HIERARCHY_LEVELS = Object.freeze({
  ceo: 1,
  director: 2,
  manager: 3,
  coordinator: 4,
  supervisor: 5,
  operator: 6
});

let _compositionsGenerated = 0;
let _narrativesGenerated = 0;
let _suppressedWidgets = 0;

/**
 * Score de importância para um widget candidato.
 */
function scoreWidget(widget, context) {
  if (!widget || typeof widget !== 'object') return 0;

  const urgencyBase = URGENCY_WEIGHTS[widget.urgency_type] || URGENCY_WEIGHTS.informational;
  let score = urgencyBase;

  if (widget.financial_impact_brl && widget.financial_impact_brl > 0) {
    score += Math.min(30, Math.log10(widget.financial_impact_brl) * 5);
  }

  if (widget.anomaly_detected) score += 20;
  if (widget.trend === 'negative') score += 15;
  if (widget.requires_action) score += 10;

  if (context && context.role) {
    const level = HIERARCHY_LEVELS[context.role] || 6;
    if (level <= 2 && widget.scope === 'strategic') score += 20;
    if (level >= 4 && widget.scope === 'operational') score += 15;
  }

  if (context && context.functional_area) {
    if (widget.domain === context.functional_area) score += 10;
  }

  return Math.min(200, Math.round(score));
}

/**
 * Composição inteligente: prioriza e limita widgets por contexto.
 * @param {Object[]} widgets - candidatos
 * @param {Object} context - { role, functional_area, cognitive_pressure, urgency_override }
 * @returns {{ widgets: Object[], suppressed: number, density: Object }}
 */
function compose(widgets, context = {}) {
  if (!Array.isArray(widgets) || !widgets.length) {
    return { widgets: [], suppressed: 0, density: { level: 'empty' } };
  }

  const role = context.role || 'default';
  const limits = DENSITY_LIMITS[role] || DENSITY_LIMITS.default;

  let adjustedMax = limits.max_widgets;
  if (context.cognitive_pressure === 'high') {
    adjustedMax = Math.max(4, Math.floor(adjustedMax * 0.6));
  } else if (context.cognitive_pressure === 'low') {
    adjustedMax = Math.min(adjustedMax + 3, 20);
  }

  const scored = widgets.map(w => ({
    ...w,
    _composition_score: scoreWidget(w, context)
  }));

  scored.sort((a, b) => b._composition_score - a._composition_score);

  const selected = scored.slice(0, adjustedMax);
  const suppressed = scored.length - selected.length;

  _compositionsGenerated++;
  _suppressedWidgets += suppressed;

  const density = {
    level: selected.length > limits.max_widgets * 0.8 ? 'high'
      : selected.length > limits.max_widgets * 0.4 ? 'medium'
      : 'low',
    widget_count: selected.length,
    max_allowed: adjustedMax,
    suppressed_count: suppressed,
    avg_score: selected.length
      ? Math.round(selected.reduce((s, w) => s + w._composition_score, 0) / selected.length)
      : 0
  };

  return { widgets: selected, suppressed, density };
}

/**
 * Executive Narrative Layer (Fase 2.3)
 * Gera blocos narrativos estruturados para dashboards executivos.
 * NÃO chama LLM — produz narrativa determinística a partir dos dados.
 */
function buildNarrative(snapshot, context = {}) {
  if (!snapshot || typeof snapshot !== 'object') {
    return { summary: '', highlights: [], tone: 'neutral', generated_at: new Date().toISOString() };
  }

  const highlights = [];
  let tone = 'positive';
  const parts = [];
  const role = context.role || 'manager';
  const isExecutive = (HIERARCHY_LEVELS[role] || 6) <= 2;

  if (snapshot.production) {
    const prod = snapshot.production;
    if (prod.oee && prod.oee.value != null) {
      const oee = Number(prod.oee.value);
      if (oee >= 85) {
        highlights.push({ domain: 'production', type: 'positive', text: `OEE em ${oee}% — acima da meta.` });
      } else if (oee < 70) {
        highlights.push({ domain: 'production', type: 'critical', text: `OEE em ${oee}% — abaixo do aceitável.` });
        tone = 'critical';
      } else {
        highlights.push({ domain: 'production', type: 'warning', text: `OEE em ${oee}% — atenção recomendada.` });
        if (tone === 'positive') tone = 'warning';
      }
    }
  }

  if (snapshot.maintenance) {
    const maint = snapshot.maintenance;
    if (maint.pending_orders && maint.pending_orders.value > 5) {
      highlights.push({ domain: 'maintenance', type: 'warning', text: `${maint.pending_orders.value} ordens de manutenção pendentes.` });
      if (tone === 'positive') tone = 'warning';
    }
    if (maint.mttr && maint.mttr.value != null) {
      highlights.push({ domain: 'maintenance', type: 'info', text: `MTTR atual: ${maint.mttr.value}${maint.mttr.unit || 'h'}.` });
    }
  }

  if (snapshot.quality) {
    const qual = snapshot.quality;
    if (qual.rejection_rate && Number(qual.rejection_rate.value) > 3) {
      highlights.push({ domain: 'quality', type: 'critical', text: `Taxa de rejeição em ${qual.rejection_rate.value}% — investigar.` });
      tone = 'critical';
    }
  }

  if (snapshot.energy) {
    const en = snapshot.energy;
    if (en.consumption_kwh && en.consumption_kwh.value != null) {
      highlights.push({ domain: 'energy', type: 'info', text: `Consumo energético: ${en.consumption_kwh.value} kWh.` });
    }
  }

  if (isExecutive) {
    parts.push('Síntese executiva:');
    const critCount = highlights.filter(h => h.type === 'critical').length;
    const warnCount = highlights.filter(h => h.type === 'warning').length;
    if (critCount > 0) parts.push(`${critCount} ponto(s) crítico(s) requerem atenção imediata.`);
    if (warnCount > 0) parts.push(`${warnCount} alerta(s) de atenção.`);
    if (critCount === 0 && warnCount === 0) parts.push('Operação estável — sem alertas relevantes.');
  } else {
    parts.push('Resumo operacional:');
    for (const h of highlights.slice(0, 5)) {
      parts.push(`• ${h.text}`);
    }
  }

  _narrativesGenerated++;

  return {
    summary: parts.join(' '),
    highlights,
    tone,
    role_perspective: role,
    generated_at: new Date().toISOString()
  };
}

/**
 * Dashboard Layout Scoring (Fase 2.2)
 * Scoreia a relevância de cada secção do dashboard.
 */
function scoreLayout(sections, context = {}) {
  if (!Array.isArray(sections)) return [];

  return sections.map(section => {
    let score = 50;
    if (section.has_anomaly) score += 30;
    if (section.has_critical_alert) score += 25;
    if (section.financial_impact) score += 20;
    if (section.trend_negative) score += 15;

    const role = context.role || 'default';
    const level = HIERARCHY_LEVELS[role] || 6;

    if (level <= 2 && section.type === 'strategic') score += 20;
    if (level <= 2 && section.type === 'tactical') score -= 10;
    if (level >= 4 && section.type === 'operational') score += 15;

    return { ...section, _layout_score: Math.min(200, Math.round(score)) };
  }).sort((a, b) => b._layout_score - a._layout_score);
}

function getMetrics() {
  return {
    compositions_generated: _compositionsGenerated,
    narratives_generated: _narrativesGenerated,
    suppressed_widgets: _suppressedWidgets,
    composition_enabled: COMPOSITION_ENABLED
  };
}

module.exports = {
  URGENCY_WEIGHTS,
  DENSITY_LIMITS,
  HIERARCHY_LEVELS,
  COMPOSITION_ENABLED,
  scoreWidget,
  compose,
  buildNarrative,
  scoreLayout,
  getMetrics
};
