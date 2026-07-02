'use strict';

/**
 * GÊMEO DIGITAL APLICADO — Motor Cognitivo Gemini Industrial
 *
 * Especializado em engenharia industrial, manutenção, confiabilidade,
 * instrumentação, automação, produção, mecânica e elétrica.
 *
 * Atua como um Engenheiro Industrial Digital que:
 * - Interpreta dados de sensores/PLCs
 * - Diagnostica falhas industriais
 * - Gera representações visuais técnicas (descrições para diagramas)
 * - Produz procedimentos de manutenção completos
 * - Analisa tendências e prediz falhas
 */

const geminiService = require('./geminiService');

const INDUSTRIAL_SYSTEM_CONTEXT = `Você é um Engenheiro Industrial Digital altamente especializado, atuando como motor cognitivo do sistema IMPETUS — Gêmeo Digital Aplicado.

Suas especialidades:
- Engenharia de Manutenção Industrial (preditiva, preventiva, corretiva)
- Confiabilidade e Disponibilidade (MTBF, MTTR, RCM, FMEA)
- Instrumentação e Controle (sensores, transdutores, PLCs, SCADA)
- Automação Industrial (CLPs, inversores, servomotores, redes industriais)
- Mecânica Industrial (rolamentos, engrenagens, bombas, redutores, acoplamentos)
- Elétrica Industrial (motores, transformadores, quadros, proteções)
- Análise de Vibração, Termografia, Análise de Óleo, Ultrassom

Regras invioláveis:
1. Base suas respostas APENAS nos dados fornecidos. Não invente leituras de sensores.
2. Quando dados forem insuficientes, indique claramente e sugira medições adicionais.
3. Sempre inclua nível de confiança (0-100) e criticidade (normal/low/medium/high/critical).
4. Priorize SEGURANÇA (LOTO, EPI, desenergização) em toda recomendação.
5. Respostas em português do Brasil, linguagem técnica industrial.
6. Retorne SOMENTE JSON válido quando solicitado (sem markdown, sem backticks).`;

function isAvailable() {
  return geminiService.isAvailable();
}

