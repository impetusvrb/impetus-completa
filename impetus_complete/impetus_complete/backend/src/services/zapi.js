/**
 * SERVIÇO DE INTEGRAÇÃO Z-API (WhatsApp Business)
 * Integração completa com Z-API - com timeout e retry para ambiente industrial
 */

const db = require('../db');
const { createResilientClient } = require('../utils/httpClient');
const { encrypt, decrypt, isEncrypted } = require('../utils/crypto');

function maybeEncrypt(val) {
  try {
    return process.env.ENCRYPTION_KEY ? encrypt(val) : val;
  } catch {
    return val;
  }
}

function maybeDecrypt(val) {
  if (!val) return val;
  try {
    return process.env.ENCRYPTION_KEY && isEncrypted(val) ? decrypt(val) : val;
  } catch {
    return val;
  }
}

const zapiClient = createResilientClient();
const ZAPI_TIMEOUT = 20000; // 20s para WhatsApp
const { checkRateLimit, getRandomDelayMs } = require('./zapiRateLimit');

/**
 * Busca configuração Z-API da empresa
 */
async function getZApiConfig(companyId) {
  try {
    const result = await db.query(`
      SELECT instance_id, instance_token, client_token, api_url, business_phone, active
      FROM zapi_configurations
      WHERE company_id = $1 AND active = true
    `, [companyId]);

    if (result.rows.length === 0) {
      throw new Error('Configuração Z-API não encontrada para esta empresa');
    }

    const row = result.rows[0];
    return {
      ...row,
      instance_token: maybeDecrypt(row.instance_token),
      client_token: maybeDecrypt(row.client_token)
    };
  } catch (err) {
    console.error('[GET_ZAPI_CONFIG_ERROR]', err);
    throw err;
  }
}

/**
 * Envia mensagem de texto via Z-API
 * Para respostas automáticas use sendAutoReply (rate limit + delay)
 */
async function sendTextMessage(companyId, phone, message) {
  try {
    const config = await getZApiConfig(companyId);

    const url = `${config.api_url}/instances/${config.instance_id}/token/${config.instance_token}/send-text`;

    const payload = {
      phone: phone,
      message: message
    };

    const response = await zapiClient.post(url, payload, {
      timeout: ZAPI_TIMEOUT,
      headers: {
        'Client-Token': config.client_token,
        'Content-Type': 'application/json'
      }
    });

    // Registrar mensagem enviada
    await db.query(`
      INSERT INTO zapi_sent_messages (
        company_id, recipient_phone, text_content, zapi_message_id, zapi_response, sent, sent_at
      ) VALUES ($1, $2, $3, $4, $5, true, now())
    `, [
      companyId,
      phone,
      message,
      response.data?.messageId || response.data?.id,
      JSON.stringify(response.data)
    ]);

    return {
      ok: true,
      messageId: response.data?.messageId || response.data?.id,
      response: response.data
    };

  } catch (err) {
    console.error('[SEND_TEXT_MESSAGE_ERROR]', err);
    
    // Registrar falha
    await db.query(`
      INSERT INTO zapi_sent_messages (
        company_id, recipient_phone, text_content, error, error_message, sent
      ) VALUES ($1, $2, $3, true, $4, false)
    `, [companyId, phone, message, err.message]);

    throw err;
  }
}

/**
 * Envia resposta automática com rate limit (20/min) e delay 2-5s
 * Usado por processWebhook para CEO, TPM, OrgAI, tarefas
 */
async function sendAutoReply(companyId, phone, message) {
  const config = await getZApiConfig(companyId);
  if (!checkRateLimit(config.instance_id)) {
    console.warn('[ZAPI] Rate limit excedido, resposta automática não enviada');
    return;
  }
  await new Promise(r => setTimeout(r, getRandomDelayMs()));
  return sendTextMessage(companyId, phone, message);
}

/**
 * Envia mensagem com mídia via Z-API
 */
