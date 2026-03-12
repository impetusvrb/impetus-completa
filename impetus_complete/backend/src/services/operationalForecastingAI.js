/**
 * IMPETUS - IA do Centro de Previsão Operacional
 * Responde perguntas do CEO/diretor sobre estado atual e projeções
 */
const ai = require('./ai');
const operationalForecasting = require('./operationalForecastingService');
const industrialOperationalMap = require('./industrialOperationalMapService');
const db = require('../db');

/**
 * Coleta contexto operacional completo para a IA
 */
async function fetchOperationalContext(companyId) {
  const [health, projections, alerts, offline, predictions, events] = await Promise.all([
    operationalForecasting.getCompanyHealth(companyId),
    operationalForecasting.getProjections(companyId, 'eficiencia'),
    operationalForecasting.getIntelligentAlerts(companyId, 10),
    industrialOperationalMap.getOfflineEquipment(companyId),
    industrialOperationalMap.getFailurePredictions(companyId, 10),
    db.query(`
      SELECT event_type, machine_name, severity, description, created_at
      FROM machine_detected_events
      WHERE company_id = $1 AND created_at > now() - INTERVAL '7 days'
      ORDER BY created_at DESC LIMIT 30
    `, [companyId])
  ]);

  const perdasProj = await operationalForecasting.getProjections(companyId, 'perdas');
  const prejuizoProj = await operationalForecasting.getProjections(companyId, 'prejuizo');
  const riscoProj = await operationalForecasting.getProjections(companyId, 'risco_falhas');

  return {
    health,
    projections: {
      eficiencia: projections.series,
      perdas: perdasProj.series,
      prejuizo: prejuizoProj.series,
      risco_falhas: riscoProj.series
    },
    alerts: alerts.slice(0, 8),
    offline_equipment: offline,
    failure_predictions: predictions,
    recent_events: events.rows || []
  };
}

/**
 * Processa pergunta do CEO/diretor sobre previsão operacional
 */
async function answerOperationalQuestion(companyId, question) {
  const context = await fetchOperationalContext(companyId);

  const prompt = `Você é a IA do Centro de Previsão Operacional da empresa. Analise os dados e responda à pergunta do gestor.

DADOS OPERACIONAIS (JSON):
${JSON.stringify(context, null, 2)}

PERGUNTA: "${question}"

REGRAS:
- Responda em português, de forma objetiva e acionável.
- Use os dados fornecidos. Se não houver dados suficientes, informe e sugira fontes.
- Para projeções de 7 dias, extrapole com base nas tendências (agora, 2h, 1d, 2d, 2s).
- Para "quanto pode perder em 7 dias", calcule a partir de prejuizo_evitavel e tendência.
- Para "máquina com maior risco", use failure_predictions e eventos recentes.
- Para "setor com maior perda", use eventos por machine/line.
- Máximo 4-6 parágrafos curtos. Inclua sugestões quando relevante.`;

  const response = await ai.chatCompletion(prompt, { max_tokens: 700 });
  return (response || 'Não foi possível processar a pergunta no momento.').trim();
}

module.exports = {
  fetchOperationalContext,
  answerOperationalQuestion
};
