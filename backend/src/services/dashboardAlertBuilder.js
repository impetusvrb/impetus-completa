'use strict';
function buildContextualAlerts(context = {}) {
  const axis = context.primary_axis || 'eixo_operacional';
  const alerts = [];
  if (axis === 'eixo_humano') alerts.push('Foco em absenteismo e estabilidade da equipe.');
  else if (axis === 'eixo_manutencao') alerts.push('Monitore ativos com recorrencia de falha e preventivas vencidas.');
  else if (axis === 'eixo_qualidade') alerts.push('Priorize desvios recorrentes e conformidade por setor.');
  else if (axis === 'eixo_financeiro') alerts.push('Acompanhe desvios de custo e pressao de margem por area.');
  else if (axis === 'eixo_laboratorial') alerts.push('Priorize amostras fora do padrao e tempo de liberacao.');
  else alerts.push('Acompanhe gargalos, produtividade e estabilidade da operacao.');
  if (Array.isArray(context.responsibilities) && context.responsibilities.includes('seguranca')) alerts.push('Risco de seguranca em destaque por responsabilidade funcional.');
  return alerts.slice(0, 3);
}
module.exports = { buildContextualAlerts };
