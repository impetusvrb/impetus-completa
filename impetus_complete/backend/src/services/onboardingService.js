/**
 * ONBOARDING INTELIGENTE + MEMÓRIA PERSISTENTE
 * Entrevista estratégica adaptativa com IA
 */
const db = require('../db');
const ai = require('./ai');
const userContext = require('./userContext');

const EMPRESA_TOPICOS = [
  'nome_empresa', 'segmento', 'num_funcionarios', 'estrutura_organizacional',
  'departamentos', 'principais_desafios', 'meta_mensal', 'faturamento_medio',
  'problemas_operacionais', 'problemas_comunicacao', 'cultura_organizacional',
  'indicadores_usados', 'dores_diretoria', 'expectativa_sistema'
];

const USUARIO_TOPICOS = [
  'nome', 'cargo', 'departamento', 'tempo_empresa', 'responsabilidades',
  'equipe_lidera', 'dificuldades', 'metas_individuais', 'indicadores_acompanha',
  'problemas_recorrentes', 'sugestoes_melhoria'
];

/**
 * Verifica se empresa precisa de onboarding (admin/diretoria)
 */
async function needsCompanyOnboarding(companyId) {
  if (!companyId) return false;
  const r = await db.query(
    'SELECT onboarding_completed FROM memoria_empresa WHERE company_id = $1',
    [companyId]
  );
  if (r.rows.length === 0) return true;
  return !r.rows[0].onboarding_completed;
}

/**
 * Verifica se usuário precisa de onboarding individual
 */
async function needsUserOnboarding(userId, companyId) {
  if (!userId) return false;
  const r = await db.query(
    'SELECT onboarding_completed FROM memoria_usuario WHERE user_id = $1',
    [userId]
  );
  if (r.rows.length === 0) return true;
  return !r.rows[0].onboarding_completed;
}

/**
 * Retorna status completo de onboarding
 */
async function getOnboardingStatus(user, company) {
  const companyId = user?.company_id || company?.id;
  const userId = user?.id;
  const level = user?.hierarchy_level ?? 5;
  const isAdminOrDiretor = level <= 1;

  const [companyNeeds, userNeeds] = await Promise.all([
    companyId ? needsCompanyOnboarding(companyId) : false,
    userId ? needsUserOnboarding(userId, companyId) : false
  ]);

  let activeOnboarding = null;
  if (isAdminOrDiretor && companyNeeds) {
    activeOnboarding = 'empresa';
  } else if (userNeeds) {
    activeOnboarding = 'usuario';
  }

  return {
    needsOnboarding: !!activeOnboarding,
    activeType: activeOnboarding,
    companyCompleted: !companyNeeds,
    userCompleted: !userNeeds
  };
}

/**
 * Busca histórico da conversa
 */
async function getConversationHistory(companyId, userId, tipo, limit = 20) {
  const r = await db.query(`
    SELECT "role", content, created_at
    FROM onboarding_conversa
    WHERE company_id = $1 AND user_id = $2 AND tipo = $3
    ORDER BY created_at DESC
    LIMIT $4
  `, [companyId, userId, tipo, limit]);
  return r.rows.map(row => ({ role: row.role, content: row.content, created_at: row.created_at })).reverse();
}

/**
 * Gera próxima pergunta ou aprofundamento via IA - EMPRESA
 */
async function generateNextQuestionEmpresa(companyId, userId, userAnswer, history) {
  const histStr = history.map(m => `${m.role}: ${m.content}`).join('\n');
  const prompt = `Você é uma IA corporativa estratégica conduzindo uma entrevista profunda com o ADMIN da empresa.

REGRA: Analise a resposta e decida:
1. Se foi vaga → peça exemplos concretos
2. Se mencionou problema → pergunte "Por quê?", impactos financeiros, entre quais setores
3. Se há contradição → aponte e pergunte para esclarecer
4. Se foi completa → avance para próximo tópico
5. NUNCA repita a mesma pergunta

TÓPICOS A COBRIR (em ordem, aprofunde cada um): ${EMPRESA_TOPICOS.join(', ')}

HISTÓRICO:
${histStr}

ÚLTIMA RESPOSTA DO USUÁRIO: ${userAnswer || '(início - saudar e primeira pergunta)'}

INSTRUÇÕES:
- Se for o início: "Olá. Antes de começarmos, preciso entender profundamente sua empresa para atuar de forma estratégica e personalizada. Qual o nome oficial da empresa?"
- Seja conversacional, uma pergunta por vez
- Quando identificar problema (ex: comunicação): pergunte entre quais setores, se gera retrabalho, impacto em prazo, prejuízo, indicadores
- Retorne APENAS a próxima mensagem (não inclua metadados)
- Quando tiver cobertura suficiente dos tópicos: "Obrigado. Com essas informações vou criar seu perfil estratégico. Em instantes você terá acesso ao sistema."

Retorne somente o texto da sua próxima fala:`;

  const response = await ai.chatCompletion(prompt, { max_tokens: 400 });
  return (response || '').trim();
}

