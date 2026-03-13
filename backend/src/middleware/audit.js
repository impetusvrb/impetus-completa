/**
 * MIDDLEWARE DE AUDITORIA - LGPD COMPLIANCE
 * Registra todas as ações críticas no sistema
 * Conforme Política de Segurança da Informação e LGPD
 */

const db = require('../db');

/**
 * Registra ação no log de auditoria
 */
async function logAction(params) {
  const {
    companyId,
    userId,
    userName,
    userRole,
    action,
    entityType,
    entityId,
    description,
    changes,
    ipAddress,
    userAgent,
    sessionId,
    severity = 'info',
    success = true,
    errorMessage = null
  } = params;

  try {
    await db.query(`
      INSERT INTO audit_logs (
        company_id, user_id, user_name, user_role,
        action, entity_type, entity_id, description, changes,
        ip_address, user_agent, session_id,
        severity, success, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      companyId, userId, userName, userRole,
      action, entityType, entityId, description, changes ? JSON.stringify(changes) : null,
      ipAddress, userAgent, sessionId,
      severity, success, errorMessage
    ]);
  } catch (err) {
    console.error('[AUDIT_LOG_ERROR]', err.message);
    // Não falhar a requisição por erro de auditoria
  }
}

/**
 * Middleware para auditoria automática de requisições
 */
function auditMiddleware(options = {}) {
  const {
    action,
    entityType,
    getEntityId,
    getDescription,
    severity = 'info',
    logBody = false
  } = options;

  return async (req, res, next) => {
    const originalSend = res.send;

    // Capturar resposta
    res.send = function (data) {
      res.send = originalSend;

      // Registrar auditoria após resposta
      setImmediate(async () => {
        try {
          const success = res.statusCode >= 200 && res.statusCode < 400;
          const user = req.user || {};
          
          const auditData = {
            companyId: user.company_id || req.body?.company_id,
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            action: action || req.method,
            entityType: entityType,
            entityId: getEntityId ? getEntityId(req, res) : req.params?.id,
            description: getDescription ? getDescription(req, res) : `${req.method} ${req.path}`,
            changes: logBody ? { body: req.body, params: req.params } : null,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            sessionId: req.session?.id,
            severity,
            success,
            errorMessage: success ? null : data?.error || data?.message
          };

          await logAction(auditData);
        } catch (err) {
          console.error('[AUDIT_MIDDLEWARE_ERROR]', err.message);
        }
      });

      return res.send(data);
    };

    next();
  };
}

/**
 * Registra acesso a dados pessoais (LGPD Art. 37)
 */
async function logDataAccess(params) {
  const {
    companyId,
    accessedBy,
    accessedByName,
    entityType,
    entityId,
    action, // 'view', 'create', 'update', 'delete', 'export'
    justification,
    containsSensitiveData = false,
    ipAddress,
    userAgent,
    sessionId
  } = params;

  try {
    await db.query(`
      INSERT INTO data_access_logs (
        company_id, accessed_by, accessed_by_name,
        entity_type, entity_id, action, justification,
        contains_sensitive_data, ip_address, user_agent, session_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      companyId, accessedBy, accessedByName,
      entityType, entityId, action, justification,
      containsSensitiveData, ipAddress, userAgent, sessionId
    ]);
  } catch (err) {
    console.error('[DATA_ACCESS_LOG_ERROR]', err.message);
  }
}

/**
 * Middleware para registrar acesso a dados pessoais
 */
function dataAccessMiddleware(entityType, containsSensitiveData = false) {
  return async (req, res, next) => {
    const user = req.user || {};
    
    // Determinar ação
    let action = 'view';
    if (req.method === 'POST') action = 'create';
    else if (req.method === 'PUT' || req.method === 'PATCH') action = 'update';
    else if (req.method === 'DELETE') action = 'delete';
    
    await logDataAccess({
      companyId: user.company_id,
      accessedBy: user.id,
      accessedByName: user.name,
      entityType,
      entityId: req.params?.id,
      action,
      justification: req.body?.justification || req.query?.justification,
      containsSensitiveData,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      sessionId: req.session?.id
    });

    next();
  };
}

module.exports = {
  logAction,
  auditMiddleware,
  logDataAccess,
  dataAccessMiddleware
};
