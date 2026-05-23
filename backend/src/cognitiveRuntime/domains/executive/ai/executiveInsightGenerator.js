'use strict';

function generateExecutiveInsights(strategic = {}, health = {}) {
  const insights = [];
  if (health.pressure_index > 45) insights.push({ type: 'pressure', message: 'Pressão organizacional acima do confortável.' });
  if (strategic.convergence < 0.65) insights.push({ type: 'convergence', message: 'Convergência multi-domínio requer alinhamento.' });
  if (strategic.production_stability !== 'stable') insights.push({ type: 'stability', message: 'Estabilidade produtiva em observação estratégica.' });
  return { insights, useful: insights.length > 0 || strategic.maturity >= 70 };
}

module.exports = { generateExecutiveInsights };
