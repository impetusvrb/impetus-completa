/**
 * MODO EXECUTIVO (CEO Mode)
 * Integração WhatsApp + IA para acesso estratégico ao sistema
 * O CEO não opera o sistema - o sistema serve o CEO
 */

const db = require('../db');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/crypto');
const ai = require('./ai');
const zapi = require('./zapi');

const EXECUTIVE_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutos de inatividade
const REVALIDATION_DAYS = 90; // Revalidação periódica

/**
 * Normaliza número de telefone para comparação
 */
function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '').slice(-11); // últimos 11 dígitos
}

/**
 * Busca CEO da empresa pelo número de WhatsApp
 */
async function findCEOByWhatsApp(companyId, senderPhone) {
  const normalized = normalizePhone(senderPhone);
  if (normalized.length < 10) return null;

  const result = await db.query(`
    SELECT id, name, email, whatsapp_number, role,
           executive_verified, ipc_document_hash, executive_session_token,
           executive_last_verified, executive_session_expires_at, executive_last_activity
    FROM users
    WHERE company_id = $1 AND role = 'ceo' AND active = true
      AND deleted_at IS NULL
      AND whatsapp_number IS NOT NULL AND whatsapp_number != ''
  `, [companyId]);

  for (const user of result.rows) {
    const userPhone = normalizePhone(user.whatsapp_number);
    if (userPhone === normalized) return user;
    if (userPhone.endsWith(normalized.slice(-11)) || normalized.endsWith(userPhone.slice(-11))) return user;
  }
  return null;
}

/**
 * Gera hash SHA-256 do conteúdo (para documento IPC)
 */
