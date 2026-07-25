/**
 * FIN-EVOLVE-2.1 — Apply Economic Intelligence overlay onto R2.0 executive view.
 * No layout/UX change — only KPI values / hints / optional additive cards.
 */
import { formatFinanceMoney } from '../dashboard/financeExecutiveCompose.js';

/**
 * Merge engine hubKpis into composed view.kpis (same strip, updated values).
 */
export function applyEconomicIntelligenceToView(view, economicSnapshot) {
  if (!view || !economicSnapshot?.hubKpis) return view;

  const byId = new Map(economicSnapshot.hubKpis.map((k) => [k.id, k]));
  const merged = view.kpis.map((kpi) => {
    const overlay = byId.get(kpi.id);
    if (!overlay || overlay.numericValue == null) return kpi;
    byId.delete(kpi.id);
    const display =
      overlay.displaySuffix === '%'
        ? `${Number(overlay.numericValue).toFixed(1)}%`
        : formatFinanceMoney(overlay.numericValue);
    return Object.freeze({
      ...kpi,
      label: overlay.labelOverride || kpi.label,
      value: display,
      hint: overlay.hint || kpi.hint,
      color: overlay.color || kpi.color,
      source: 'economic_engine'
    });
  });

  // Additive performance KPIs (same strip — no layout change beyond extra cards)
  for (const overlay of byId.values()) {
    if (overlay.numericValue == null) continue;
    if (!['econ_efficiency', 'econ_losses', 'econ_consolidated'].includes(overlay.id)) continue;
    const display =
      overlay.displaySuffix === '%'
        ? `${Number(overlay.numericValue).toFixed(1)}%`
        : formatFinanceMoney(overlay.numericValue);
    merged.push(
      Object.freeze({
        id: overlay.id,
        label: overlay.labelOverride || overlay.id,
        value: display,
        hint: overlay.hint,
        color: overlay.color || 'var(--cyan)',
        source: 'economic_engine'
      })
    );
  }

  const unit = economicSnapshot.smartCosting?.unitCost?.value;
  const efficiency = economicSnapshot.performance?.indicators?.economicEfficiency?.value;
  const losses = economicSnapshot.performance?.indicators?.economicLosses?.value;
  const extraSummary = [];
  if (unit != null) extraSummary.push(`Custo unitário dinâmico: ${formatFinanceMoney(unit)}.`);
  if (efficiency != null) extraSummary.push(`Eficiência económica: ${Number(efficiency).toFixed(1)}%.`);
  if (losses != null) extraSummary.push(`Perdas económicas: ${formatFinanceMoney(losses)}.`);

  return Object.freeze({
    ...view,
    phase: economicSnapshot.phase || view.phase,
    economicEngine: 'EconomicIntelligenceEngine',
    kpis: Object.freeze(merged),
    smartCosting: economicSnapshot.smartCosting,
    economicPerformance: economicSnapshot.performance,
    executiveSummaryText: extraSummary.length
      ? `${view.executiveSummaryText} ${extraSummary.join(' ')}`
      : view.executiveSummaryText
  });
}
