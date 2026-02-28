/**
 * FLUXO CONVERSACIONAL DE ATIVAÇÃO
 * A IA pergunta: Nome, Setor, Cargo, Atividades. No final, solicita criação do PIN.
 * O PIN é cadastrado apenas ao término da conversa (primeiro login).
 */
const db = require('../db');
const ai = require('./ai');
const userIdentification = require('./userIdentificationService');

const STEPS = [
  { key: 'fullName', question: 'Qual seu nome completo?', label: 'Nome completo' },
  { key: 'department', question: 'Qual seu setor ou departamento?', label: 'Setor' },
  { key: 'jobTitle', question: 'Qual seu cargo?', label: 'Cargo' },
  { key: 'dailyActivities', question: 'Descreva brevemente suas principais atividades no dia a dia.', label: 'Atividades diárias' },
  { key: 'pin', question: 'Agora crie sua contra-senha de 4 dígitos. Ela será solicitada sempre que você fizer login para confirmar sua identidade.', label: 'Contra-senha (PIN)' }
];

async function getConversationHistory(userId, limit = 20) {
  const r = await db.query(`
    SELECT "role", content, created_at
    FROM activation_conversa
    WHERE user_id = $1
    ORDER BY created_at ASC
    LIMIT $2
  `, [userId, limit]);
  return r.rows.map(row => ({ role: row.role, content: row.content }));
}

/**
 * Inicia ou retoma a conversa de ativação
 */
async function startActivation(user, auditContext = {}) {
  const userId = user.id;
  const companyId = user.company_id;
  if (!userId || !companyId) throw new Error('Usuário sem empresa vinculada');

  const history = await getConversationHistory(userId);
  const userMessages = history.filter(m => m.role === 'user');

  if (userMessages.length >= 5) {
    return { message: 'Você já completou a ativação. Defina sua contra-senha se ainda não o fez.', completed: false };
  }

  let message;
  if (history.length === 0) {
    message = `Olá! Sou o Impetus. Detectei que este é seu primeiro acesso. Para personalizar sua experiência e garantir sua segurança, preciso de algumas informações.\n\n${STEPS[0].question}`;
    await db.query(`
      INSERT INTO activation_conversa (company_id, user_id, "role", content)
      VALUES ($1, $2, 'assistant', $3)
    `, [companyId, userId, message]);
  } else {
    const lastAssistant = [...history].reverse().find(m => m.role === 'assistant');
    message = lastAssistant?.content || STEPS[0].question;
  }

  return { message, completed: false };
}

/**
 * Processa resposta do usuário e retorna próxima mensagem da IA
 * Quando o usuário envia 4 dígitos no último passo, salva perfil + PIN e completa
 */
async function processActivationAnswer(user, userAnswer, auditContext = {}) {
  const userId = user.id;
  const companyId = user.company_id;
  const answer = String(userAnswer || '').trim();
  if (!answer) throw new Error('Resposta não pode ser vazia');

  const history = await getConversationHistory(userId);
  await db.query(`
    INSERT INTO activation_conversa (company_id, user_id, "role", content)
    VALUES ($1, $2, 'user', $3)
  `, [companyId, userId, answer]);

  const userMessages = history.filter(m => m.role === 'user');
  const stepIndex = userMessages.length;

  if (stepIndex >= 4) {
    if (/^\d{4}$/.test(answer)) {
      const collected = extractCollectedData([...history, { role: 'user', content: answer }]);
      if (!collected.fullName || !collected.department || !collected.jobTitle) {
        await db.query(`
          INSERT INTO activation_conversa (company_id, user_id, "role", content)
          VALUES ($1, $2, 'assistant', $3)
        `, [companyId, userId, 'Preciso que você responda às perguntas anteriores. Por favor, inicie novamente a ativação ou informe: nome completo, setor e cargo antes de criar a contra-senha.']);
        return { message: 'Preciso que você responda às perguntas anteriores. Reinicie a ativação.', completed: false };
      }
      await userIdentification.completeFirstAccess(user, {
        fullName: collected.fullName,
        department: collected.department,
        jobTitle: collected.jobTitle,
        dailyActivities: collected.dailyActivities || '',
        pin: answer
      }, auditContext);
      const completeMsg = 'Obrigado! Seu perfil foi registrado e sua contra-senha criada. A partir de agora, sempre que você fizer login, o Impetus solicitará sua contra-senha para confirmar sua identidade. Boas-vindas!';
      await db.query(`
        INSERT INTO activation_conversa (company_id, user_id, "role", content)
        VALUES ($1, $2, 'assistant', $3)
      `, [companyId, userId, completeMsg]);
      return { message: completeMsg, completed: true };
    }
    const retryMsg = 'A contra-senha deve ter exatamente 4 dígitos numéricos. Por favor, digite novamente.';
    await db.query(`
      INSERT INTO activation_conversa (company_id, user_id, "role", content)
      VALUES ($1, $2, 'assistant', $3)
    `, [companyId, userId, retryMsg]);
    return { message: retryMsg, completed: false };
  }

  if (stepIndex === 0) {
    const validation = await userIdentification.validateNameAgainstRegistry(answer, companyId, user.email);
    if (!validation.valid) {
      await userIdentification.logAudit(userId, companyId, 'invalid_name', { fullName: answer, reason: validation.reason }, auditContext || {});
      const errMsg = `Nome não encontrado no registro da empresa. ${validation.reason || 'Verifique e tente novamente.'}`;
      await db.query(`
        INSERT INTO activation_conversa (company_id, user_id, "role", content)
        VALUES ($1, $2, 'assistant', $3)
      `, [companyId, userId, errMsg]);
      return { message: errMsg, completed: false };
    }
  }

  const nextStep = STEPS[stepIndex + 1];
  const nextMessage = nextStep ? nextStep.question : '';
  await db.query(`
    INSERT INTO activation_conversa (company_id, user_id, "role", content)
    VALUES ($1, $2, 'assistant', $3)
  `, [companyId, userId, nextMessage]);

  return { message: nextMessage, completed: false };
}

function extractCollectedData(history) {
  const userContents = history.filter(m => m.role === 'user').map(m => m.content);
  return {
    fullName: userContents[0]?.trim() || '',
    department: userContents[1]?.trim() || '',
    jobTitle: userContents[2]?.trim() || '',
    dailyActivities: userContents[3]?.trim() || ''
  };
}

/**
 * Retoma conversa em andamento
 */
async function resumeActivation(user) {
  const history = await getConversationHistory(user?.id);
  if (history.length === 0) return startActivation(user);

  const lastAssistant = [...history].reverse().find(m => m.role === 'assistant');
  return { message: lastAssistant?.content || STEPS[0].question, completed: false };
}

module.exports = {
  startActivation,
  processActivationAnswer,
  getConversationHistory,
  resumeActivation,
  STEPS
};