async function sendMediaMessage(companyId, phone, mediaUrl, caption = '') {
  try {
    const config = await getZApiConfig(companyId);

    const url = `${config.api_url}/instances/${config.instance_id}/token/${config.instance_token}/send-image`;

    const payload = {
      phone: phone,
      image: mediaUrl,
      caption: caption
    };

    const response = await zapiClient.post(url, payload, {
      timeout: ZAPI_TIMEOUT,
      headers: {
        'Client-Token': config.client_token,
        'Content-Type': 'application/json'
      }
    });

    await db.query(`
      INSERT INTO zapi_sent_messages (
        company_id, recipient_phone, message_type, media_url, text_content,
        zapi_message_id, zapi_response, sent, sent_at
      ) VALUES ($1, $2, 'image', $3, $4, $5, $6, true, now())
    `, [
      companyId,
      phone,
      mediaUrl,
      caption,
      response.data?.messageId,
      JSON.stringify(response.data)
    ]);

    return {
      ok: true,
      messageId: response.data?.messageId,
      response: response.data
    };

  } catch (err) {
    console.error('[SEND_MEDIA_MESSAGE_ERROR]', err);
    throw err;
  }
}

/**
 * Processa webhook recebido do Z-API
 * Salva em communications e executa processIncomingMessage (classificação IA + tarefas)
 */
