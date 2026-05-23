/** Z.P0 — fallback supervisor frontend */

export function superviseProductionFallback(resolved, density = {}) {
  if (density.centers?.length) return { active: false, resolved };
  return {
    active: true,
    message: 'Telemetria de produção indisponível — estado vazio técnico',
    resolved
  };
}

export default superviseProductionFallback;