/**
 * Gera próxima pergunta via IA - USUÁRIO
 */
async function generateNextQuestionUsuario(companyId, userId, userAnswer, history, user) {
  const ctx = userContext.buildUserContext(user);
  const histStr = history.map(m => `${m.role}: ${m.content}`).join('\n');
  const cargo = user?.role || ctx?.area || 'Colaborador';

  const prompt = `Você é uma assistente estratégica pessoal conduzindo entrevista com ${cargo}.

REGRA: Seja adaptativa - aprofunde quando respostas forem vagas.
Perguntas obrigatórias: exemplos reais, maior frustração, onde falta informação, desperdício de tempo, decisões lentas, melhorias imediatas, processo mais crítico, metas claras.

TÓPICOS: ${USUARIO_TOPICOS.join(', ')}

HISTÓRICO:
${histStr}

ÚLTIMA RESPOSTA: ${userAnswer || '(início)'}

Se início: "Olá! Sou sua assistente estratégica pessoal. Para personalizar sua experiência, preciso conhecê-lo melhor. Qual seu nome completo e cargo?"
Uma pergunta por vez. Quando tiver cobertura: "Obrigado! Seu perfil foi registrado. Boas-vindas ao sistema."

Retorne APENAS sua próxima fala:`;

  const response = await ai.chatCompletion(prompt, { max_tokens: 350 });
  return (response || '').trim();
}

/**
 * Processa resposta e retorna próxima mensagem da IA
 */
async function processAnswer(companyId, userId, tipo, userAnswer, user) {
  const history = await getConversationHistory(companyId, userId, tipo);

  await db.query(`
    INSERT INTO onboarding_conversa (company_id, user_id, tipo, "role", content)
    VALUES ($1, $2, $3, 'user', $4)
  `, [companyId, userId, tipo, userAnswer || '(continuação)']);

  let nextMessage;
  if (tipo === 'empresa') {
    nextMessage = await generateNextQuestionEmpresa(companyId, userId, userAnswer, history);
  } else {
    nextMessage = await generateNextQuestionUsuario(companyId, userId, userAnswer, history, user);
  }

  await db.query(`
    INSERT INTO onboarding_conversa (company_id, user_id, tipo, "role", content)
    VALUES ($1, $2, $3, 'assistant', $4)
  `, [companyId, userId, tipo, nextMessage]);

  const isComplete = /perfil.*registrado|acesso ao sistema|obrigado.*informações/i.test(nextMessage);

  if (isComplete) {
    await finalizeOnboarding(companyId, userId, tipo, [...history, { role: 'user', content: userAnswer }, { role: 'assistant', content: nextMessage }], user);
  }

  return { message: nextMessage, completed: isComplete };
}

/**
 * Finaliza onboarding e gera perfis
 */
