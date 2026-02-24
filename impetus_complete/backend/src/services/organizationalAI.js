/**
 * IA ORGANIZACIONAL ATIVA
 * Protocolo operacional: escuta, entende, registra, organiza, lembra, escala, auxilia
 * 100% baseado na comunicação via WhatsApp
 */

const db = require('../db');
const ai = require('./ai');
const zapi = require('./zapi');
const communicationEscalation = require('./communicationEscalation');
const userContext = require('./userContext');

const EVENT_TYPES = [
  'quebra_peca',
  'falha_maquina',
  'falta_insumo',
  'atraso',
  'pedido_material',
  'risco',
  'parada_producao',
  'solicitacao_urgente',
  'info_financeira',
  'falha_técnica',
  'tarefa',
  'alerta',
  'comunicado',
  'duvida',
  'outro'
];

const INCOMPLETE_QUESTIONS = {
  quebra_peca: ['Qual máquina?', 'Qual o código da peça?', 'Foi substituída?', 'Houve parada de produção?'],
  falha_maquina: ['Qual máquina?', 'Qual o problema observado?', 'Houve parada?', 'Já foi acionada manutenção?'],
  parada_producao: ['Qual linha/máquina?', 'Qual a causa?', 'Tempo estimado de retorno?'],
  falta_insumo: ['Qual insumo?', 'Quantidade necessária?', 'Urgência?'],
  pedido_material: ['Qual material?', 'Quantidade?', 'Setor solicitante?']
};

/**
 * Classifica evento operacional (IA + keywords)
 */
async function classifyOperationalEvent(text) {
  const low = (text || '').toLowerCase();

  const keywordMap = {
    quebra_peca: /quebr|engrenagem|peca|peça|substitui|almoxarifado|consumo/i,
    falha_maquina: /falha|parou|não liga|erro|vaza|queima|ruído|vibra|trava/i,
    falta_insumo: /falta|acabou|sem |insumo|material/i,
    atraso: /atraso|atrasad|demora|prazo/i,
    pedido_material: /pedir|solicitar|material|comprar|reposição/i,
    risco: /risco|perigo|atenção|alerta/i,
    parada_producao: /parada|parou.*produção|linha.*parada/i,
    solicitacao_urgente: /urgente|urgência|asap|imediat/i,
    info_financeira: /custo|preço|valor|orcamento|financeiro/i
  };

  for (const [type, regex] of Object.entries(keywordMap)) {
    if (regex.test(low)) return type;
  }

  if (!ai || typeof ai.chatCompletion !== 'function') return 'outro';

  const prompt = `Classifique esta mensagem operacional industrial em EXATAMENTE uma categoria:
quebra_peca, falha_maquina, falta_insumo, atraso, pedido_material, risco, parada_producao, solicitacao_urgente, info_financeira, falha_técnica, tarefa, alerta, comunicado, duvida, outro

Mensagem: "${text.slice(0, 400).replace(/"/g, "'")}"

Responda SOMENTE a palavra em minúsculas.`;

  try {
    const out = await ai.chatCompletion(prompt, { max_tokens: 30 });
    const kind = (out || '').trim().toLowerCase().replace(/[^a-z_áéíóú]/g, '').replace('tecnica', 'técnica');
    return EVENT_TYPES.includes(kind) ? kind : 'outro';
  } catch (e) {
    return 'outro';
  }
}

/**
 * Extrai dados estruturados via IA
 */
