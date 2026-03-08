/**
 * ONBOARDING INTELIGENTE + MEMÓRIA PERSISTENTE
 * Entrevista estratégica adaptativa com IA
 */
const db = require('../db');
const ai = require('./ai');
const userContext = require('./userContext');
const structuralContextService = require('./structuralContextService');

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

  // CEO não faz onboarding
  if (user?.role === 'ceo') {
    return { needsOnboarding: false, activeType: null, companyCompleted: true, userCompleted: true };
  }

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
    FROM onboarding_conversations
    WHERE company_id = $1 AND user_id = $2 AND tipo = $3
    ORDER BY created_at DESC
    LIMIT $4
  `, [companyId, userId, tipo, limit]);
  return r.rows.map(row => ({ role: row.role, content: row.content, created_at: row.created_at })).reverse();
}

/**
 * Gera próxima pergunta ou aprofundamento via IA - EMPRESA
 */
const PERGUNTAS_FIXAS_EMPRESA = [
  'Olá! Antes de começarmos, preciso entender profundamente sua empresa. Qual é o nome oficial da empresa? (Se houver nome fantasia e razão social, informe ambos.)',
  'Qual é o segmento de atuação da empresa? (Ex: indústria alimentícia, metalúrgica, tecnologia, logística, serviços, etc.)',
  'Quantos funcionários a empresa possui atualmente? (Se possível, separe entre administrativo e operacional.)',
  'Quantas linhas de produção a empresa possui? (Se não for indústria, quantas unidades operacionais ou frentes de serviço.)',
  'O que a empresa produz ou quais serviços presta? Descreva de forma geral.',
  'Quais são os principais produtos fabricados ou comercializados? Liste os principais itens ou linhas de produtos.'
];

async function generateNextQuestionEmpresa(companyId, userId, userAnswer, history) {
  const userMsgs = history.filter(m => m.role === 'user').length;

  // Perguntas 1-6: fixas
  if (userMsgs < PERGUNTAS_FIXAS_EMPRESA.length) {
    return PERGUNTAS_FIXAS_EMPRESA[userMsgs];
  }

  // Perguntas 7-10: IA livre explorando problemas e dores
  const histStr = history.map(m => `${m.role}: ${m.content}`).join('\n');
  const prompt = `Você é uma IA estratégica entrevistando o diretor de uma empresa.

Já coletou dados básicos (nome, segmento, funcionários, produção, produtos).
Agora faça perguntas abertas e inteligentes sobre:
- Principais problemas operacionais
- Falhas de comunicação interna
- Gargalos de produção ou execução
- Onde há mais retrabalho ou desperdício
- Metas e indicadores que não estão sendo atingidos
- O que mais dói no dia a dia da gestão
- O que esperam melhorar com o sistema

HISTÓRICO:
${histStr}

ÚLTIMA RESPOSTA: ${userAnswer}

REGRAS:
- Uma pergunta por vez
- Seja direto e estratégico
- Aprofunde se a resposta for vaga (peça exemplos, impactos financeiros)
- Retorne APENAS o texto da próxima pergunta

Retorne somente sua próxima pergunta:`;

  const response = await ai.chatCompletion(prompt, { max_tokens: 400 });
  const trimmed = (response || '').trim();
  if (trimmed.startsWith('FALLBACK:')) {
    throw new Error('A assistente de IA está temporariamente indisponível. Verifique se OPENAI_API_KEY está configurado e tente novamente em instantes.');
  }
  return trimmed;
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
  const trimmed = (response || '').trim();
  if (trimmed.startsWith('FALLBACK:')) {
    throw new Error('A assistente de IA está temporariamente indisponível. Verifique se OPENAI_API_KEY está configurado e tente novamente em instantes.');
  }
  return trimmed;
}

/**
 * Processa resposta e retorna próxima mensagem da IA
 */
async function processAnswer(companyId, userId, tipo, userAnswer, user) {
  const history = await getConversationHistory(companyId, userId, tipo);

  await db.query(`
    INSERT INTO onboarding_conversations (company_id, user_id, tipo, "role", content)
    VALUES ($1, $2, $3, 'user', $4)
  `, [companyId, userId, tipo, userAnswer || '(continuação)']);

  const userMsgCount = history.filter(m => m.role === 'user').length + 1;
  const maxExchanges = tipo === 'empresa' ? 10 : 6;

  let nextMessage;
  if (userMsgCount >= maxExchanges) {
    nextMessage = tipo === 'empresa'
      ? 'Obrigado. Com essas informações vou criar o perfil estratégico da empresa. Agora preciso conhecer você melhor.'
      : 'Obrigado! Seu perfil foi registrado. Boas-vindas ao sistema.';
  } else if (tipo === 'empresa') {
    nextMessage = await generateNextQuestionEmpresa(companyId, userId, userAnswer, history);
  } else {
    nextMessage = await generateNextQuestionUsuario(companyId, userId, userAnswer, history, user);
  }

  await db.query(`
    INSERT INTO onboarding_conversations (company_id, user_id, tipo, "role", content)
    VALUES ($1, $2, $3, 'assistant', $4)
  `, [companyId, userId, tipo, nextMessage]);

  const isComplete = (typeof userMsgCount !== 'undefined' && userMsgCount >= maxExchanges) ||
    /perfil.*registrado|acesso ao sistema|obrigado.*informa|boas-vindas|terá acesso|conhecer você melhor/i.test(nextMessage);

  if (isComplete) {
    await finalizeOnboarding(companyId, userId, tipo, [...history, { role: 'user', content: userAnswer }, { role: 'assistant', content: nextMessage }], user);
  }

  // Se empresa completou e usuário é diretor, sinalizar próxima fase (usuario)
  let nextPhase = null;
  if (isComplete && tipo === 'empresa') {
    nextPhase = 'usuario';
  }

  return { message: nextMessage, completed: isComplete, nextPhase };
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
    INSERT INTO onboarding_conversations (company_id, user_id, tipo, "role", content)
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

  const [companyMem, userMem, structuralSummary] = await Promise.all([
    db.query('SELECT * FROM memoria_empresa WHERE company_id = $1', [companyId]),
    db.query('SELECT * FROM memoria_usuario WHERE user_id = $1', [userId]),
    structuralContextService.buildStructuralSummary(companyId).catch(() => '')
  ]);

  const company = companyMem.rows[0] || null;
  if (company && structuralSummary) {
    company.structural_summary = structuralSummary;
  }

  return {
    company,
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
