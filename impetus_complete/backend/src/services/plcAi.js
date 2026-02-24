/**
 * IA DE COLETA (IA 2) - ISOLADA
 * Usa PLC_AI_KEY. ÚNICAS permissões: analisar dados com base em manuais.
 * Inclui Política Impetus para garantir conformidade nas sugestões.
 */
const OpenAI = require('openai');
const documentContext = require('./documentContext');

const plcClient = process.env.PLC_AI_KEY
  ? new OpenAI({ apiKey: process.env.PLC_AI_KEY })
  : null;

const MODEL = process.env.PLC_AI_MODEL || 'gpt-4o-mini';

async function analyzeEquipmentData({ equipmentData, manualContext }) {
  if (!plcClient) return null;
  const dataStr = JSON.stringify(equipmentData, null, 2);
  const impetusPolicy = documentContext.getImpetusPolicy();
  const policyBlock = impetusPolicy ? `\n## Política Impetus (obrigatória)\n${impetusPolicy.slice(0, 1500)}\n` : '';
  const prompt = `Você é uma IA de análise industrial.${policyBlock}

Analise os dados do equipamento e correlacione com os manuais. Suas sugestões DEVEM estar em conformidade com a Política Impetus.

## Dados do equipamento:
${dataStr}

## Manuais disponíveis:
${manualContext || '(Nenhum manual)'}

Identifique variações anormais e liste possíveis causas baseadas nos manuais. Retorne JSON:
{"variation_type":"string","severity":"low|medium|high|critical","possible_causes":[{"cause":"","probability":0-100}],"recommendation":"","alert_title":"","alert_message":""}`;
  try {
    const res = await plcClient.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.2
    });
    const text = res.choices?.[0]?.message?.content || '';
    try {
      const json = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
      return json;
    } catch {
      return { alert_title: 'Variação detectada', alert_message: text, severity: 'medium', possible_causes: [] };
    }
  } catch (err) {
    console.warn('[PLC_AI]', err.message);
    return null;
  }
}

module.exports = { analyzeEquipmentData };