async function extractEventData(text, eventType) {
  const prompt = `Extraia dados da mensagem operacional. Mensagem: "${(text || '').slice(0, 500).replace(/"/g, "'")}"
Tipo: ${eventType}

Retorne JSON com chaves (apenas as que encontrar): machine_name, machine_code, part_code, part_name, quantity, production_stop, was_replaced.
Exemplo: {"machine_name":"Linha 2","part_code":"ENG-001","production_stop":true}`;

  try {
    const out = await ai.chatCompletion(prompt, { max_tokens: 150 });
    const match = (out || '').match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (e) {
    console.warn('[ORG_AI] extractEventData:', e.message);
  }
  return {};
}

/**
 * Detecta se evento está incompleto e retorna perguntas pendentes
 */
function detectIncompleteEvent(eventType, extractedData) {
  const questions = INCOMPLETE_QUESTIONS[eventType];
  if (!questions) return { incomplete: false, questions: [] };

  const missing = [];
  if (!extractedData.machine_name && !extractedData.machine_code && questions.some(q => q.includes('máquina'))) {
    missing.push(questions[0]);
  }
  if (!extractedData.part_code && !extractedData.part_name && questions.some(q => q.includes('peça') || q.includes('código'))) {
    missing.push(questions[1]);
  }
  if (extractedData.was_replaced === undefined && questions.some(q => q.includes('substituída'))) {
    missing.push(questions[2]);
  }
  if (extractedData.production_stop === undefined && questions.some(q => q.includes('parada'))) {
    missing.push(questions[3]);
  }

  if (missing.length === 0 && (!extractedData.machine_name && !extractedData.machine_code) && eventType !== 'outro') {
    missing.push(questions[0] || 'Qual máquina/equipamento?');
  }

  return {
    incomplete: missing.length > 0,
    questions: missing.slice(0, 4)
  };
}

/**
 * Registra evento operacional e histórico de máquina
 */
async function registerOperationalEvent(companyId, opts) {
  const {
    communicationId,
    eventType,
    severity,
    senderPhone,
    senderName,
    department,
    extractedData,
    metadata
  } = opts;

  const r = await db.query(`
    INSERT INTO operational_events (
      company_id, communication_id, event_type, severity, status,
      machine_name, machine_code, part_code, part_name,
      sender_phone, sender_name, department,
      production_stop, was_replaced, extracted_data, metadata
    ) VALUES ($1, $2, $3, $4, 'open', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING id, event_type, machine_code, part_code
  `, [
    companyId,
    communicationId,
    eventType,
    severity || 'medium',
    extractedData?.machine_name || null,
    extractedData?.machine_code || null,
    extractedData?.part_code || null,
    extractedData?.part_name || null,
    senderPhone || null,
    senderName || null,
    department || null,
    extractedData?.production_stop ?? null,
    extractedData?.was_replaced ?? null,
    JSON.stringify(extractedData || {}),
    JSON.stringify(metadata || {})
  ]);

  const ev = r.rows[0];
  if (ev?.part_code || ev?.machine_code) {
    await db.query(`
      INSERT INTO machine_history (company_id, machine_code, machine_name, event_type, part_code, part_name, quantity, operational_event_id, communication_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      companyId,
      ev.machine_code || extractedData?.machine_code,
      extractedData?.machine_name || null,
      eventType,
      ev.part_code || extractedData?.part_code,
      extractedData?.part_name || null,
      extractedData?.quantity || 1,
      ev.id,
      communicationId
    ]);
  }
  return ev;
}

/**
 * Avalia consumo e sugere reposição
 */
async function evaluateConsumptionAndSuggest(companyId, partCode, machineCode) {
  try {
    const r = await db.query(`
      SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '30 days') as last_30d
      FROM machine_history
      WHERE company_id = $1 AND (part_code = $2 OR part_name ILIKE $2)
    `, [companyId, partCode || '-']);

    const total = parseInt(r.rows[0]?.total || 0);
    const last30 = parseInt(r.rows[0]?.last_30d || 0);
    const avgMonth = total / 3;
    if (last30 > 0 && last30 >= avgMonth * 0.8) {
      return {
        suggest: true,
        message: `Consumo da peça ${partCode || 'registrada'} acima da média nos últimos 30 dias. Recomendo verificar estoque e reposição.`,
        last30,
        total
      };
    }
  } catch (e) {
    console.warn('[ORG_AI] evaluateConsumption:', e.message);
  }
  return { suggest: false };
}

/**
 * Notifica destinatários via escalonamento
 */
async function notifyRecipients(companyId, message, escalationTargets, context = {}) {
  const recipients = await communicationEscalation.getRecipientsByEscalation(
    companyId,
    escalationTargets,
    context.department
  );

  const phones = recipients
    .filter(u => (u.whatsapp_number || u.phone || '').replace(/\D/g, '').length >= 10)
    .map(u => String(u.whatsapp_number || u.phone || '').replace(/\D/g, ''))
    .filter(p => p.length >= 10);

  const sent = [];
  for (const phone of [...new Set(phones)].slice(0, 10)) {
    try {
      await zapi.sendTextMessage(companyId, phone, message);
      sent.push(phone);
    } catch (e) {
      console.warn('[ORG_AI] notify:', phone, e.message);
    }
  }
  return sent;
}

/**
 * Salva evento incompleto e retorna mensagem de cobrança
 */
async function saveIncompleteAndAsk(companyId, communicationId, senderPhone, eventType, questions) {
  const phoneNorm = String(senderPhone || '').replace(/\D/g, '');
  const r = await db.query(`
    INSERT INTO ai_incomplete_events (company_id, communication_id, sender_phone, pending_questions, status)
    VALUES ($1, $2, $3, $4, 'pending')
    RETURNING id
  `, [companyId, communicationId, phoneNorm || senderPhone, JSON.stringify(questions)]);

  const qText = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
  return `Registrei sua comunicação. Para completar o registro, preciso de mais informações:\n\n${qText}\n\nPor favor, responda em sequência.`;
}

/**
 * Pipeline principal: processa mensagem conforme protocolo IA Organizacional
 */
async function processMessage(companyId, opts) {
  const {
    text,
    sender,
    senderPhone,
    communicationId,
    msgType
  } = opts;

  if (!text || text.trim().length < 3) return { handled: false };

  const eventType = await classifyOperationalEvent(text);

  if (eventType === 'outro' || eventType === 'comunicado') {
    return { handled: false, eventType };
  }

  if (eventType === 'duvida') {
    const low = (text || '').toLowerCase();
    const isExternal = /preço|cotação|litro|mercado|quanto está|valor do|aço|óleo/i.test(low);
    const reply = isExternal
      ? await answerExternalQuestion(text)
      : await answerInternalQuestion(companyId, text, null);
    return { handled: true, reply, eventType: 'duvida' };
  }

  const escalation = await communicationEscalation.classifyMessage(text, companyId);
  const extractedData = await extractEventData(text, eventType);
  const { incomplete, questions } = detectIncompleteEvent(eventType, extractedData);

  if (incomplete && questions.length > 0) {
    const reply = await saveIncompleteAndAsk(companyId, communicationId, senderPhone, eventType, questions);
    return {
      handled: true,
      reply,
      incompleteEvent: true,
      eventType
    };
  }

  const ev = await registerOperationalEvent(companyId, {
    communicationId,
    eventType,
    severity: escalation.severity,
    senderPhone,
    metadata: { originalText: text.slice(0, 200) },
    extractedData
  });

  const targets = Array.isArray(escalation.escalation) ? escalation.escalation : ['supervisão'];
  if (targets.includes('coordenação') || targets.includes('gerência') || targets.includes('direção')) {
    const notifyMsg = `[IMPETUS] Evento registrado: ${eventType}\nOrigem: ${sender || senderPhone}\n${extractedData.machine_name ? `Máquina: ${extractedData.machine_name}` : ''}${extractedData.part_code ? `\nPeça: ${extractedData.part_code}` : ''}\n\nMensagem: ${text.slice(0, 150)}...`;
    try {
      const sent = await notifyRecipients(companyId, notifyMsg, targets);
      await db.query(
        'UPDATE operational_events SET escalation_sent_at = now() WHERE id = $1',
        [ev.id]
      );
    } catch (e) {
      console.warn('[ORG_AI] notify:', e.message);
    }
  }

  let reply = `✓ Evento registrado (${eventType}). `;
  if (ev) {
    const consumption = await evaluateConsumptionAndSuggest(companyId, extractedData?.part_code, extractedData?.machine_code);
    if (consumption.suggest) {
      reply += `\n\n${consumption.message}`;
    } else if (targets.length > 0) {
      reply += `Notificação enviada aos responsáveis.`;
    }
  }

  return {
    handled: true,
    reply,
    eventType,
    eventId: ev?.id
  };
}

/**
 * Processa resposta a evento incompleto (continuação da conversa)
 */
async function processIncompleteFollowUp(companyId, senderPhone, text, communicationId) {
  const phoneNorm = String(senderPhone || '').replace(/\D/g, '');
  if (phoneNorm.length < 8) return { handled: false };

  const r = await db.query(`
    SELECT id, pending_questions, answered_questions, operational_event_id
    FROM ai_incomplete_events
    WHERE company_id = $1 AND status = 'pending'
      AND (REPLACE(REPLACE(REPLACE(sender_phone, ' ', ''), '-', ''), '+', '') = REPLACE(REPLACE(REPLACE($2, ' ', ''), '-', ''), '+', '')
           OR RIGHT(REPLACE(REPLACE(sender_phone, ' ', ''), '-', ''), 10) = RIGHT($2, 10))
    ORDER BY created_at DESC LIMIT 1
  `, [companyId, phoneNorm]);

  if (r.rows.length === 0) return { handled: false };

  const inc = r.rows[0];
  const pending = inc.pending_questions || [];
  const answered = inc.answered_questions || {};

  const nextIdx = Object.keys(answered).length;
  if (nextIdx >= pending.length) return { handled: false };

  answered[`q${nextIdx}`] = text;
  await db.query(
    'UPDATE ai_incomplete_events SET answered_questions = $1, updated_at = now() WHERE id = $2',
    [JSON.stringify(answered), inc.id]
  );

  if (Object.keys(answered).length >= pending.length) {
    const extractedData = {};
    pending.forEach((q, i) => {
      const a = answered[`q${i}`] || '';
      if (q.includes('máquina') || q.includes('Máquina')) extractedData.machine_name = a;
      else if (q.includes('código') || q.includes('peça')) extractedData.part_code = a;
      else if (q.includes('substituída')) extractedData.was_replaced = /sim|sim|yes|troquei|substitui/i.test(a);
      else if (q.includes('parada')) extractedData.production_stop = /sim|sim|yes|parou/i.test(a);
    });

    await db.query(
      'UPDATE ai_incomplete_events SET status = \'completed\', completed_at = now() WHERE id = $1',
      [inc.id]
    );

    const ev = await registerOperationalEvent(companyId, {
      communicationId,
      eventType: 'quebra_peca',
      senderPhone,
      extractedData
    });

    return {
      handled: true,
      reply: `✓ Registro completo. Evento finalizado e notificação enviada aos responsáveis.`,
      completed: true,
      eventId: ev?.id
    };
  }

  const nextQ = pending[Object.keys(answered).length];
  return {
    handled: true,
    reply: nextQ
  };
}

/**
 * Detecta padrão de falhas e gera alerta proativo
 */
async function detectFailurePattern(companyId, windowHours = 24, minFails = 3) {
  const r = await db.query(`
    SELECT machine_code, machine_name, COUNT(*) as cnt
    FROM operational_events
    WHERE company_id = $1 AND event_type IN ('quebra_peca', 'falha_maquina', 'parada_producao')
      AND created_at >= now() - ($2 * interval '1 hour')
      AND status = 'open'
    GROUP BY machine_code, machine_name
    HAVING COUNT(*) >= $3
  `, [companyId, windowHours, minFails]);

  return r.rows || [];
}

/**
 * Gera mensagem proativa para o grupo
 */
function buildProactiveMessage(pattern) {
  const machine = pattern.machine_name || pattern.machine_code || 'equipamento';
  const cnt = pattern.cnt || pattern.count || 0;
  return `Equipe IMPETUS, identifiquei ${cnt} falhas/ocorrências em ${machine} nas últimas 24h. Poderiam confirmar se houve substituição de peça ou ajuste técnico?`;
}

/**
 * Busca dados internos para responder perguntas (com governança de escopo)
 */
async function fetchInternalDataForQuestion(companyId, question, scope) {
  const low = (question || '').toLowerCase();
  const data = {};

  if (/falha|parada|quebr|evento/i.test(low)) {
    const r = await db.query(`
      SELECT event_type, COUNT(*) as cnt, machine_name
      FROM operational_events
      WHERE company_id = $1 AND created_at >= now() - INTERVAL '7 days'
      GROUP BY event_type, machine_name
      ORDER BY cnt DESC
      LIMIT 10
    `, [companyId]);
    data.eventos = r.rows || [];
  }

  if (/produção|producao|comunicação|comunicacao/i.test(low)) {
    const r = await db.query(`
      SELECT COUNT(*) as total FROM communications
      WHERE company_id = $1 AND created_at >= now() - INTERVAL '7 days'
    `, [companyId]);
    data.comunicacoes = parseInt(r.rows[0]?.total || 0);
  }

  if (/máquina|maquina|mais parou|equipamento/i.test(low)) {
    const r = await db.query(`
      SELECT machine_name, machine_code, COUNT(*) as cnt
      FROM operational_events
      WHERE company_id = $1 AND (machine_name IS NOT NULL OR machine_code IS NOT NULL)
        AND created_at >= now() - INTERVAL '30 days'
      GROUP BY machine_name, machine_code
      ORDER BY cnt DESC
      LIMIT 5
    `, [companyId]);
    data.maquinas = r.rows || [];
  }

  return data;
}

/**
 * Assistente: responde perguntas internas (com dados reais quando aplicável)
 */
async function answerInternalQuestion(companyId, question, askerContext) {
  const ctx = askerContext ? userContext.buildUserContext(askerContext) : null;
  const scope = ctx?.scope || 'individual';

  const data = await fetchInternalDataForQuestion(companyId, question, scope);
  const dataStr = Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : '';

  const prompt = `Você é o Impetus, assistente operacional. O usuário pergunta: "${question.slice(0, 300)}"

Contexto: área ${ctx?.area || 'não informada'}, escopo ${scope}.

${dataStr ? `Dados disponíveis (use para responder de forma objetiva):\n${dataStr}` : ''}

Responda de forma objetiva. Use os dados se relevantes. Respeite o escopo (${scope}): direção vê global, gerência vê setor, colaborador vê individual. Máximo 200 palavras.`;

  return await ai.chatCompletion(prompt, { max_tokens: 400 });
}

/**
 * Assistente: informações externas (preço, mercado)
 */
async function answerExternalQuestion(question) {
  const prompt = `O usuário pergunta: "${question.slice(0, 300)}"

Se for sobre preços de mercado, commodities, cotações: indique que você não tem acesso em tempo real e sugira fontes (sites de cotação, fornecedores). Se for informação geral, responda de forma útil. Máximo 150 palavras.`;

  return await ai.chatCompletion(prompt, { max_tokens: 300 });
}

module.exports = {
  classifyOperationalEvent,
  extractEventData,
  detectIncompleteEvent,
  registerOperationalEvent,
  evaluateConsumptionAndSuggest,
  notifyRecipients,
  processMessage,
  processIncompleteFollowUp,
  detectFailurePattern,
  buildProactiveMessage,
  answerInternalQuestion,
  answerExternalQuestion,
  EVENT_TYPES,
  INCOMPLETE_QUESTIONS
};
