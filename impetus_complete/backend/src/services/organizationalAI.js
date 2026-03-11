      await messagingAdapter.sendMessage(companyId, phone, message);
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
