'use strict';
function buildFallbackMessages(context = {}) {
  const p = context.primary_axis || 'eixo_operacional';
  const map = {
    eixo_humano: ['Ainda nao ha dados suficientes de absenteismo para gerar tendencia confiavel.', 'Nenhuma ocorrencia disciplinar critica foi encontrada no periodo.', 'Aguardando integracao de treinamento para ampliar os insights de pessoas.'],
    eixo_operacional: ['Sem dados consolidados de linha para calcular meta x realizado neste momento.', 'Nenhum alerta operacional critico recente foi identificado.', 'Conecte mais apontamentos de turno para habilitar tendencias de produtividade.'],
    eixo_manutencao: ['Ainda nao ha historico suficiente de falhas para calcular recorrencia com confianca.', 'Nenhuma OS critica aberta no momento.', 'Aguardando integracao de pecas/almox para prever risco de indisponibilidade.'],
    eixo_qualidade: ['Sem volume suficiente de nao conformidades para tendencia estatistica.', 'Nenhum desvio critico recente encontrado.', 'Aguardando integracao completa de inspecoes para ampliar os insights de qualidade.'],
    eixo_financeiro: ['Dados financeiros recentes ainda insuficientes para projecao robusta.', 'Sem desvios financeiros criticos no momento.', 'Aguardando conciliacao de centro de custo para refinar os indicadores.']
  };
  return map[p] || ['Ainda nao ha dados suficientes para analise completa do perfil.', 'Nenhum alerta critico no periodo atual.', 'Continue registrando dados para liberar insights mais precisos.'];
}
module.exports = { buildFallbackMessages };
