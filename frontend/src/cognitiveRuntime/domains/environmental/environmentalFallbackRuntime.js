export function superviseEnvironmentalFallback(resolved, density = {}) {
  if (density.centers?.length) return { active: false, resolved };
  return { active: true, message: 'Dados ambientais indisponíveis — estado vazio técnico', resolved };
}

export default superviseEnvironmentalFallback;