function computeDocumentHash(bufferOrBase64) {
  const buf = Buffer.isBuffer(bufferOrBase64)
    ? bufferOrBase64
    : Buffer.from(bufferOrBase64 || '', 'base64');
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Gera token de sessão executiva (criptografado)
 */
function generateExecutiveSessionToken() {
  const token = crypto.randomBytes(32).toString('hex');
  try {
    return process.env.ENCRYPTION_KEY ? encrypt(token) : token;
  } catch {
    return token;
  }
}

/**
 * Renova sessão executiva (atualiza expires_at e last_activity)
 */
async function renewExecutiveSession(userId) {
  const expiresAt = new Date(Date.now() + EXECUTIVE_SESSION_TTL_MS);
  await db.query(`
    UPDATE users
    SET executive_session_expires_at = $1, executive_last_activity = now()
    WHERE id = $2
  `, [expiresAt, userId]);
}

/**
 * Verifica se sessão executiva está válida
 */
async function isExecutiveSessionValid(ceo) {
  if (!ceo.executive_session_expires_at) return false;
  const expires = new Date(ceo.executive_session_expires_at);
  if (expires < new Date()) return false;

  // Verificar revalidação periódica
  const lastVerified = ceo.executive_last_verified ? new Date(ceo.executive_last_verified) : null;
  if (lastVerified) {
    const daysSince = (Date.now() - lastVerified.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSince > REVALIDATION_DAYS) return false;
  }
  return true;
}

/**
 * Registra ação executiva no log de auditoria (severity critical)
 */
async function logExecutiveAction(params) {
  const {
    companyId, userId, action, channel = 'whatsapp',
    requestSummary, responseSummary, ipAddress, metadata = {}
  } = params;

  try {
    await db.query(`
      INSERT INTO executive_audit_logs (
        company_id, user_id, action, channel,
        request_summary, response_summary, ip_address, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      companyId, userId, action, channel,
      requestSummary?.slice(0, 500) || null,
      responseSummary?.slice(0, 500) || null,
      ipAddress || null,
      JSON.stringify(metadata)
    ]);
  } catch (err) {
    console.error('[EXECUTIVE_AUDIT_ERROR]', err.message);
  }

  // Também registrar no audit_logs geral com severity critical
  const { logAction } = require('../middleware/audit');
  await logAction({
    companyId,
    userId,
    action: `executive_${action}`,
    entityType: 'executive',
    description: `[CEO Mode] ${action}`,
    changes: { requestSummary, responseSummary },
    severity: 'critical'
  }).catch(() => {});
}

/**
 * Mensagem de solicitação de verificação (primeiro contato)
 */
const VERIFICATION_REQUEST = `Para liberar acesso executivo completo aos dados estratégicos da sua indústria, preciso validar sua autoridade como CEO.

Por favor, envie o certificado IPC Brasil da empresa ou assinatura digital equivalente.`;

/**
 * Mensagem de bloqueio (não verificado)
 */
const BLOCKED_RESPONSE = `Acesso executivo bloqueado. Sua verificação ainda está pendente.

${VERIFICATION_REQUEST}`;

/**
 * Processa primeiro contato do CEO - solicita documento de verificação
 */
async function handleCEOFirstContact(companyId, ceo, senderPhone, hasDocument = false, documentHash = null) {
  if (hasDocument && documentHash) {
    await db.query(`
      UPDATE users
      SET ipc_document_hash = $1, executive_verified = true, executive_last_verified = now(),
          executive_session_token = $2, executive_session_expires_at = $3, executive_last_activity = now()
      WHERE id = $4
    `, [
      documentHash,
      generateExecutiveSessionToken(),
      new Date(Date.now() + EXECUTIVE_SESSION_TTL_MS),
      ceo.id
    ]);

    await logExecutiveAction({
      companyId,
      userId: ceo.id,
      action: 'document_verification_received',
      requestSummary: 'Documento IPC recebido',
      responseSummary: 'Verificação concluída. Acesso liberado.',
      metadata: { hashStored: true }
    });

    return `✓ Verificação executiva concluída. Acesso liberado.

Você pode agora consultar:
• Resumo geral da indústria
• Setores com risco
• Produção da última semana
• Principais falhas do mês
• Indicadores financeiros
• Relatório consolidado

Digite sua pergunta estratégica.`;
  }

  return VERIFICATION_REQUEST;
}

/**
 * Busca dados estratégicos do banco para a IA consolidar
 */
async function fetchExecutiveData(companyId) {
  const data = {};

  try {
    const [comms, proposals, points, trend, failures] = await Promise.all([
      db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '1 week') as semana,
          COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '1 month') as mes,
          COUNT(*) FILTER (WHERE ai_priority <= 2 AND created_at >= now() - INTERVAL '1 week') as alertas_semana
        FROM communications WHERE company_id = $1
      `, [companyId]),
      db.query(`
        SELECT status, COUNT(*) as total
        FROM proposals WHERE company_id = $1 GROUP BY status
      `, [companyId]),
      db.query(`
        SELECT COUNT(*) as total FROM monitored_points WHERE company_id = $1 AND active = true
      `, [companyId]),
      db.query(`
        SELECT 
          DATE_TRUNC('week', created_at) as semana,
          COUNT(*) as total
        FROM communications
        WHERE company_id = $1 AND created_at >= now() - INTERVAL '4 weeks'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY semana DESC LIMIT 4
      `, [companyId]),
      db.query(`
        SELECT 
          ai_classification->>'type' as tipo,
          COUNT(*) as total
        FROM communications
        WHERE company_id = $1 AND created_at >= now() - INTERVAL '1 month'
          AND (ai_classification->>'type' = 'falha_técnica' OR ai_classification->>'type' = 'alerta')
        GROUP BY ai_classification->>'type'
      `, [companyId])
    ]);

    data.interactions = {
      semana: parseInt(comms.rows[0]?.semana || 0),
      mes: parseInt(comms.rows[0]?.mes || 0),
      alertas: parseInt(comms.rows[0]?.alertas_semana || 0)
    };
    data.proposals = proposals.rows.reduce((acc, r) => { acc[r.status] = parseInt(r.total); return acc; }, {});
    data.pointsTotal = parseInt(points.rows[0]?.total || 0);
    data.trend = trend.rows;
    data.failures = failures.rows.reduce((acc, r) => { acc[r.tipo] = parseInt(r.total); return acc; }, {});
  } catch (err) {
    console.error('[FETCH_EXECUTIVE_DATA]', err.message);
  }
  return data;
}

/**
 * Processa consulta estratégica do CEO via IA
 */
