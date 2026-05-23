/**
 * Z.23 — Fallback para widgets legacy quando consolidação falha no cliente
 */

export function resolveCockpitWidgetsWithFallback(context = {}, legacyWidgets = []) {
  if (context?.runtime?.consolidation_applied && context?.widgetsPromoted?.length) {
    return context.widgetsPromoted;
  }
  if (context?.runtime?.fallback_used && legacyWidgets?.length) {
    return legacyWidgets;
  }
  return context?.widgetsPromoted?.length ? context.widgetsPromoted : legacyWidgets;
}

export default resolveCockpitWidgetsWithFallback;
