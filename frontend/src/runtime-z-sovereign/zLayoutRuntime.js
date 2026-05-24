/**
 * zLayoutRuntime — produz a "lista canónica de widgets" para a UI sem
 * depender de getLayoutPorCargo. Internamente, prioriza:
 *
 *   1. widgets_promoted (Runtime Z C0–C6 e cockpits nativos)
 *   2. personalization.layout
 *   3. engine_v2.payload.layout.widgets (compatibility — só se nada acima)
 *   4. widgets_legacy (Motor A)
 *   5. z_fallback_layout.widgets (resilience nativo Z)
 *
 * Nenhuma fonte é removida — apenas a ordem é redirigida para Z primeiro.
 */

const TIER_LABELS = {
  1: 'runtime_z_promoted',
  2: 'personalization',
  3: 'engine_v2_compatibility',
  4: 'motor_a_legacy',
  5: 'runtime_z_fallback'
};

function _coerce(w, idx, tier) {
  if (!w) return null;
  const id = w.id || w.widget_id || w.key || `widget_${tier}_${idx}`;
  return {
    id,
    label: w.label || w.title || id,
    position: w.position || { row: Math.floor(idx / 2), col: (idx % 2) * 2, width: 2 },
    tier,
    source: TIER_LABELS[tier] || 'unknown',
    raw: w
  };
}

export function buildSovereignLayout(meData = {}) {
  const tier1 = (Array.isArray(meData?.widgets_promoted) ? meData.widgets_promoted : []).map(
    (w, i) => _coerce(w, i, 1)
  );
  const tier2 = (Array.isArray(meData?.personalization?.layout) ? meData.personalization.layout : []).map(
    (w, i) => _coerce(w, i, 2)
  );
  const tier3 = (meData?.engine_v2?.payload?.layout?.widgets || []).map((w, i) => _coerce(w, i, 3));
  const tier4 = (Array.isArray(meData?.widgets_legacy) ? meData.widgets_legacy : []).map((w, i) =>
    _coerce(w, i, 4)
  );
  const tier5 = (meData?.z_fallback_layout?.widgets || []).map((w, i) => _coerce(w, i, 5));

  const seen = new Set();
  const widgets = [];
  for (const w of [...tier1, ...tier2, ...tier3, ...tier4, ...tier5]) {
    if (!w || seen.has(w.id)) continue;
    seen.add(w.id);
    widgets.push(w);
  }

  return {
    widgets,
    source: widgets[0]?.source || 'empty',
    degraded: widgets.every((w) => w.tier >= 4),
    fallback_used: widgets.some((w) => w.tier === 5),
    tier_counts: {
      tier1: tier1.length,
      tier2: tier2.length,
      tier3: tier3.length,
      tier4: tier4.length,
      tier5: tier5.length
    }
  };
}

export default buildSovereignLayout;
