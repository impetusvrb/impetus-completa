/**
 * MIDDLEWARE DE LGPD - Lei Geral de Proteção de Dados
 * Garante conformidade com LGPD em todas as operações
 */

const db = require('../db');

/**
 * Verifica se usuário deu consentimento LGPD
 */
async function checkUserConsent(userId, consentType = 'data_processing') {
  try {
    const result = await db.query(`
      SELECT granted, expires_at, revoked_at
      FROM lgpd_consents
      WHERE user_id = $1 
        AND consent_type = $2
        AND granted = true
        AND (revoked_at IS NULL)
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId, consentType]);

    return result.rows.length > 0;
  } catch (err) {
    console.error('[LGPD_CONSENT_CHECK_ERROR]', err.message);
    return false; // Por segurança, assumir que não tem consentimento
  }
}

/**
 * Middleware que exige consentimento LGPD válido
 */
function requireConsent(consentType = 'data_processing') {
  return async (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        ok: false,
        error: 'Usuário não autenticado'
      });
    }

    const hasConsent = await checkUserConsent(user.id, consentType);

    if (!hasConsent) {
      return res.status(403).json({
        ok: false,
        error: 'Consentimento LGPD necessário',
        code: 'LGPD_CONSENT_REQUIRED',
        consentType,
        message: 'Você precisa aceitar os termos de uso e política de privacidade para continuar.'
      });
    }

    next();
  };
}

/**
 * Registra consentimento do usuário
 */
async function registerConsent(params) {
  const {
    userId,
    companyId,
    consentType,
    granted,
    consentText,
    version,
    ipAddress,
    userAgent,
    expiresAt = null
  } = params;

  try {
    await db.query(`
      INSERT INTO lgpd_consents (
        user_id, company_id, consent_type, granted,
        consent_text, version, ip_address, user_agent, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      userId, companyId, consentType, granted,
      consentText, version, ipAddress, userAgent, expiresAt
    ]);

    // Atualizar flag no usuário
    if (granted && consentType === 'data_processing') {
      await db.query(`
        UPDATE users 
        SET lgpd_consent = true,
            lgpd_consent_date = now(),
            lgpd_consent_ip = $1
        WHERE id = $2
      `, [ipAddress, userId]);
    }

    return { ok: true };
  } catch (err) {
    console.error('[REGISTER_CONSENT_ERROR]', err.message);
    throw err;
  }
}

/**
 * Revoga consentimento
 */
async function revokeConsent(userId, consentType) {
  try {
    await db.query(`
      UPDATE lgpd_consents
      SET revoked_at = now()
      WHERE user_id = $1 
        AND consent_type = $2
        AND revoked_at IS NULL
    `, [userId, consentType]);

    return { ok: true };
  } catch (err) {
    console.error('[REVOKE_CONSENT_ERROR]', err.message);
    throw err;
  }
}

/**
 * Anonimiza dados de um usuário (LGPD Art. 12)
 */
async function anonymizeUserData(userId) {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

    const anonymousEmail = `anonimizado_${userId}@impetus.local`;
    const anonymousName = 'Usuário Anonimizado';
    const anonymousPhone = null;

    // Anonimizar dados do usuário
    await client.query(`
      UPDATE users
      SET 
        name = $1,
        email = $2,
        phone = NULL,
        whatsapp_number = NULL,
        avatar_url = NULL,
        deleted_at = now()
      WHERE id = $3
    `, [anonymousName, anonymousEmail, userId]);

    // Anonimizar comunicações
    await client.query(`
      UPDATE communications
      SET 
        sender_name = $1,
        sender_phone = NULL,
        sender_whatsapp = NULL,
        text_content = '[Conteúdo anonimizado conforme LGPD]',
        anonymized = true,
        anonymized_at = now()
      WHERE sender_id = $2
        AND contains_sensitive_data = true
    `, [anonymousName, userId]);

    // Manter logs de auditoria mas anonimizar nome
    await client.query(`
      UPDATE audit_logs
      SET user_name = $1
      WHERE user_id = $2
    `, [anonymousName, userId]);

    await client.query('COMMIT');

    return { ok: true, message: 'Dados anonimizados com sucesso' };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ANONYMIZE_USER_ERROR]', err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Exporta todos os dados de um usuário (LGPD Art. 18 - Portabilidade)
 */
