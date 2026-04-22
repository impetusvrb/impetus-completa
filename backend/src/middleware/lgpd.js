/**
 * LGPD — consentimento, portabilidade, anonimização, pedidos e deteção de dados sensíveis.
 * Operações de BD com try/catch (fail-safe): falhas são registadas e não derrubam a app.
 */
'use strict';

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../db');
const { logAction } = require('./audit');

const CPF_LIKE = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
const EMAIL_LIKE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

function shortHash(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex').slice(0, 12);
}

async function safeInsertConsentLog(row) {
  try {
    await db.query(
      `
      INSERT INTO consent_logs (
        user_id, company_id, consent_type, document_version, granted,
        consent_text, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        row.userId,
        row.companyId || null,
        row.consentType,
        row.documentVersion || '1.0',
        row.granted !== false,
        row.consentText || null,
        row.ipAddress || null,
        row.userAgent || null
      ]
    );
    return { ok: true };
  } catch (err) {
    console.error('[LGPD consent_logs INSERT]', err.message);
    return { ok: false, error: err.message };
  }
}

async function syncUserConsentFlags(userId, consentType, granted) {
  const t = String(consentType || '').toLowerCase();
  const termsLike = ['termos_de_uso', 'terms', 'terms_of_service', 'privacy', 'privacidade'];
  if (!termsLike.includes(t)) return;
  try {
    if (granted !== false) {
      await db.query(
        `UPDATE users SET lgpd_consent = true, lgpd_consent_date = now(), updated_at = now() WHERE id = $1`,
        [userId]
      );
    } else {
      await db.query(
        `UPDATE users SET lgpd_consent = false, updated_at = now() WHERE id = $1`,
        [userId]
      );
    }
  } catch (err) {
    console.error('[LGPD syncUserConsentFlags]', err.message);
  }
}

/**
 * @param {object} payload
 * @param {string} payload.userId
 * @param {string} [payload.companyId]
 * @param {string} payload.consentType
 * @param {boolean} [payload.granted]
 * @param {string} [payload.consentText]
 * @param {string} [payload.version]
 * @param {string} [payload.ipAddress]
 * @param {string} [payload.userAgent]
 */
async function registerConsent(payload) {
  const ins = await safeInsertConsentLog({
    userId: payload.userId,
    companyId: payload.companyId,
    consentType: payload.consentType || 'unknown',
    documentVersion: payload.version || payload.documentVersion || '1.0',
    granted: payload.granted !== false,
    consentText: payload.consentText,
    ipAddress: payload.ipAddress,
    userAgent: payload.userAgent
  });
  if (ins.ok) {
    await syncUserConsentFlags(payload.userId, payload.consentType, payload.granted !== false);
  }
  return ins.ok ? { ok: true } : { ok: false, error: ins.error || 'consent_log_failed' };
}

async function revokeConsent(userId, type) {
  let companyId = null;
  try {
    const uc = await db.query(`SELECT company_id FROM users WHERE id = $1`, [userId]);
    companyId = uc.rows[0]?.company_id || null;
  } catch (_) {
    /* fail-safe */
  }
  try {
    const upd = await db.query(
      `
      UPDATE consent_logs SET revoked_at = now()
      WHERE id = (
        SELECT id FROM consent_logs
        WHERE user_id = $1 AND consent_type = $2 AND revoked_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      )
      RETURNING id
    `,
      [userId, type]
    );
    if (upd.rows.length === 0) {
      try {
        await db.query(
          `
          INSERT INTO consent_logs (
            user_id, company_id, consent_type, document_version, granted, consent_text, revoked_at
          ) VALUES ($1, $2, $3, '1.0', false, 'revoked_no_prior_grant', now())
        `,
          [userId, companyId, type]
        );
      } catch (e) {
        console.error('[LGPD revokeConsent insert]', e.message);
      }
    }
    await syncUserConsentFlags(userId, type, false);
    return { ok: true };
  } catch (err) {
    console.error('[LGPD revokeConsent]', err.message);
    return { ok: false, error: err.message };
  }
}

async function fetchUserProfileExport(userId) {
  const r = await db.query(
    `
    SELECT u.*,
           d.name AS department_name,
           cr.name AS structural_role_name,
           c.name AS company_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id AND d.company_id = u.company_id
    LEFT JOIN company_roles cr ON cr.id = u.company_role_id AND cr.company_id = u.company_id
    LEFT JOIN companies c ON c.id = u.company_id
    WHERE u.id = $1
  `,
    [userId]
  );
  const row = r.rows[0];
  if (!row) return null;
  const { password_hash, ...safe } = row;
  return safe;
}

async function exportUserData(userId) {
  const generatedAt = new Date().toISOString();
  const result = {
    schema_version: 'lgpd_export_v1',
    generated_at: generatedAt,
    subject_user_id: userId,
    profile: null,
    organizational_context: null,
    data_access_logs: [],
    lgpd_requests: { summary: null, requests: [] },
    audit_trail_role_related: [],
    consent_history: [],
    chat_messages: [],
    communications: []
  };

  try {
    result.profile = await fetchUserProfileExport(userId);
  } catch (err) {
    console.error('[LGPD export profile]', err.message);
    result.profile_error = err.message;
  }

  const companyId = result.profile?.company_id;

  try {
    if (companyId) {
      result.organizational_context = {
        department_id: result.profile.department_id,
        department_name: result.profile.department_name,
        structural_role_id: result.profile.company_role_id,
        structural_role_name: result.profile.structural_role_name,
        hierarchy_level: result.profile.hierarchy_level,
        area: result.profile.area,
        job_title: result.profile.job_title,
        functional_area: result.profile.functional_area,
        supervisor_id: result.profile.supervisor_id
      };
    }
  } catch (err) {
    console.error('[LGPD export org]', err.message);
  }

  try {
    if (companyId) {
      const aiProviderService = require('../services/aiProviderService');
      result.ai_subprocessors = await aiProviderService.getSubprocessorsForExport(companyId);
    }
  } catch (err) {
    console.error('[LGPD export ai_subprocessors]', err.message);
    result.ai_subprocessors_error = err.message;
  }

  try {
    const dal = await db.query(
      `
      SELECT id, company_id, accessed_by, accessed_by_name, entity_type, entity_id,
             action, justification, contains_sensitive_data, ip_address, created_at
      FROM data_access_logs
      WHERE accessed_by = $1 OR entity_id::text = $1::text
      ORDER BY created_at DESC
      LIMIT 2000
    `,
      [userId]
    );
    result.data_access_logs = dal.rows;
  } catch (err) {
    console.error('[LGPD export data_access_logs]', err.message);
    result.data_access_logs_error = err.message;
  }

  try {
    const req = await db.query(
      `
      SELECT id, company_id, request_type, description, status, response,
             deadline, created_at, processed_at
      FROM lgpd_data_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
      [userId]
    );
    result.lgpd_requests.requests = req.rows;
    result.lgpd_requests.summary = {
      total: req.rows.length,
      by_status: req.rows.reduce((acc, row) => {
        const s = row.status || 'unknown';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {})
    };
  } catch (err) {
    console.error('[LGPD export lgpd_data_requests]', err.message);
    result.lgpd_requests_error = err.message;
  }

  try {
    if (companyId) {
      const aud = await db.query(
        `
        SELECT id, action, entity_type, entity_id, description, changes, severity, created_at
        FROM audit_logs
        WHERE company_id = $1
          AND (
            entity_type = 'user' AND entity_id::text = $2::text
            OR user_id::text = $2::text
          )
          AND (
            action ILIKE '%user%'
            OR action ILIKE '%role%'
            OR action ILIKE '%cargo%'
            OR action ILIKE '%department%'
            OR action ILIKE '%perfil%'
            OR description ILIKE '%role%'
            OR description ILIKE '%cargo%'
          )
        ORDER BY created_at DESC
        LIMIT 500
      `,
        [companyId, userId]
      );
      result.audit_trail_role_related = aud.rows;
    }
  } catch (err) {
    console.error('[LGPD export audit]', err.message);
    result.audit_trail_error = err.message;
  }

  try {
    const cons = await db.query(
      `
      SELECT consent_type, document_version, granted, created_at, revoked_at
      FROM consent_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 200
    `,
      [userId]
    );
    result.consent_history = cons.rows;
  } catch (err) {
    console.error('[LGPD export consent_logs]', err.message);
    result.consent_history_error = err.message;
  }

  try {
    if (companyId) {
      const chat = await db.query(
        `
        SELECT m.id, m.conversation_id, m.sender_id, m.message_type, m.content, m.file_url, m.file_name,
               m.file_size, m.reply_to, m.created_at, m.deleted_for_everyone_at,
               c.type AS conversation_type, c.name AS conversation_name, c.company_id
        FROM chat_messages m
        INNER JOIN chat_conversations c ON c.id = m.conversation_id AND c.company_id = $2
        INNER JOIN chat_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
        WHERE m.deleted_at IS NULL
        ORDER BY m.created_at DESC
        LIMIT 8000
      `,
        [userId, companyId]
      );
      result.chat_messages = chat.rows;
    }
  } catch (err) {
    console.error('[LGPD export chat_messages]', err.message);
    result.chat_messages_error = err.message;
  }

  try {
    if (companyId) {
      const comm = await db.query(
        `
        SELECT id, company_id, source, source_message_id, sender_id, sender_name, sender_phone,
               recipient_id, recipient_department_id, message_type, text_content, media_url,
               status, ai_sentiment, ai_priority, ai_keywords, related_equipment_id,
               contains_sensitive_data, created_at
        FROM communications
        WHERE company_id = $1
          AND (sender_id = $2 OR recipient_id = $2)
        ORDER BY created_at DESC
        LIMIT 5000
      `,
        [companyId, userId]
      );
      result.communications = comm.rows;
    }
  } catch (err) {
    console.error('[LGPD export communications]', err.message);
    result.communications_error = err.message;
  }

  return result;
}

/**
 * Anonimiza titular preservando integridade referencial (Art. 18 LGPD).
 * @param {string} userId
 * @param {object} [opts]
 * @param {string} [opts.companyId] — restringe à empresa (recomendado)
 */
async function anonymizeUserData(userId, opts = {}) {
  const { companyId } = opts;
  let row;
  try {
    const r = await db.query(`SELECT id, company_id, email FROM users WHERE id = $1`, [userId]);
    row = r.rows[0];
  } catch (err) {
    console.error('[LGPD anonymize lookup]', err.message);
    return { ok: false, error: err.message };
  }
  if (!row) return { ok: false, error: 'user_not_found' };
  if (companyId && String(row.company_id) !== String(companyId)) {
    return { ok: false, error: 'company_mismatch' };
  }

  const tag = shortHash(`${userId}:${Date.now()}`);
  const anonName = `ANON_USER_${tag}`;
  const anonEmail = `anon_${tag}@anonymized.impetus.local`;
  let junkHash;
  try {
    junkHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 8);
  } catch (e) {
    junkHash = '$2b$08$' + crypto.randomBytes(20).toString('base64').slice(0, 31);
  }

  try {
    await db.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
  } catch (err) {
    console.error('[LGPD anonymize sessions]', err.message);
  }

  const setParts = [
    `name = $2`,
    `email = $3`,
    `password_hash = $4`,
    `active = false`,
    `deleted_at = COALESCE(deleted_at, now())`,
    `updated_at = now()`,
    `phone = NULL`,
    `whatsapp_number = NULL`,
    `foto_perfil = NULL`,
    `avatar_url = NULL`,
    `ai_profile_context = NULL`,
    `hr_responsibilities = NULL`,
    `job_title = NULL`,
    `department = NULL`
  ];
  const params = [userId, anonName, anonEmail, junkHash];

  try {
    const colCheck = await db.query(
      `
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
    `
    );
    const have = new Set(colCheck.rows.map((x) => x.column_name));
    for (const c of ['cpf', 'documento', 'rg', 'pis', 'cnh']) {
      if (have.has(c)) setParts.push(`${c} = NULL`);
    }
    if (have.has('lgpd_tenant_status')) {
      setParts.push(`lgpd_tenant_status = 'inativo'`);
    }
    if (have.has('lgpd_consent')) {
      setParts.push(`lgpd_consent = false`);
    }
    let sql = `UPDATE users SET ${setParts.join(', ')} WHERE id = $1`;
    if (companyId) {
      sql += ' AND company_id = $5';
      params.push(companyId);
    }
    await db.query(sql, params);
  } catch (err) {
    console.error('[LGPD anonymize UPDATE users]', err.message);
    return { ok: false, error: err.message };
  }

  try {
    await db.query(
      `
      UPDATE role_verification_documents
      SET file_path = '[REDACTED]', file_name = '[REDACTED]'
      WHERE user_id = $1
    `,
      [userId]
    );
  } catch (err) {
    /* tabela opcional */
  }

  return { ok: true, anonymized_label: anonName };
}

