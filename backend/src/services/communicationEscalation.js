/**
 * COMUNICAÇÃO INTELIGENTE
 * IA classifica mensagem, avalia impacto/gravidade, define destinatários e escala
 * Regra: todos podem enviar; escalonamento conforme severidade
 */
const db = require('../db');
const ai = require('./ai');
const userContext = require('./userContext');

const SEVERITY_LEVELS = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4
};

const ESCALATION_TARGETS = {
  1: ['coordenação', 'gerência', 'direção'],
  2: ['coordenação', 'gerência'],
  3: ['supervisão', 'coordenação'],
  4: ['supervisão']
};

/**
 * Classifica mensagem via IA e retorna impacto/gravidade
 */
async function classifyMessage(text, companyId) {
  if (!text || !text.trim()) return { severity: 'low', escalation: ['supervisão'] };

  const prompt = `Classifique esta mensagem de comunicação industrial em termos de:
1. Severidade: critical (falha crítica, segurança), high (parada produção, risco), medium (ocorrência relevante), low (informativo)
2. Impacto: alto, médio, baixo
3. Tipo: falha_técnica, alerta, comunicado, dúvida, tarefa, outro

Mensagem: "${text.slice(0, 500)}"

Responda em JSON: {"severity":"critical|high|medium|low","impacto":"alto|médio|baixo","tipo":"string"}`;

  try {
    const reply = await ai.chatCompletion(prompt, { max_tokens: 150 });
    const match = reply.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      const sev = (parsed.severity || 'low').toLowerCase();
      const targets = ESCALATION_TARGETS[SEVERITY_LEVELS[sev] || 4] || ['supervisão'];
      return {
        severity: sev,
        impacto: parsed.impacto || 'baixo',
        tipo: parsed.tipo || 'outro',
        escalation: targets
      };
    }
  } catch (e) {
    console.warn('[ESCALATION_CLASSIFY]', e.message);
  }
  return { severity: 'low', impacto: 'baixo', tipo: 'outro', escalation: ['supervisão'] };
}

/**
 * Busca usuários por nível hierárquico e setor para escalonamento
 */
async function getRecipientsByEscalation(companyId, escalationTargets, department = null) {
  const hierarchyMap = {
    direção: [0, 1],
    gerência: [2],
    coordenação: [3],
    supervisão: [4]
  };

  const levels = new Set();
  for (const t of escalationTargets || ['supervisão']) {
    const arr = hierarchyMap[t] || [];
    arr.forEach(l => levels.add(l));
  }

  const levelsArr = [...levels];
  const placeholders = levelsArr.map((_, i) => `$${i + 2}`).join(',');

  let query = `
    SELECT id, name, email, phone, whatsapp_number, hierarchy_level, area, department
    FROM users
    WHERE company_id = $1 AND active = true AND deleted_at IS NULL
      AND hierarchy_level IN (${placeholders})
  `;
  const params = [companyId, ...levelsArr];

  if (department) {
    params.push(department);
    const deptIdx = params.length;
    query += ` AND (LOWER(department) = LOWER($${deptIdx}) OR department_id IN (SELECT id FROM departments WHERE LOWER(name) = LOWER($${deptIdx})))`;
  }

  query += ` ORDER BY hierarchy_level ASC`;

  const r = await db.query(query, params);
  return r.rows || [];
}

/**
 * Processa comunicação: classifica e retorna destinatários ideais
 */
async function processCommunication(message, companyId, senderContext = null) {
  const classification = await classifyMessage(message, companyId);
  const recipients = await getRecipientsByEscalation(
    companyId,
    classification.escalation,
    senderContext?.department
  );

  return {
    classification: {
      severity: classification.severity,
      impacto: classification.impacto,
      tipo: classification.tipo
    },
    escalationTargets: classification.escalation,
    suggestedRecipients: recipients
  };
}

module.exports = {
  classifyMessage,
  getRecipientsByEscalation,
  processCommunication
};
