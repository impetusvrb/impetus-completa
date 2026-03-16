/**
 * APP COMMUNICATION SERVICE
 * Processa mensagens recebidas do App Impetus
 * Pipeline: salva em communications → IA organizacional → TPM → processIncomingMessage
 */

const db = require('../db');
const unifiedMessaging = require('./unifiedMessagingService');
const mediaProcessor = require('./mediaProcessorService');
const { isValidUUID } = require('../utils/security');

/**
 * Processa mensagem recebida do app (texto, áudio ou vídeo)
 * @param {Object} opts - { companyId, senderId, senderName, senderPhone, textContent, messageType, mediaPath?, mediaUrl?, recipientId? }
 * @returns {Promise<{ ok: boolean, communicationId?, taskId?, classification? }>}
 */
async function processAppMessage(opts) {
  const {
    companyId,
    senderId,
    senderName,
    senderPhone,
    textContent,
    messageType = 'text',
    mediaPath,
    mediaUrl,
    recipientId,
    recipientDepartmentId,
    relatedEquipmentId
  } = opts;

  if (!companyId || !senderId) {
    return { ok: false, error: 'companyId e senderId obrigatórios' };
  }

  let text = (textContent || '').trim();
  let mediaTranscription = null;
  let mediaInterpretation = null;

  if ((mediaPath || mediaUrl) && ['audio', 'video'].includes(messageType)) {
    const pathModule = require('path');
    const baseDir = pathModule.join(__dirname, '../../..');
    const fullPath = mediaPath || (mediaUrl ? pathModule.join(baseDir, mediaUrl.replace(/^\//, '')) : null);
    if (fullPath) {
      const transcribeResult = await mediaProcessor.transcribeAudio(fullPath);
      if (transcribeResult.success && transcribeResult.text) {
        mediaTranscription = transcribeResult.text;
        text = text || transcribeResult.text;
        mediaInterpretation = await mediaProcessor.interpretTextForReports(transcribeResult.text);
      }
    }
  }

  if (!text || text.length < 2) {
    return { ok: false, error: 'Conteúdo de texto obrigatório (ou áudio/vídeo para transcrição)' };
  }

  const senderPhoneResolved = senderPhone || (await getUserPhone(senderId)) || '';

  try {
    const result = await db.query(`
      INSERT INTO communications (
        company_id, source, sender_id, sender_name, sender_phone, sender_whatsapp,
        recipient_id, recipient_department_id, text_content, message_type, media_url,
        media_transcription, media_interpretation, direction, status, related_equipment_id
      ) VALUES ($1, 'app', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'inbound', 'received', $13)
      RETURNING id
    `, [
      companyId,
      senderId,
      senderName || 'Usuário App',
      senderPhoneResolved,
      senderPhoneResolved,
      recipientId || null,
      recipientDepartmentId || null,
      text,
      messageType,
      mediaUrl || null,
      mediaTranscription ? mediaTranscription.slice(0, 4000) : null,
      mediaInterpretation ? JSON.stringify(mediaInterpretation) : null,
      relatedEquipmentId || null
    ]);

    const communicationId = result.rows[0].id;
    await db.query(
      'UPDATE communications SET conversation_thread_id = $1 WHERE id = $2',
      [communicationId, communicationId]
    );

    if (mediaTranscription && (mediaUrl || mediaPath)) {
      try {
        const audioLogs = require('./audioLogsService');
        await audioLogs.persist({
          companyId,
          source: 'app_communication',
          sourceId: communicationId,
          userId: senderId,
          senderName: senderName || 'Usuario App',
          mediaUrl: mediaUrl || mediaPath,
          transcription: mediaTranscription,
          messageType
        });
      } catch (e) {
        console.warn('[APP_COMM] audioLogs.persist:', e?.message);
      }
    }

    const logOpts = {
      relatedCommunicationId: communicationId,
      conversationThreadId: communicationId
    };

    const sendReply = async (msg) => {
      return unifiedMessaging.sendToUser(companyId, senderId, msg, logOpts);
    };

    try {
      const executiveMode = require('./executiveMode');
      const user = await getUserById(senderId);
      if (user?.role === 'ceo') {
        const ceoResult = await executiveMode.processCEOMessage(
          companyId, senderPhoneResolved, text, messageType, mediaUrl, null
        );
        if (ceoResult.handled && ceoResult.response) {
          await sendReply(ceoResult.response);
          return { ok: true, executiveProcessed: true, communicationId };
        }
      }
    } catch (e) {
      console.warn('[APP_COMM] Executive mode:', e.message);
    }

    let taskId = null;
    let aiClassification = null;

    try {
      const tpmConversation = require('./tpmConversation');
      const tpmResult = await tpmConversation.processMessage(companyId, senderPhoneResolved, text, communicationId);
      if (tpmResult?.handled && tpmResult.nextPrompt) {
        await sendReply(tpmResult.nextPrompt);
        if (tpmResult.completed && tpmResult.incident) {
          try {
            await require('./tpmNotifications').notifyTpmIncident(companyId, tpmResult.incident);
          } catch (e) {
            console.warn('[APP_COMM] TPM notify:', e.message);
          }
        }
        return { ok: true, communicationId, tpmProcessed: true };
      }
    } catch (e) {
      console.warn('[APP_COMM] TPM:', e.message);
    }

    try {
      const organizationalAI = require('./organizationalAI');
      const orgFollowUp = await organizationalAI.processIncompleteFollowUp(companyId, senderPhoneResolved, text, communicationId);
      if (orgFollowUp?.handled && orgFollowUp.reply) {
        await sendReply(orgFollowUp.reply);
        return { ok: true, communicationId, orgAIProcessed: true };
      }

      const orgProcess = await organizationalAI.processMessage(companyId, {
        text,
        sender: senderPhoneResolved,
        senderPhone: senderPhoneResolved,
        communicationId,
        msgType: messageType
      });
      if (orgProcess?.handled && orgProcess.reply) {
        await sendReply(orgProcess.reply);
        await db.query(
          'UPDATE communications SET ai_classification = $1, processed_at = now() WHERE id = $2',
          [JSON.stringify({ type: orgProcess.eventType, orgAI: true }), communicationId]
        );
        return { ok: true, communicationId, orgAIProcessed: true };
      }
    } catch (e) {
      console.warn('[APP_COMM] Organizational AI:', e.message);
    }

    try {
      const ai = require('./ai');
      const msg = { source: 'app', sender: senderPhoneResolved, text, metadata: {} };
      const procResult = await ai.processIncomingMessage(msg, { companyId });
      aiClassification = { type: procResult.kind, taskId: procResult.taskId };
      taskId = procResult.taskId;

      await db.query(`
        UPDATE communications
        SET ai_classification = $1, related_task_id = $2, processed_at = now()
        WHERE id = $3
      `, [JSON.stringify(aiClassification), taskId, communicationId]);

      if (taskId && (procResult.kind === 'tarefa' || procResult.kind === 'falha_técnica')) {
        const linkMsg = (process.env.BASE_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '') ? ' Acesse o app para ver o relatório.' : '';
        const msgText = procResult.kind === 'falha_técnica'
          ? `✓ Diagnóstico gerado e tarefa criada.${linkMsg}`
          : `✓ Tarefa registrada com sucesso.${linkMsg}`;
        await sendReply(msgText);
      }
    } catch (e) {
      console.warn('[APP_COMM] processIncomingMessage:', e.message);
    }

    return { ok: true, communicationId, taskId, classification: aiClassification?.type };
  } catch (err) {
    console.error('[APP_COMM] processAppMessage:', err);
    return { ok: false, error: err.message };
  }
}

async function getUserPhone(userId) {
  if (!userId || !isValidUUID(userId)) return null;
  const r = await db.query(
    'SELECT whatsapp_number, phone FROM users WHERE id = $1',
    [userId]
  );
  if (r.rows.length === 0) return null;
  const row = r.rows[0];
  return (row.whatsapp_number || row.phone || '').replace(/\D/g, '').slice(-11) || null;
}

async function getUserById(userId) {
  if (!userId || !isValidUUID(userId)) return null;
  const r = await db.query('SELECT id, role FROM users WHERE id = $1', [userId]);
  return r.rows[0] || null;
}

module.exports = {
  processAppMessage
};