/**
 * @param {object} payload
 * @param {string} payload.requestId
 * @param {string} payload.companyId
 * @param {string} payload.status — processing | completed | rejected | denied | pending
 * @param {string} [payload.response]
 */
async function processDataRequest(payload) {
  const { requestId, companyId, status, response } = payload;
  if (!requestId || !companyId || !status) {
    return { ok: false, error: 'missing_fields' };
  }
  const allowed = ['pending', 'processing', 'completed', 'rejected', 'denied'];
  if (!allowed.includes(String(status).toLowerCase())) {
    return { ok: false, error: 'invalid_status' };
  }
  const st = String(status).toLowerCase();
  try {
    const terminal = ['completed', 'rejected', 'denied'].includes(st);
    const r = await db.query(
      `
      UPDATE lgpd_data_requests SET
        status = $1,
        response = COALESCE($2, response),
        processed_at = CASE WHEN $3 THEN now() ELSE processed_at END
      WHERE id = $4 AND company_id = $5
      RETURNING id, status, processed_at
    `,
      [st, response || null, terminal, requestId, companyId]
    );
    if (r.rows.length === 0) return { ok: false, error: 'request_not_found' };
    return { ok: true, request: r.rows[0] };
  } catch (err) {
    console.error('[LGPD processDataRequest]', err.message);
    return { ok: false, error: err.message };
  }
}

