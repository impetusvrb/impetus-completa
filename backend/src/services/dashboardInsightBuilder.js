'use strict';
function buildSmartQuestions(context = {}) {
  const axis = context.primary_axis || 'eixo_operacional';
  const byAxis = {
    eixo_humano: ['Quais setores tiveram mais faltas nesta semana?', 'Ha treinamentos vencendo nos proximos dias?', 'Onde esta o maior risco de turnover?'],
    eixo_manutencao: ['Quais maquinas estao com maior recorrencia de falha?', 'Quais preventivas estao vencidas?', 'Existe peca critica em risco de falta?'],
    eixo_operacional: ['Qual linha esta mais distante da meta hoje?', 'Quais perdas cresceram no turno atual?', 'Onde a eficiencia caiu nas ultimas horas?'],
    eixo_qualidade: ['Quais desvios estao se repetindo por setor?', 'Quais lotes estao com maior risco de nao conformidade?', 'Qual etapa precisa de acao corretiva imediata?'],
    eixo_financeiro: ['Quais setores aumentaram custo acima do previsto?', 'Qual a tendencia de margem para o fechamento do periodo?', 'Onde ha maior impacto financeiro por perda operacional?'],
    eixo_laboratorial: ['Quais analises estao atrasadas hoje?', 'Ha amostras fora do padrao recorrente?', 'Qual lote exige prioridade de liberacao?']
  };
  return byAxis[axis] || byAxis.eixo_operacional;
}
module.exports = { buildSmartQuestions };
