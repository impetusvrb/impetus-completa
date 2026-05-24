/**
 * zWidgetHydrationRuntime — gere o ciclo de hidratação dos widgets sem
 * impor um único backend. Aceita o plano vindo do backend
 * (runtime_z_sovereign.hydration_plan_summary) e devolve um array de
 * widgets já ordenado para a UI montar.
 *
 * Esta camada é puramente declarativa — não toca em sockets ou requests.
 */

export function planWidgetHydration(meData = {}, layoutWidgets = []) {
  const tierMap = new Map();
  for (const w of layoutWidgets) tierMap.set(w.id, w.tier);

  const plan = layoutWidgets.map((w, idx) => ({
    id: w.id,
    priority: idx,
    tier: w.tier,
    realtime: !!w.raw?.realtime,
    telemetry: !!w.raw?.telemetry,
    cognitive: !!w.raw?.cognitive_center_id,
    fallback: w.tier >= 4
  }));

  const summary = {
    total: plan.length,
    realtime: plan.filter((p) => p.realtime).length,
    cognitive: plan.filter((p) => p.cognitive).length,
    fallback: plan.filter((p) => p.fallback).length,
    backend_assist: meData?.runtime_z_sovereign?.hydration_plan_summary || null
  };

  return { plan, summary };
}

export default planWidgetHydration;