async function finalizeOnboarding(companyId, userId, tipo, fullHistory, user) {
  const histText = fullHistory.map(m => `${m.role}: ${m.content}`).join('\n\n');

  if (tipo === 'empresa') {
    const prompt = `Analise esta entrevista e retorne JSON:
{
  "perfil_estrategico": { "segmento", "pontos_fortes", "pontos_fracos", "oportunidades" },
  "resumo_executivo": "2-3 parágrafos",
  "mapa_riscos": [{ "risco": "", "impacto": "", "mitigacao": "" }],
  "resumo_operacional": "parágrafo",
  "resumo_cultural": "parágrafo"
}

ENTREVISTA:
${histText}`;

    const res = await ai.chatCompletion(prompt, { max_tokens: 1000 });
    let parsed = {};
    try {
      const match = (res || '').match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch (_) {}

    await db.query(`
      INSERT INTO memoria_empresa (company_id, respostas_raw, perfil_estrategico, resumo_executivo, mapa_riscos, resumo_operacional, resumo_cultural, onboarding_completed, last_context_update, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, now(), now())
      ON CONFLICT (company_id) DO UPDATE SET
        respostas_raw = EXCLUDED.respostas_raw,
        perfil_estrategico = COALESCE(EXCLUDED.perfil_estrategico, memoria_empresa.perfil_estrategico),
        resumo_executivo = COALESCE(EXCLUDED.resumo_executivo, memoria_empresa.resumo_executivo),
        mapa_riscos = COALESCE(EXCLUDED.mapa_riscos, memoria_empresa.mapa_riscos),
        resumo_operacional = COALESCE(EXCLUDED.resumo_operacional, memoria_empresa.resumo_operacional),
        resumo_cultural = COALESCE(EXCLUDED.resumo_cultural, memoria_empresa.resumo_cultural),
        onboarding_completed = true,
        last_context_update = now(),
        updated_at = now()
    `, [
      companyId,
      JSON.stringify(fullHistory),
      JSON.stringify(parsed.perfil_estrategico || {}),
      parsed.resumo_executivo || null,
      JSON.stringify(parsed.mapa_riscos || []),
      parsed.resumo_operacional || null,
      parsed.resumo_cultural || null
    ]);
  } else {
    const prompt = `Analise a entrevista e retorne JSON:
{
  "perfil_tecnico": { "cargo", "responsabilidades", "indicadores" },
  "perfil_comportamental": { "dificuldades", "pontos_forte", "sugestoes" },
  "mapa_responsabilidade": {},
  "resumo_estrategico": "parágrafo"
}

ENTREVISTA:
${histText}`;

    const res = await ai.chatCompletion(prompt, { max_tokens: 600 });
    let parsed = {};
    try {
      const match = (res || '').match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch (_) {}

    await db.query(`
      INSERT INTO memoria_usuario (user_id, company_id, respostas_raw, perfil_tecnico, perfil_comportamental, mapa_responsabilidade, resumo_estrategico, onboarding_completed, last_context_update, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, now(), now())
      ON CONFLICT (user_id) DO UPDATE SET
        respostas_raw = EXCLUDED.respostas_raw,
        perfil_tecnico = COALESCE(EXCLUDED.perfil_tecnico, memoria_usuario.perfil_tecnico),
        perfil_comportamental = COALESCE(EXCLUDED.perfil_comportamental, memoria_usuario.perfil_comportamental),
        mapa_responsabilidade = COALESCE(EXCLUDED.mapa_responsabilidade, memoria_usuario.mapa_responsabilidade),
        resumo_estrategico = COALESCE(EXCLUDED.resumo_estrategico, memoria_usuario.resumo_estrategico),
        onboarding_completed = true,
        last_context_update = now(),
        updated_at = now()
    `, [
      userId,
      companyId,
      JSON.stringify(fullHistory),
      JSON.stringify(parsed.perfil_tecnico || {}),
      JSON.stringify(parsed.perfil_comportamental || {}),
      JSON.stringify(parsed.mapa_responsabilidade || {}),
      parsed.resumo_estrategico || null
    ]);
  }
}

/**
 * Inicia ou retoma onboarding - retorna mensagem inicial
 */
async function startOrResumeOnboarding(companyId, userId, tipo, user) {
  const history = await getConversationHistory(companyId, userId, tipo);

  if (history.length > 0) {
    const last = history[history.length - 1];
    if (last.role === 'assistant') {
      return { message: last.content, completed: false };
    }
  }

  let message;
  if (tipo === 'empresa') {
    message = await generateNextQuestionEmpresa(companyId, userId, null, history);
  } else {
    message = await generateNextQuestionUsuario(companyId, userId, null, history, user);
  }

  await db.query(`
    INSERT INTO onboarding_conversa (company_id, user_id, tipo, "role", content)
    VALUES ($1, $2, $3, 'assistant', $4)
  `, [companyId, userId, tipo, message]);

  return { message, completed: false };
}

/**
 * Retorna contexto de memória para sessão (usuário retornando)
 */
async function getMemoryContext(user) {
  const companyId = user?.company_id;
  const userId = user?.id;
  if (!companyId || !userId) return { company: null, user: null };

  const [companyMem, userMem] = await Promise.all([
    db.query('SELECT * FROM memoria_empresa WHERE company_id = $1', [companyId]),
    db.query('SELECT * FROM memoria_usuario WHERE user_id = $1', [userId])
  ]);

  return {
    company: companyMem.rows[0] || null,
    user: userMem.rows[0] || null
  };
}

module.exports = {
  getOnboardingStatus,
  processAnswer,
  startOrResumeOnboarding,
  getConversationHistory,
  getMemoryContext,
  needsCompanyOnboarding,
  needsUserOnboarding
};