async function processExecutiveQuery(companyId, userId, query, modoApresentacao = false) {
  const rawData = await fetchExecutiveData(companyId);

  const dataContext = JSON.stringify({
    ...rawData,
    modoApresentacao: !!modoApresentacao
  }, null, 2);

  const presentationNote = modoApresentacao
    ? '\nMODO APRESENTAÇÃO ATIVO: Oculte valores financeiros detalhados. Mostre apenas KPIs consolidados. Nunca exponha dados sensíveis.'
    : '';

  const prompt = `Você é o assistente estratégico do CEO de uma indústria. Analise os dados e responda com insights executivos.

DADOS DO SISTEMA (JSON):
${dataContext}
${presentationNote}

PERGUNTA DO CEO: "${query}"

REGRAS:
- NÃO retorne dados brutos. Consolide e analise.
- Responda em linguagem executiva: objetivo, estratégico, acionável.
- Inclua sugestões quando relevante (ex: "Sugestão: revisão preventiva em 72h").
- Se não houver dados suficientes, informe e sugira o que verificar.
- Máximo 3-5 parágrafos curtos.`;

  const response = await ai.chatCompletion(prompt, { max_tokens: 600 });
  return (response || 'Não foi possível processar a consulta no momento.').trim();
}

/**
 * Processa mensagem recebida do CEO via WhatsApp
 * Retorna { handled: true, response } ou { handled: false }
 */
async function processCEOMessage(companyId, senderPhone, text, messageType, documentUrl, documentBase64) {
  const ceo = await findCEOByWhatsApp(companyId, senderPhone);
  if (!ceo) return { handled: false };

  const normalizedSender = normalizePhone(senderPhone);
  const normalizedCEO = normalizePhone(ceo.whatsapp_number);
  if (normalizedSender !== normalizedCEO) {
    await logExecutiveAction({
      companyId,
      userId: ceo.id,
      action: 'whatsapp_number_mismatch',
      requestSummary: `Tentativa de acesso com número diferente: ${senderPhone}`,
      responseSummary: 'Bloqueado - número não corresponde ao cadastrado',
      metadata: { blocked: true }
    });
    return {
      handled: true,
      response: '⛔ Acesso bloqueado. O número de WhatsApp não corresponde ao cadastrado. Entre em contato com o administrador.'
    };
  }

  // Verificar modo apresentação
  const modoApresentacao = /modo\s+apresenta[çc][ãa]o/i.test(text);
  const queryText = text?.replace(/modo\s+apresenta[çc][ãa]o/i, '').trim() || text;

  if (!ceo.executive_verified) {
    const hasDocument = messageType === 'document' || messageType === 'image' || !!documentUrl || !!documentBase64;
    let documentHash = null;
    if (documentBase64) {
      documentHash = computeDocumentHash(documentBase64);
    }
    const response = await handleCEOFirstContact(companyId, ceo, senderPhone, hasDocument, documentHash);
    await logExecutiveAction({
      companyId,
      userId: ceo.id,
      action: hasDocument ? 'verification_document_received' : 'verification_requested',
      requestSummary: hasDocument ? 'Documento enviado' : queryText?.slice(0, 200),
      responseSummary: response?.slice(0, 200)
    });
    return { handled: true, response };
  }

  if (!await isExecutiveSessionValid(ceo)) {
    await renewExecutiveSession(ceo.id);
    const token = generateExecutiveSessionToken();
    await db.query(`
      UPDATE users SET executive_session_token = $1 WHERE id = $2
    `, [token, ceo.id]);
  } else {
    await renewExecutiveSession(ceo.id);
  }

  if (!queryText || queryText.length < 3) {
    return {
      handled: true,
      response: 'Como posso ajudá-lo? Exemplos: "Resumo geral", "Setores com risco", "Produção da semana", "Principais falhas do mês".'
    };
  }

  const response = await processExecutiveQuery(companyId, ceo.id, queryText, modoApresentacao);

  await logExecutiveAction({
    companyId,
    userId: ceo.id,
    action: 'strategic_query',
    requestSummary: queryText?.slice(0, 300),
    responseSummary: response?.slice(0, 300),
    metadata: { modoApresentacao }
  });

  return { handled: true, response };
}

/**
 * Envia resposta ao CEO via WhatsApp
 */
async function sendCEOResponse(companyId, phone, message) {
  const normalized = normalizePhone(phone);
  if (normalized.length < 10) return;
  const toSend = normalized.startsWith('55') ? normalized : `55${normalized}`;
  await zapi.sendTextMessage(companyId, toSend, message);
}

module.exports = {
  findCEOByWhatsApp,
  processCEOMessage,
  sendCEOResponse,
  logExecutiveAction,
  isExecutiveSessionValid,
  renewExecutiveSession,
  computeDocumentHash,
  VERIFICATION_REQUEST,
  BLOCKED_RESPONSE
};
