/**
 * SERVIÇO APP IMPETUS - Canal de Comunicação Unificado
 * Canal de mensagens: envia para outbox, processa mensagens recebidas do App
 * Todas as funcionalidades (CEO, TPM, IA Org, tarefas, diagnósticos) usam este canal
 */

const db = require('../db');

/**
 * Normaliza telefone para formato consistente
 */
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 10 ? (digits.startsWith('55') ? digits : `55${digits}`) : digits;
}

/**
 * Envia mensagem ao usuário via App Impetus
 * Enfileira na outbox - o App Impetus busca via GET /api/app-impetus/outbox
 * @param {string} companyId - UUID da empresa
 * @param {string} phone - Telefone do destinatário (usado para identificar usuário no app)
 * @param {string} message - Texto da mensagem
 * @param {object} options - { originatedFrom: 'executive'|'tpm'|'org_ai'|'task'|'diagnostic'|'subscription'|'proactive' }
 */
async function sendMessage(companyId, phone, message, options = {}) {
  try {
    const recipientPhone = normalizePhone(phone);
    if (recipientPhone.length < 10) {
      console.warn('[APP_IMPETUS] Telefone inválido para envio:', phone);
      return { ok: false, error: 'Telefone inválido' };
    }

    const originatedFrom = options.originatedFrom || 'system';

    const result = await db.query(`
      INSERT INTO app_impetus_outbox (
        company_id, recipient_phone, text_content, originated_from, status
      ) VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id, created_at
    `, [companyId, recipientPhone, message, originatedFrom]);

    return {
      ok: true,
      id: result.rows[0].id,
      createdAt: result.rows[0].created_at
    };
  } catch (err) {
    console.error('[APP_IMPETUS_SEND_ERROR]', err);
    throw err;
  }
}

/**
 * Envia resposta automática ao remetente
 * Sem rate limit externo - o App controla a frequência
 */
async function sendAutoReply(companyId, phone, message) {
  return sendMessage(companyId, phone, message, { originatedFrom: 'auto_reply' });
}

/**
 * Processa mensagem recebida do App Impetus
 * Processamento equivalente ao webhook legado, com source='app_impetus'
 * @param {string} companyId - UUID da empresa
 * @param {object} payload - { sender_user_id?, sender_phone, text, message_type?, media_url?, metadata? }
 */