async function processWebhook(companyId, webhookData) {
  try {
    const body = webhookData.body || webhookData;
    const eventType = body.event || 'message';

    if (eventType === 'message') {
      const text = body.text?.message || body.message?.body || body.body || body.caption || '';
      const sender = body.phone || body.from || body.sender || 'Desconhecido';
      const msgType = body.type || body.message?.type || 'text';
      const documentUrl = body.document || body.image || body.audio || null;
      let documentBase64 = body.base64 || body.message?.base64 || null;
      if (!documentBase64 && (body.document || body.image)) {
        const doc = body.document || body.image;
        documentBase64 = (typeof doc === 'string' && doc.startsWith('data:')) ? doc : (doc?.base64 || doc?.imageBase64);
      }
      if (!documentBase64 && body.message?.document?.base64) documentBase64 = body.message.document.base64;
      if (!documentBase64 && body.message?.image?.base64) documentBase64 = body.message.image.base64;

      // MODO EXECUTIVO: Verificar se é CEO antes do fluxo normal
      try {
        const executiveMode = require('./executiveMode');
        const ceoResult = await executiveMode.processCEOMessage(
          companyId, sender, text, msgType, documentUrl, documentBase64
        );
        if (ceoResult.handled && ceoResult.response) {
          const senderPhone = String(sender || '').replace(/\D/g, '');
          if (senderPhone.length >= 10) {
            try {
              await sendAutoReply(companyId, senderPhone, ceoResult.response);
            } catch (e) {
              console.warn('[ZAPI] CEO response:', e.message);
            }
          }
          return { ok: true, executiveProcessed: true };
        }
      } catch (ceoErr) {
        console.warn('[ZAPI] Executive mode:', ceoErr.message);
      }

      const result = await db.query(`
        INSERT INTO communications (
          company_id, source, source_message_id, sender_phone, sender_whatsapp,
          text_content, message_type, media_url, status
        ) VALUES ($1, 'whatsapp', $2, $3, $4, $5, $6, $7, 'received')
        RETURNING id
      `, [
        companyId,
        body.messageId || body.id,
        sender,
        sender,
        text,
        body.type || body.message?.type || 'text',
        body.image || body.document || body.audio || null
      ]);

      const communicationId = result.rows[0].id;
      let taskId = null;
      let aiClassification = null;
      const senderPhone = String(sender || '').replace(/\D/g, '');

      if (text && text.trim().length >= 3) {
        try {
          const tpmConversation = require('./tpmConversation');
          let tpmResult = null;
          try {
            tpmResult = await tpmConversation.processMessage(companyId, senderPhone, text, communicationId);
          } catch (tpmErr) {
            console.warn('[ZAPI] TPM processMessage:', tpmErr.message);
          }
          if (tpmResult && tpmResult.handled && tpmResult.nextPrompt) {
            if (senderPhone.length >= 10) {
              try { await sendAutoReply(companyId, senderPhone, tpmResult.nextPrompt); } catch (e) { console.warn('[ZAPI] TPM reply:', e.message); }
            }
            if (tpmResult.completed && tpmResult.incident) {
              try { await require('./tpmNotifications').notifyTpmIncident(companyId, tpmResult.incident); } catch (e) { console.warn('[ZAPI] TPM notify:', e.message); }
            }
            return { ok: true, communicationId, tpmProcessed: true };
          }

          // IA ORGANIZACIONAL ATIVA: protocolo baseado em comunicação
          try {
            const organizationalAI = require('./organizationalAI');
            const orgResult = await organizationalAI.processIncompleteFollowUp(companyId, senderPhone, text, communicationId);
            if (orgResult.handled && orgResult.reply && senderPhone.length >= 10) {
              try { await sendAutoReply(companyId, senderPhone, orgResult.reply); } catch (e) { console.warn('[ZAPI] OrgAI follow-up:', e.message); }
              return { ok: true, communicationId, orgAIProcessed: true };
            }

            const orgProcess = await organizationalAI.processMessage(companyId, {
              text,
              sender,
              senderPhone,
              communicationId,
              msgType
            });
            if (orgProcess.handled && orgProcess.reply) {
              if (senderPhone.length >= 10) {
                try { await sendAutoReply(companyId, senderPhone, orgProcess.reply); } catch (e) { console.warn('[ZAPI] OrgAI reply:', e.message); }
              }
              await db.query(`UPDATE communications SET ai_classification = $1, processed_at = now() WHERE id = $2`, [JSON.stringify({ type: orgProcess.eventType, orgAI: true }), communicationId]);
              return { ok: true, communicationId, orgAIProcessed: true };
            }
          } catch (orgErr) {
            console.warn('[ZAPI] Organizational AI:', orgErr.message);
          }

          const ai = require('./ai');
          const msg = { source: 'whatsapp', sender, text, metadata: body };
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
          let msgText = '';
          if (taskId && (procResult.kind === 'tarefa' || procResult.kind === 'falha_técnica')) {
            msgText = procResult.kind === 'falha_técnica'
              ? `✓ Diagnóstico gerado e tarefa criada. Nossa equipe recebeu o relatório.${linkMsg}`
              : `✓ Tarefa registrada com sucesso.${linkMsg}`;
            if (procResult.kind === 'falha_técnica') {
              msgText += '\n\n' + tpmConversation.getOfferPrompt();
            }
            if (senderPhone.length >= 10) {
              try { await sendAutoReply(companyId, senderPhone, msgText); } catch (sendErr) { console.warn('[ZAPI] Resposta automática:', sendErr.message); }
            }
          }
        } catch (aiErr) {
          console.warn('[ZAPI] processIncomingMessage:', aiErr.message);
        }
      }

      return { ok: true, communicationId, taskId, classification: aiClassification?.type };
    }

    // Atualizar status de mensagem enviada
    if (eventType === 'status' || body.status) {
      const messageId = body.messageId || body.id;
      const status = body.status;

      if (status === 'DELIVERED') {
        await db.query(`
          UPDATE zapi_sent_messages
          SET delivered = true, delivered_at = now()
          WHERE zapi_message_id = $1
        `, [messageId]);
      }

      if (status === 'READ') {
        await db.query(`
          UPDATE zapi_sent_messages
          SET read = true, read_at = now()
          WHERE zapi_message_id = $1
        `, [messageId]);
      }
    }

    return { ok: true };

  } catch (err) {
    console.error('[PROCESS_WEBHOOK_ERROR]', err);
    throw err;
  }
}

/**
 * Testa conexão com Z-API
 */
async function testConnection(companyId) {
  try {
    const config = await getZApiConfig(companyId);

    const url = `${config.api_url}/instances/${config.instance_id}/token/${config.instance_token}/status`;

    const response = await zapiClient.get(url, {
      timeout: ZAPI_TIMEOUT,
      headers: {
        'Client-Token': config.client_token
      }
    });

    const connected = response.data?.connected || response.data?.status === 'CONNECTED';

    // Atualizar status na configuração
    await db.query(`
      UPDATE zapi_configurations
      SET connection_status = $1, last_connection_test = now()
      WHERE company_id = $2
    `, [connected ? 'connected' : 'error', companyId]);

    return {
      ok: true,
      connected,
      response: response.data
    };

  } catch (err) {
    console.error('[TEST_CONNECTION_ERROR]', err);
    
    await db.query(`
      UPDATE zapi_configurations
      SET connection_status = 'error', last_connection_test = now()
      WHERE company_id = $1
    `, [companyId]);

    return {
      ok: false,
      connected: false,
      error: err.message
    };
  }
}

module.exports = {
  getZApiConfig,
  sendTextMessage,
  sendAutoReply,
  sendMediaMessage,
  processWebhook,
  testConnection
};
