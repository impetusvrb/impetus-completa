/**
 * FIN-EVOLVE-002 — Composição de dados executivos (sem novos cálculos de negócio).
 * Mapeia payloads existentes de costs / leakage / (opcional) billing para a UI.
 */
export const FIN_EVOLVE_002_PHASE = 'FIN-EVOLVE-002';
export const FIN_EVOLVE_002_PRINCIPLE = 'REUSE · COMPOSE · DELIVER VALUE · NEVER REBUILD';

export function formatFinanceMoney(v) {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return 'R$ 0';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

/**
 * @param {{ costsSummary?: object, topLoss?: object, projectedLoss?: object, leakageAlerts?: array, leakageRanking?: array, projectedImpact?: object, billing?: object|null }} raw
 */
export function composeFinanceExecutiveView(raw = {}) {
  const costsSummary = raw.costsSummary || {};
  const op = costsSummary.operational || {};
  const impact = costsSummary.impact_from_events || {};
  const exec = costsSummary.executive || {};
  const topLoss = raw.topLoss || {};
  const projectedLoss = raw.projectedLoss || {};
  const alerts = Array.isArray(raw.leakageAlerts) ? raw.leakageAlerts : [];
  const ranking = Array.isArray(raw.leakageRanking) ? raw.leakageRanking : [];
  const projectedImpact = raw.projectedImpact || {};
  const billing = raw.billing || null;

  const kpis = Object.freeze([
    Object.freeze({
      id: 'cost_day',
      label: 'Custo operacional / dia',
      value: formatFinanceMoney(op.per_day),
      hint: 'industrialCost · executive-summary',
      color: 'var(--cyan)'
    }),
    Object.freeze({
      id: 'cost_month',
      label: 'Custo operacional / mês',
      value: formatFinanceMoney(op.per_month),
      hint: 'industrialCost · executive-summary',
      color: 'var(--cyan)'
    }),
    Object.freeze({
      id: 'event_impact_24h',
      label: 'Impacto eventos 24h',
      value: formatFinanceMoney(impact.last_day),
      hint: 'impact_from_events',
      color: 'var(--amber)'
    }),
    Object.freeze({
      id: 'top_loss',
      label: 'Maior perda',
      value: formatFinanceMoney(topLoss.total ?? topLoss.value ?? topLoss.amount),
      hint: topLoss.origin || topLoss.label || topLoss.name || 'costs · top-loss',
      color: 'var(--red)'
    }),
    Object.freeze({
      id: 'projected_loss',
      label: 'Perda projectada',
      value: formatFinanceMoney(
        projectedLoss.projected ?? projectedLoss.total ?? projectedLoss.value
      ),
      hint: projectedLoss.hours ? `${projectedLoss.hours}h` : 'costs · projected-loss',
      color: 'var(--orange)'
    }),
    Object.freeze({
      id: 'leakage_projected',
      label: 'Impacto leakage projectado',
      value: formatFinanceMoney(
        projectedImpact.projected_impact ??
          projectedImpact.total ??
          projectedImpact.value ??
          projectedImpact.impact_30d
      ),
      hint: 'financial-leakage · projected-impact',
      color: 'var(--red)'
    }),
    Object.freeze({
      id: 'economic_proxy',
      label: 'Custo industrial (proxy)',
      value: formatFinanceMoney(exec.custo_industrial ?? op.per_day),
      hint: 'executive / operational compose',
      color: 'var(--green)'
    }),
    Object.freeze({
      id: 'billing_status',
      label: 'Billing / Wallet',
      value: billing?.status_label || (billing ? 'Disponível' : 'Ver módulo'),
      hint: billing?.hint || 'nexus · composição',
      color: 'var(--text-accent, var(--cyan))'
    })
  ]);

  const normalizedAlerts = alerts.slice(0, 8).map((a, i) =>
    Object.freeze({
      id: a.id || `alert_${i}`,
      title: a.title || a.message || a.alert || a.label || 'Alerta financeiro',
      severity: String(a.severity || a.level || a.priority || 'medium').toLowerCase(),
      source: a.source || a.origin || 'financial_leakage',
      evidence: a.evidence || a.detail || a.description || null
    })
  );

  const insights = [];
  if (op.per_day != null) {
    insights.push(
      Object.freeze({
        id: 'insight_costs',
        title: 'Custos industriais operacionais',
        summary: `Custo/dia ${formatFinanceMoney(op.per_day)} · custo/mês ${formatFinanceMoney(op.per_month)}`,
        source: 'industrial_costs',
        pathKey: 'costs'
      })
    );
  }
  if (ranking[0]) {
    const top = ranking[0];
    insights.push(
      Object.freeze({
        id: 'insight_leakage_top',
        title: 'Principal vazamento',
        summary: `${top.origin || top.name || top.leak_label || 'Origem'} · ${formatFinanceMoney(top.value ?? top.total ?? top.impacto ?? top.impact_30d)}`,
        source: 'financial_leakage',
        pathKey: 'leakage'
      })
    );
  }
  if (impact.last_7d != null) {
    insights.push(
      Object.freeze({
        id: 'insight_events_7d',
        title: 'Impacto de eventos (7 dias)',
        summary: formatFinanceMoney(impact.last_7d),
        source: 'industrial_costs',
        pathKey: 'costs'
      })
    );
  }
  if (billing) {
    insights.push(
      Object.freeze({
        id: 'insight_billing',
        title: 'Nexus Billing / Wallet / Ledger',
        summary: billing.summary || 'Carteira e ledger disponíveis no módulo Billing',
        source: 'nexus_billing',
        pathKey: 'billing'
      })
    );
  } else {
    insights.push(
      Object.freeze({
        id: 'insight_billing_gate',
        title: 'Billing · Wallet · Ledger',
        summary: 'Reutilizado via Nexus — abrir módulo Billing para detalhe',
        source: 'nexus_billing',
        pathKey: 'billing'
      })
    );
  }

  const decisions = composeDecisionsFromSignals({
    alerts: normalizedAlerts,
    topLoss,
    ranking,
    projectedLoss,
    projectedImpact
  });

  const byOriginChart = (Array.isArray(raw.byOrigin) ? raw.byOrigin : [])
    .map((o) => ({
      name: o.label || o.origin || o.name || '—',
      value: parseFloat(o.day ?? o.hour ?? o.month ?? o.value ?? 0) || 0
    }))
    .filter((d) => d.value > 0)
    .slice(0, 8);

  return Object.freeze({
    phase: FIN_EVOLVE_002_PHASE,
    principle: FIN_EVOLVE_002_PRINCIPLE,
    kpis,
    alerts: Object.freeze(normalizedAlerts),
    insights: Object.freeze(insights),
    decisions: Object.freeze(decisions),
    byOriginChart: Object.freeze(byOriginChart),
    executiveSummaryText: buildExecutiveSummaryText({ op, impact, topLoss, alerts: normalizedAlerts })
  });
}

function composeDecisionsFromSignals({ alerts, topLoss, ranking, projectedLoss, projectedImpact }) {
  const out = [];
  if (alerts[0]) {
    out.push({
      id: 'dec_alert',
      title: 'Priorizar alerta financeiro activo',
      origin: alerts[0].source,
      impact: alerts[0].title,
      priority: alerts[0].severity === 'critical' || alerts[0].severity === 'high' ? 'alta' : 'média',
      evidence: alerts[0].evidence || alerts[0].title,
      pathKey: 'leakage'
    });
  }
  if (topLoss && (topLoss.total != null || topLoss.value != null || topLoss.origin)) {
    out.push({
      id: 'dec_top_loss',
      title: 'Investigar maior perda de custo',
      origin: 'industrial_costs',
      impact: formatFinanceMoney(topLoss.total ?? topLoss.value ?? topLoss.amount),
      priority: 'alta',
      evidence: topLoss.origin || topLoss.label || topLoss.name || 'top-loss',
      pathKey: 'costs'
    });
  }
  if (ranking[0]) {
    out.push({
      id: 'dec_leak_rank',
      title: 'Mitigar vazamento no ranking #1',
      origin: 'financial_leakage',
      impact: formatFinanceMoney(ranking[0].value ?? ranking[0].total ?? ranking[0].impacto),
      priority: 'alta',
      evidence: ranking[0].origin || ranking[0].name || ranking[0].leak_label || 'ranking',
      pathKey: 'leakage'
    });
  }
  const proj =
    projectedImpact.projected_impact ??
    projectedImpact.total ??
    projectedLoss.projected ??
    projectedLoss.total;
  if (proj != null && Number(proj) !== 0) {
    out.push({
      id: 'dec_projected',
      title: 'Rever projecção de impacto financeiro',
      origin: 'costs+leakage',
      impact: formatFinanceMoney(proj),
      priority: 'média',
      evidence: 'projected-loss / projected-impact',
      pathKey: 'leakage'
    });
  }
  return out.slice(0, 5).map((d) => Object.freeze(d));
}

function buildExecutiveSummaryText({ op, impact, topLoss, alerts }) {
  const parts = [];
  if (op.per_day != null) parts.push(`Custo operacional do dia: ${formatFinanceMoney(op.per_day)}.`);
  if (impact.last_day != null) parts.push(`Impacto de eventos (24h): ${formatFinanceMoney(impact.last_day)}.`);
  if (topLoss?.origin || topLoss?.label) {
    parts.push(`Maior perda: ${topLoss.origin || topLoss.label}.`);
  }
  if (alerts.length) parts.push(`${alerts.length} alerta(s) financeiro(s) activo(s).`);
  if (!parts.length) {
    return 'Estado financeiro operacional — dados ainda não disponíveis nesta sessão.';
  }
  return parts.join(' ');
}

export function validateFinEvolve002Compose() {
  const sample = composeFinanceExecutiveView({
    costsSummary: { operational: { per_day: 100, per_month: 3000 }, impact_from_events: { last_day: 50 } },
    topLoss: { total: 20, origin: 'parada' },
    leakageAlerts: [{ title: 'Vazamento A', severity: 'high' }],
    leakageRanking: [{ origin: 'linha-1', value: 15 }]
  });
  const issues = [];
  if (sample.kpis.length < 6) issues.push('kpi strip incomplete');
  if (!sample.decisions.length) issues.push('decisions empty');
  if (!sample.executiveSummaryText) issues.push('summary missing');
  return { valid: issues.length === 0, issues, phase: FIN_EVOLVE_002_PHASE };
}