async function processIncomingFromApp(companyId, payload) {
  try {
    const text = payload.text || '';
    let senderPhone = payload.sender_phone || '';
    const senderUserId = payload.sender_user_id;

    if (senderUserId && !senderPhone) {
      const userRow = await db.query(
        'SELECT phone, whatsapp_number FROM users WHERE id = $1 AND company_id = $2',
        [senderUserId, companyId]
      );
      if (userRow.rows[0]) {
        senderPhone = userRow.rows[0].whatsapp_number || userRow.rows[0].phone || '';
      }
    }
    senderPhone = normalizePhone(senderPhone) || String(payload.sender_phone || '');
    const sender = senderPhone || senderUserId || 'Desconhecido';

    const msgType = payload.message_type || 'text';
    const documentUrl = payload.media_url || null;
    const documentBase64 = payload.media_base64 || null;

    // MODO EXECUTIVO
    try {
      const executiveMode = require('./executiveMode');
      const ceoResult = await executiveMode.processCEOMessage(
        companyId, sender, text, msgType, documentUrl, documentBase64
      );
      if (ceoResult.handled && ceoResult.response) {
        if (senderPhone.length >= 10) {
          try { await sendAutoReply(companyId, senderPhone, ceoResult.response); } catch (e) {
            console.warn('[APP_IMPETUS] CEO response:', e.message);
          }
        }
        return { ok: true, executiveProcessed: true };
      }
    } catch (ceoErr) {
      console.warn('[APP_IMPETUS] Executive mode:', ceoErr.message);
    }

    const sourceMsgId = payload.id || payload.message_id || `app-${Date.now()}`;
    const result = await db.query(`
      INSERT INTO communications (
        company_id, source, source_message_id, sender_id, sender_phone, sender_whatsapp,
        text_content, message_type, media_url, status
      ) VALUES ($1, 'app_impetus', $2, $3, $4, $5, $6, $7, $8, 'received')
      RETURNING id
    `, [
      companyId,
      sourceMsgId,
      senderUserId || null,
      sender,
      sender,
      text,
      msgType,
      documentUrl
    ]);

    const communicationId = result.rows[0].id;
    let taskId = null;
    let aiClassification = null;
    const senderPhoneNorm = String(sender || '').replace(/\D/g, '');

    try {
      const coordinator = require('./operationalRealtimeCoordinator');
      await coordinator.processChatMessage({
        companyId,
        conversationId: null,
        senderUser: {
          id: senderUserId || null,
          role: payload?.metadata?.role || 'colaborador',
          hierarchy_level: payload?.metadata?.hierarchy_level ?? null
        },
        content: text,
        io: null
      });
    } catch (coordErr) {
      console.warn('[APP_IMPETUS] realtime coordinator:', coordErr.message);
    }

    if (text && text.trim().length >= 3) {
      try {
        const tpmConversation = require('./tpmConversation');
        let tpmResult = null;
        try {
          tpmResult = await tpmConversation.processMessage(companyId, senderPhoneNorm, text, communicationId);
        } catch (tpmErr) {
          console.warn('[APP_IMPETUS] TPM processMessage:', tpmErr.message);
        }
        if (tpmResult && tpmResult.handled && tpmResult.nextPrompt) {
          if (senderPhoneNorm.length >= 10) {
            try { await sendAutoReply(companyId, senderPhoneNorm, tpmResult.nextPrompt); } catch (e) {
              console.warn('[APP_IMPETUS] TPM reply:', e.message);
            }
          }
          if (tpmResult.completed && tpmResult.incident) {
            try {
              await require('./tpmNotifications').notifyTpmIncident(companyId, tpmResult.incident);
            } catch (e) {
              console.warn('[APP_IMPETUS] TPM notify:', e.message);
            }
          }
          return { ok: true, communicationId, tpmProcessed: true };
        }

        // IA ORGANIZACIONAL
        try {
          const organizationalAI = require('./organizationalAI');
          const orgResult = await organizationalAI.processIncompleteFollowUp(companyId, senderPhoneNorm, text, communicationId);
          if (orgResult.handled && orgResult.reply && senderPhoneNorm.length >= 10) {
            try { await sendAutoReply(companyId, senderPhoneNorm, orgResult.reply); } catch (e) {
              console.warn('[APP_IMPETUS] OrgAI follow-up:', e.message);
            }
            return { ok: true, communicationId, orgAIProcessed: true };
          }

          const orgProcess = await organizationalAI.processMessage(companyId, {
            text,
            sender,
            senderPhone: senderPhoneNorm,
            communicationId,
            msgType
          });
          if (orgProcess.handled && orgProcess.reply) {
            if (senderPhoneNorm.length >= 10) {
              try { await sendAutoReply(companyId, senderPhoneNorm, orgProcess.reply); } catch (e) {
                console.warn('[APP_IMPETUS] OrgAI reply:', e.message);
              }
            }
            await db.query(
              'UPDATE communications SET ai_classification = $1, processed_at = now() WHERE id = $2',
              [JSON.stringify({ type: orgProcess.eventType, orgAI: true }), communicationId]
            );
            return { ok: true, communicationId, orgAIProcessed: true };
          }
        } catch (orgErr) {
          console.warn('[APP_IMPETUS] Organizational AI:', orgErr.message);
        }

        const ai = require('./ai');
        const msg = { source: 'app_impetus', sender, text, metadata: payload };
        const procResult = await ai.processIncomingMessage(msg, { companyId });
        aiClassification = { type: procResult.kind, taskId: procResult.taskId };
        taskId = procResult.taskId;

        await db.query(`
          UPDATE communications
          SET ai_classification = $1, related_task_id = $2, processed_at = now()
          WHERE id = $3
        `, [JSON.stringify(aiClassification), taskId, communicationId]);

        const baseUrl = (process.env.BASE_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
        const linkMsg = baseUrl ? ` Acesse: ${baseUrl}` : '';
        if (taskId && (procResult.kind === 'tarefa' || procResult.kind === 'falha_técnica')) {
          let msgText = procResult.kind === 'falha_técnica'
            ? `✓ Diagnóstico gerado e tarefa criada. Nossa equipe recebeu o relatório.${linkMsg}`
            : `✓ Tarefa registrada com sucesso.${linkMsg}`;
          if (procResult.kind === 'falha_técnica') {
            msgText += '\n\n' + tpmConversation.getOfferPrompt();
          }
          if (senderPhoneNorm.length >= 10) {
            try { await sendAutoReply(companyId, senderPhoneNorm, msgText); } catch (sendErr) {
              console.warn('[APP_IMPETUS] Resposta automática:', sendErr.message);
            }
          }
        }
      } catch (aiErr) {
        console.warn('[APP_IMPETUS] processIncomingMessage:', aiErr.message);
      }
    }

    return { ok: true, communicationId, taskId, classification: aiClassification?.type };
  } catch (err) {
    console.error('[APP_IMPETUS_PROCESS_ERROR]', err);
    throw err;
  }
}

/**
 * Registra comunicação outbound em communications (rastreabilidade LGPD)
 * Usado por aiProactiveMessagingService e auditoria
 */
async function logOutboundCommunication(companyId, recipientPhone, message, opts = {}) {
  try {
    const phoneNorm = normalizePhone(recipientPhone);
    await db.query(`
      INSERT INTO communications (
        company_id, source, sender_phone, text_content, message_type, status
      ) VALUES ($1, 'app_impetus', $2, $3, 'text', 'sent')
    `, [companyId, phoneNorm || recipientPhone, (message || '').slice(0, 5000)]);
  } catch (err) {
    console.warn('[APP_IMPETUS] logOutboundCommunication:', err.message);
  }
}

module.exports = {
  sendMessage,
  sendAutoReply,
  processIncomingFromApp,
  logOutboundCommunication,
  normalizePhone
};