async function exportUserData(userId) {
  try {
    const userData = {};

    // Dados do usuário
    const user = await db.query(`
      SELECT id, name, email, phone, whatsapp_number, role, 
             hierarchy_level, created_at, last_login
      FROM users WHERE id = $1
    `, [userId]);
    userData.user = user.rows[0];

    // Comunicações
    const communications = await db.query(`
      SELECT id, source, text_content, ai_classification, created_at
      FROM communications 
      WHERE sender_id = $1
      ORDER BY created_at DESC
      LIMIT 1000
    `, [userId]);
    userData.communications = communications.rows;

    // Propostas Pró-Ação
    const proposals = await db.query(`
      SELECT id, problem_category, proposed_solution, status, created_at
      FROM proposals
      WHERE reporter_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    userData.proposals = proposals.rows;

    // Tarefas
    const tasks = await db.query(`
      SELECT id, title, description, status, created_at
      FROM tasks
      WHERE assignee::uuid = $1
      ORDER BY created_at DESC
      LIMIT 500
    `, [userId]);
    userData.tasks = tasks.rows;

    // Consentimentos
    const consents = await db.query(`
      SELECT consent_type, granted, granted_at, version
      FROM lgpd_consents
      WHERE user_id = $1
      ORDER BY granted_at DESC
    `, [userId]);
    userData.consents = consents.rows;

    return {
      exportDate: new Date().toISOString(),
      userId,
      data: userData,
      format: 'JSON',
      lgpdCompliance: true,
      message: 'Exportação realizada conforme Art. 18 da LGPD'
    };
  } catch (err) {
    console.error('[EXPORT_USER_DATA_ERROR]', err.message);
    throw err;
  }
}

/**
 * Processa solicitação de dados do titular (LGPD)
 */
async function processDataRequest(requestId, processedBy, response, status = 'completed') {
  try {
    await db.query(`
      UPDATE lgpd_data_requests
      SET 
        status = $1,
        assigned_to = $2,
        response = $3,
        processed_at = now(),
        completed_at = CASE WHEN $1 = 'completed' THEN now() ELSE NULL END
      WHERE id = $4
    `, [status, processedBy, response, requestId]);

    return { ok: true };
  } catch (err) {
    console.error('[PROCESS_DATA_REQUEST_ERROR]', err.message);
    throw err;
  }
}

/**
 * Middleware que verifica se comunicação contém dados sensíveis
 */
function detectSensitiveContent(text) {
  if (!text) return false;

  const sensitivePatterns = [
    /assédio/i,
    /discriminação/i,
    /violência/i,
    /ameaça/i,
    /abuso/i,
    /constrangimento/i,
    /denúncia/i,
    /denunciar/i,
    /reportar\s+(assédio|discriminação|violência)/i
  ];

  return sensitivePatterns.some(pattern => pattern.test(text));
}

/**
 * Middleware para detecção automática de conteúdo sensível
 */
function sensitiveContentMiddleware(req, res, next) {
  const { text_content, message, description } = req.body;
  const content = text_content || message || description;

  if (content && detectSensitiveContent(content)) {
    req.containsSensitiveData = true;
    
    // Log especial para conteúdo sensível
    console.warn('[SENSITIVE_CONTENT_DETECTED]', {
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
      contentLength: content.length
    });
  }

  next();
}

module.exports = {
  checkUserConsent,
  requireConsent,
  registerConsent,
  revokeConsent,
  anonymizeUserData,
  exportUserData,
  processDataRequest,
  detectSensitiveContent,
  sensitiveContentMiddleware
};