function collectStringsFromPayload(val, depth, maxDepth, out, maxStrings) {
  if (out.length >= maxStrings || depth > maxDepth) return;
  if (val == null) return;
  if (typeof val === 'string') {
    if (val.length > 0 && val.length < 100000) out.push(val);
    return;
  }
  if (typeof val !== 'object') return;
  if (Array.isArray(val)) {
    for (const item of val) {
      collectStringsFromPayload(item, depth + 1, maxDepth, out, maxStrings);
      if (out.length >= maxStrings) return;
    }
    return;
  }
  for (const k of Object.keys(val)) {
    collectStringsFromPayload(val[k], depth + 1, maxDepth, out, maxStrings);
    if (out.length >= maxStrings) return;
  }
}

function sensitiveContentMiddleware(req, res, next) {
  setImmediate(() => {
    try {
      const user = req.user || {};
      const chunks = [];
      collectStringsFromPayload(req.body, 0, 8, chunks, 80);
      const hay = chunks.join('\n').slice(0, 120000);
      const patterns = new Set();
      if (CPF_LIKE.test(hay)) patterns.add('cpf_like');
      if (EMAIL_LIKE.test(hay)) patterns.add('email_like');
      if (patterns.size === 0) return;
      logAction({
        companyId: user.company_id,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'sensitive_payload_detected',
        entityType: 'http_request',
        entityId: null,
        description: `Possível dado pessoal em payload (${[...patterns].join(', ')}) em ${req.method} ${req.originalUrl || req.path}`,
        changes: { patterns: [...patterns], path: req.path, method: req.method },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.session?.id,
        severity: 'warning',
        success: true
      });
    } catch (e) {
      console.error('[LGPD sensitiveContentMiddleware]', e.message);
    }
  });
  next();
}

module.exports = {
  registerConsent,
  revokeConsent,
  exportUserData,
  anonymizeUserData,
  processDataRequest,
  sensitiveContentMiddleware
};