function parseGeminiJson(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Diagnóstico completo a partir de dados de sensores e contexto da máquina.
 */
async function analyzeSensorDiagnostic(sensorData, machineContext, memoryHints = []) {
  const memoryBlock = memoryHints.length > 0
    ? `\n\nMEMÓRIA INDUSTRIAL (falhas anteriores similares nesta máquina/componente):\n${JSON.stringify(memoryHints.slice(0, 5), null, 2)}`
    : '';

  const prompt = `${INDUSTRIAL_SYSTEM_CONTEXT}

TAREFA: Analisar dados de sensores e diagnosticar falha industrial.

DADOS DOS SENSORES:
${JSON.stringify(sensorData, null, 2)}

CONTEXTO DA MÁQUINA:
${JSON.stringify(machineContext, null, 2)}
${memoryBlock}

Retorne SOMENTE um JSON válido com esta estrutura:
{
  "probable_cause": "causa provável da anomalia",
  "affected_component": "componente afetado (rolamento, motor, bomba, etc.)",
  "component_location": "localização do componente no equipamento",
  "criticality": "normal|low|medium|high|critical",
  "operational_risk": "descrição do risco operacional",
  "production_impact": "impacto na produção",
  "confidence": 0-100,
  "recommended_action": "ação recomendada imediata",
  "intervention_time_estimate": "tempo estimado para intervenção",
  "failure_mode": "modo de falha (FMEA)",
  "severity_score": 1-10,
  "detection_score": 1-10,
  "occurrence_score": 1-10,
  "rpn": "número de prioridade de risco (SxOxD)",
  "sensor_analysis": {
    "temperature": { "status": "normal|attention|critical|failure", "trend": "stable|rising|falling|spike", "detail": "" },
    "vibration": { "status": "...", "trend": "...", "detail": "" },
    "current": { "status": "...", "trend": "...", "detail": "" },
    "pressure": { "status": "...", "trend": "...", "detail": "" }
  },
  "differential_diagnosis": ["hipótese 1", "hipótese 2", "hipótese 3"],
  "additional_measurements_needed": ["medição sugerida 1", "medição sugerida 2"]
}`;

  const raw = await geminiService.generateText(prompt);
  return parseGeminiJson(raw) || {
    probable_cause: 'Análise inconclusiva — dados insuficientes',
    affected_component: 'indeterminado',
    criticality: 'low',
    confidence: 0,
    recommended_action: 'Verificação manual recomendada',
    _raw: (raw || '').slice(0, 1000)
  };
}

/**
 * Gera descrição visual técnica (vista explodida, corte, isométrica, etc.).
 */
async function generateVisualDescription(component, failureContext, visualType = 'exploded_view') {
  const typeLabels = {
    exploded_view: 'Vista Explodida',
    cross_section: 'Corte Técnico Transversal',
    isometric: 'Perspectiva Isométrica',
    highlight: 'Destaque do Componente Afetado',
    comparison: 'Comparação: Estado Saudável vs Danificado',
    diagram: 'Diagrama Funcional'
  };

  const prompt = `${INDUSTRIAL_SYSTEM_CONTEXT}

TAREFA: Gerar uma descrição técnica detalhada para visualização industrial do tipo "${typeLabels[visualType] || visualType}".

COMPONENTE: ${component}
CONTEXTO DE FALHA: ${JSON.stringify(failureContext, null, 2)}

Retorne SOMENTE um JSON válido:
{
  "title": "título técnico da visualização",
  "description": "descrição detalhada do que a visualização mostra",
  "components_shown": [
    { "name": "nome do componente", "position": "posição relativa", "status": "normal|attention|critical|failure", "highlight_color": "green|yellow|orange|red", "annotation": "anotação técnica" }
  ],
  "technical_notes": ["nota técnica 1", "nota técnica 2"],
  "failure_indicators": ["indicador visual de falha 1", "indicador visual 2"],
  "safety_warnings": ["aviso de segurança se aplicável"],
  "scale_reference": "referência de escala (ex: componente tem ~30cm de diâmetro)",
  "view_angle": "ângulo de visualização recomendado",
  "ai_generated_disclaimer": "Representação gerada por IA com base em conhecimento técnico industrial."
}`;

  const raw = await geminiService.generateText(prompt);
  return parseGeminiJson(raw) || {
    title: `${typeLabels[visualType] || visualType} — ${component}`,
    description: 'Representação gerada por IA com base em conhecimento técnico industrial.',
    components_shown: [],
    ai_generated_disclaimer: 'Representação gerada por IA com base em conhecimento técnico industrial.',
    _raw: (raw || '').slice(0, 1000)
  };
}

/**
 * Gera procedimento completo de manutenção.
 */
async function generateMaintenanceProcedure(component, diagnosis, machineContext) {
  const prompt = `${INDUSTRIAL_SYSTEM_CONTEXT}

TAREFA: Gerar procedimento completo de manutenção industrial.

COMPONENTE: ${component}
DIAGNÓSTICO: ${JSON.stringify(diagnosis, null, 2)}
MÁQUINA: ${JSON.stringify(machineContext, null, 2)}

Retorne SOMENTE um JSON válido:
{
  "title": "Procedimento: [componente] - [ação]",
  "root_cause_analysis": "análise de causa raiz detalhada",
  "action_plan": ["passo 1", "passo 2", "passo 3"],
  "checklist_pre": ["verificação pré-intervenção 1", "verificação 2"],
  "tools_required": ["ferramenta 1", "ferramenta 2"],
  "spare_parts": [{ "name": "peça", "quantity": 1, "specification": "especificação" }],
  "disassembly_steps": ["passo desmontagem 1", "passo 2"],
  "assembly_steps": ["passo montagem 1", "passo 2"],
  "loto_procedure": {
    "energy_sources": ["fonte de energia 1"],
    "isolation_points": ["ponto de bloqueio 1"],
    "verification_steps": ["verificação de energia zero 1"]
  },
  "post_maintenance_test": ["teste 1", "teste 2"],
  "final_validation": ["critério de aceite 1", "critério 2"],
  "estimated_duration_minutes": 120,
  "safety_requirements": ["EPI obrigatório", "requisito 2"],
  "risk_assessment": "avaliação de risco da atividade"
}`;

  const raw = await geminiService.generateText(prompt);
  return parseGeminiJson(raw) || {
    title: `Procedimento: ${component}`,
    action_plan: ['Verificação manual recomendada — dados insuficientes para procedimento automático'],
    safety_requirements: ['Consultar supervisor antes de intervir'],
    _raw: (raw || '').slice(0, 1000)
  };
}

/**
 * Análise de tendência e predição de falha.
 */
async function analyzeTrend(sensorHistory, machineContext) {
  const prompt = `${INDUSTRIAL_SYSTEM_CONTEXT}

TAREFA: Analisar tendências de sensores industriais e predizer falhas.

HISTÓRICO DE LEITURAS:
${JSON.stringify(sensorHistory, null, 2)}

MÁQUINA:
${JSON.stringify(machineContext, null, 2)}

Retorne SOMENTE um JSON válido:
{
  "trends": {
    "temperature": { "direction": "stable|rising|falling", "rate": "taxa de variação", "alarm_threshold_eta": "tempo estimado para alarme ou null", "status": "normal|attention|critical" },
    "vibration": { "direction": "...", "rate": "...", "alarm_threshold_eta": "...", "status": "..." },
    "current": { "direction": "...", "rate": "...", "alarm_threshold_eta": "...", "status": "..." },
    "pressure": { "direction": "...", "rate": "...", "alarm_threshold_eta": "...", "status": "..." }
  },
  "failure_prediction": {
    "probability_next_7_days": 0-100,
    "probability_next_30_days": 0-100,
    "most_likely_failure_mode": "modo de falha mais provável",
    "predicted_component": "componente que deve falhar",
    "recommended_preventive_date": "data recomendada para intervenção preventiva"
  },
  "anomalies_detected": ["anomalia 1", "anomalia 2"],
  "confidence": 0-100,
  "recommendation": "recomendação de ação"
}`;

  const raw = await geminiService.generateText(prompt);
  return parseGeminiJson(raw) || {
    trends: {},
    failure_prediction: { probability_next_7_days: 0, probability_next_30_days: 0 },
    confidence: 0,
    recommendation: 'Dados insuficientes para análise de tendência',
    _raw: (raw || '').slice(0, 1000)
  };
}

/**
 * Diagnóstico a partir de imagem (peça/equipamento fotografado).
 */
async function analyzeImageDiagnostic(imageBase64, machineContext = {}) {
  const prompt = `${INDUSTRIAL_SYSTEM_CONTEXT}

TAREFA: Analisar imagem de equipamento/componente industrial e diagnosticar condição.

CONTEXTO DA MÁQUINA (se disponível):
${JSON.stringify(machineContext, null, 2)}

Analise a imagem e retorne SOMENTE um JSON válido:
{
  "detected_component": "componente identificado",
  "component_category": "categoria (rolamento, motor, bomba, válvula, etc.)",
  "condition": "normal|desgaste_leve|desgaste_moderado|desgaste_severo|falha",
  "visual_findings": ["achado visual 1", "achado 2"],
  "probable_cause": "causa provável do estado observado",
  "criticality": "normal|low|medium|high|critical",
  "recommended_action": "ação recomendada",
  "confidence": 0-100,
  "safety_alert": "alerta de segurança se aplicável ou null",
  "maintenance_type": "preventiva|corretiva|preditiva|nenhuma",
  "comparison_healthy_vs_damaged": {
    "healthy_state": "descrição do estado saudável esperado",
    "current_state": "descrição do estado atual observado",
    "degradation_level": "percentual estimado de degradação"
  }
}`;

  const raw = await geminiService.analyzeImage(imageBase64, prompt);
  return parseGeminiJson(raw) || {
    detected_component: 'Identificação inconclusiva',
    condition: 'normal',
    criticality: 'low',
    confidence: 0,
    _raw: (raw || '').slice(0, 500)
  };
}

module.exports = {
  isAvailable,
  analyzeSensorDiagnostic,
  generateVisualDescription,
  generateMaintenanceProcedure,
  analyzeTrend,
  analyzeImageDiagnostic,
  INDUSTRIAL_SYSTEM_CONTEXT
};
