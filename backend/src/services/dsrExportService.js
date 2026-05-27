'use strict';

/**
 * DSR Export Service — Enterprise-grade Data Subject Request Export (Art. 18, II LGPD)
 *
 * Implementa o direito de acesso e portabilidade com:
 *   - Approval flow assíncrono: SUBMIT → PENDING → APPROVED → EXECUTED
 *   - SLA tracking (21 dias corridos = ~15 dias úteis)
 *   - Multi-tenant isolation estrita
 *   - Audit trail completo em todas as fases
 *   - CorrelationId obrigatório
 *   - Zero mutations (apenas leitura)
 *   - Deny-first: não executa se não aprovado
 *   - Additive-only: não altera o export legado existente (/my-data)
 *
 * Formato de exportação:
 *   - JSON estruturado com manifest + metadata + sections
 *   - export_version versionado (semver)
 *   - Preparado para ZIP futuro (não implementa ZIP agora)
 *
 * Flag: IMPETUS_DSR_EXPORT=off|on (default off)
 */

const db = require('../db');

const SCHEMA_VERSION = 'lgpd_dsr_export_v3';
const EXPORT_VERSION = '3.0.0';
const MAX_ROWS_PER_TABLE = 10000;
const SLA_DAYS = 21;

const STAGES = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
});

/**
 * Tabelas incluídas na exportação com justificativa legal.
 */
const EXPORT_TABLES = Object.freeze([
  { id: 'users', description: 'Dados cadastrais do titular', legal: 'Art. 18, II LGPD — Acesso', pii: true },
  { id: 'memoria_usuario', description: 'Perfis cognitivos e respostas de onboarding', legal: 'Art. 18, II + Art. 20 LGPD', pii: true },
  { id: 'chat_messages', description: 'Mensagens de chat (scope do titular)', legal: 'Art. 18, II LGPD — Conteúdo pessoal', pii: true },
  { id: 'ai_interaction_traces', description: 'Traces de interações IA (metadata)', legal: 'Art. 20 LGPD — Explicabilidade IA', pii: true },
  { id: 'session_context', description: 'Contexto de sessão activo', legal: 'Art. 18, II LGPD', pii: true },
  { id: 'strategic_user_behavior', description: 'Comportamento estratégico', legal: 'Art. 18, II LGPD — Dados derivados', pii: true },
  { id: 'consent_logs', description: 'Histórico de consentimentos', legal: 'Art. 8°, §2 LGPD — Prova de consentimento', pii: false },
  { id: 'lgpd_data_requests', description: 'Histórico de requests LGPD do titular', legal: 'Art. 18, II LGPD — Transparência', pii: false },
  { id: 'internal_chat_messages', description: 'Mensagens internas', legal: 'Art. 18, II LGPD', pii: true },
  { id: 'onboarding_conversations', description: 'Conversas de onboarding', legal: 'Art. 18, II LGPD', pii: true },
  { id: 'communications', description: 'Comunicações (enviadas/recebidas)', legal: 'Art. 18, II LGPD', pii: true },
  { id: 'user_activity_logs', description: 'Logs de actividade do titular', legal: 'Art. 18, II LGPD', pii: true },
  { id: 'dashboard_usage_events', description: 'Eventos de uso do dashboard', legal: 'Art. 18, II LGPD', pii: true },
  { id: 'user_dashboard_preferences', description: 'Preferências de dashboard', legal: 'Art. 18, II LGPD', pii: false },
  { id: 'voice_preferences', description: 'Preferências de voz', legal: 'Art. 18, II LGPD', pii: false },
  { id: 'manuia_notification_preferences', description: 'Preferências de notificação', legal: 'Art. 18, II LGPD', pii: false },
  { id: 'notifications', description: 'Notificações', legal: 'Art. 18, II LGPD', pii: false },
  { id: 'operational_memory', description: 'Memória operacional (scope do titular)', legal: 'Art. 18, II LGPD', pii: true },
  { id: 'token_usage', description: 'Consumo de tokens IA', legal: 'Art. 18, II LGPD — Transparência', pii: false },
  { id: 'ai_decision_logs', description: 'Logs de decisões IA (explicabilidade)', legal: 'Art. 20 LGPD — Revisão de decisões automatizadas', pii: false },
]);

/**
 * Tabelas EXCLUÍDAS da exportação com justificativa legal.
 */
const EXCLUDED_TABLES = Object.freeze([
  { id: 'audit_logs', reason: 'Art. 37 LGPD — Registro de operações do controlador (retido 5+ anos)', immutable: true },
  { id: 'ai_legal_audit_logs', reason: 'Art. 37 LGPD — Trail regulatório IA', immutable: true },
  { id: 'ai_audit_logs', reason: 'Art. 37 LGPD — Auditoria interna do sistema', immutable: true },
  { id: 'ai_outbound_audit', reason: 'Art. 37 LGPD — Comunicações externas auditáveis', immutable: true },
  { id: 'companies', reason: 'Dados de terceiro (controlador)', immutable: false },
  { id: 'manuals', reason: 'Propriedade intelectual da empresa', immutable: false },
  { id: 'manual_chunks', reason: 'Dados operacionais da empresa (embeddings)', immutable: false },
]);

function isDsrExportEnabled() {
  const v = String(process.env.IMPETUS_DSR_EXPORT || '').trim().toLowerCase();
  return v === 'on' || v === 'true' || v === '1';
}

function _log(event, data) {
  try {
    console.info('[DSR_EXPORT]', JSON.stringify({ _type: 'dsr_export', event, ts: new Date().toISOString(), ...data }));
  } catch { /* never throw */ }
}

async function _safeQuery(label, sql, params) {
  try {
    const result = await db.query(sql, params);
    return { ok: true, rows: result.rows, count: result.rows.length };
  } catch (err) {
    _log('query_error', { label, error: err?.message });
    return { ok: false, rows: [], count: 0, error: err?.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBMIT — Cria request de exportação (PENDING)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Submete pedido de exportação.
 * @param {string} userId
 * @param {string} companyId
 * @param {object} opts — { correlationId, reason }
 */
async function submitExportRequest(userId, companyId, opts = {}) {
  if (!isDsrExportEnabled()) {
    return { ok: false, error: 'DSR Export disabled (IMPETUS_DSR_EXPORT=off)', code: 'DSR_DISABLED' };
  }
  if (!userId || !companyId) {
    return { ok: false, error: 'userId and companyId required', code: 'INVALID_INPUT' };
  }

  const correlationId = opts.correlationId || `dsr_exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const userCheck = await db.query(
      'SELECT id, name, email FROM users WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [userId, companyId]
    );
    if (userCheck.rows.length === 0) {
      return { ok: false, error: 'User not found in tenant', code: 'USER_NOT_FOUND' };
    }

    // Check for duplicate PENDING/APPROVED requests
    const existing = await db.query(
      `SELECT id, status, created_at FROM lgpd_data_requests
       WHERE user_id = $1 AND company_id = $2 AND request_type = 'portability'
       AND status IN ('pending', 'approved', 'executing')
       ORDER BY created_at DESC LIMIT 1`,
      [userId, companyId]
    );
    if (existing.rows.length > 0) {
      return {
        ok: false,
        error: 'Duplicate export request in progress',
        code: 'DUPLICATE_REQUEST',
        existing: existing.rows[0],
      };
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + SLA_DAYS);

    const insert = await db.query(`
      INSERT INTO lgpd_data_requests (company_id, user_id, request_type, description, status, deadline)
      VALUES ($1, $2, 'portability', $3, 'pending', $4)
      RETURNING id, request_type, status, created_at, deadline
    `, [
      companyId,
      userId,
      `DSR Export (Art. 18, II LGPD) — correlation: ${correlationId}` + (opts.reason ? ` — reason: ${opts.reason}` : ''),
      deadline,
    ]);

    const request = insert.rows[0];

    _log('export_submitted', { userId, companyId, correlationId, requestId: request.id, deadline: deadline.toISOString() });

    return {
      ok: true,
      request,
      sla: { days: SLA_DAYS, deadline: deadline.toISOString() },
      correlation_id: correlationId,
      next_step: 'Aguardar aprovação por DPO/hierarchy ≤ 1',
    };
  } catch (err) {
    _log('submit_error', { userId, companyId, error: err?.message });
    return { ok: false, error: err?.message, code: 'INTERNAL_ERROR' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS — Consulta estado do export request
// ═══════════════════════════════════════════════════════════════════════════════

async function getExportStatus(userId, companyId) {
  try {
    const result = await db.query(`
      SELECT id, request_type, description, status, response,
             deadline, created_at, processed_at, completed_at, data_package_url
      FROM lgpd_data_requests
      WHERE user_id = $1 AND company_id = $2 AND request_type = 'portability'
      ORDER BY created_at DESC
    `, [userId, companyId]);

    const active = result.rows.find(r => ['pending', 'approved', 'executing'].includes(r.status));
    const history = result.rows;

    return {
      ok: true,
      active_request: active || null,
      history,
      count: result.rows.length,
    };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVE — DPO aprova o request
// ═══════════════════════════════════════════════════════════════════════════════

async function approveExportRequest(requestId, companyId, approverId) {
  if (!isDsrExportEnabled()) {
    return { ok: false, error: 'DSR Export disabled', code: 'DSR_DISABLED' };
  }

  try {
    const req = await db.query(
      `SELECT id, user_id, status, company_id FROM lgpd_data_requests
       WHERE id = $1 AND company_id = $2 AND request_type = 'portability'`,
      [requestId, companyId]
    );

    if (req.rows.length === 0) {
      return { ok: false, error: 'Request not found in tenant', code: 'NOT_FOUND' };
    }

    const request = req.rows[0];

    if (request.status !== STAGES.PENDING) {
      return { ok: false, error: `Cannot approve: current status is '${request.status}'`, code: 'INVALID_STATUS' };
    }

    await db.query(
      `UPDATE lgpd_data_requests SET status = 'approved', assigned_to = $1, processed_at = NOW()
       WHERE id = $2`,
      [approverId, requestId]
    );

    _log('export_approved', { requestId, companyId, approverId });

    return {
      ok: true,
      request_id: requestId,
      status: STAGES.APPROVED,
      approved_by: approverId,
      approved_at: new Date().toISOString(),
      next_step: 'Executar via POST /api/lgpd/subject/export/:id/execute',
    };
  } catch (err) {
    _log('approve_error', { requestId, error: err?.message });
    return { ok: false, error: err?.message, code: 'INTERNAL_ERROR' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTE — Executa a exportação aprovada
// ═══════════════════════════════════════════════════════════════════════════════

async function executeExportRequest(requestId, companyId) {
  if (!isDsrExportEnabled()) {
    return { ok: false, error: 'DSR Export disabled', code: 'DSR_DISABLED' };
  }

  try {
    const req = await db.query(
      `SELECT id, user_id, status, company_id, deadline FROM lgpd_data_requests
       WHERE id = $1 AND company_id = $2 AND request_type = 'portability'`,
      [requestId, companyId]
    );

    if (req.rows.length === 0) {
      return { ok: false, error: 'Request not found in tenant', code: 'NOT_FOUND' };
    }

    const request = req.rows[0];

    if (request.status !== STAGES.APPROVED) {
      return { ok: false, error: `Cannot execute: status is '${request.status}', must be 'approved'`, code: 'NOT_APPROVED' };
    }

    // Mark as executing
    await db.query(`UPDATE lgpd_data_requests SET status = 'executing' WHERE id = $1`, [requestId]);

    const userId = request.user_id;
    const correlationId = `dsr_exec_${requestId}_${Date.now()}`;

    _log('export_executing', { requestId, userId, companyId, correlationId });

    // Execute data collection
    const exportResult = await _collectExportData(userId, companyId, correlationId);

    if (!exportResult.ok) {
      await db.query(`UPDATE lgpd_data_requests SET status = 'approved', response = $1 WHERE id = $2`,
        [`Export failed: ${exportResult.error}`, requestId]);
      return exportResult;
    }

    // Mark as completed
    await db.query(
      `UPDATE lgpd_data_requests SET status = 'completed', completed_at = NOW(), 
       response = $1 WHERE id = $2`,
      [`Export completed: ${exportResult.manifest.metadata.total_records} registos em ${exportResult.manifest.metadata.sections_count} secções`, requestId]
    );

    _log('export_completed', {
      requestId,
      userId,
      companyId,
      correlationId,
      totalRecords: exportResult.manifest.metadata.total_records,
      durationMs: exportResult.manifest.metadata.duration_ms,
    });

    return {
      ok: true,
      request_id: requestId,
      status: STAGES.COMPLETED,
      export: exportResult,
    };
  } catch (err) {
    _log('execute_error', { requestId, error: err?.message });
    await db.query(`UPDATE lgpd_data_requests SET status = 'approved', response = $1 WHERE id = $2`,
      [`Execution error: ${err?.message}`, requestId]).catch(() => {});
    return { ok: false, error: err?.message, code: 'EXECUTION_ERROR' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA COLLECTION (interno)
// ═══════════════════════════════════════════════════════════════════════════════

async function _collectExportData(userId, companyId, correlationId) {
  const start = Date.now();
  const sections = {};

  // ─── 1. IDENTIDADE E CONTA ─────────────────────────────────────────────────

  const profile = await _safeQuery('users', `
    SELECT id, name, email, phone, avatar_url, role, job_title, area, department,
           company_id, department_id, hierarchy_level, functional_area,
           created_at, updated_at, last_login, lgpd_consent, lgpd_consent_date
    FROM users WHERE id = $1 AND company_id = $2
  `, [userId, companyId]);

  if (!profile.ok || profile.count === 0) {
    return { ok: false, error: 'User not found in tenant', code: 'USER_NOT_FOUND' };
  }
  sections.identity = { data: profile.rows[0], count: 1, table: 'users' };

  // ─── 2. MEMÓRIA COGNITIVA ─────────────────────────────────────────────────

  const memoria = await _safeQuery('memoria_usuario', `
    SELECT id, respostas_raw, perfil_tecnico, perfil_comportamental,
           mapa_responsabilidade, resumo_estrategico, onboarding_completed,
           created_at, updated_at
    FROM memoria_usuario WHERE user_id = $1 AND company_id = $2
  `, [userId, companyId]);
  sections.cognitive_profile = { data: memoria.rows, count: memoria.count, table: 'memoria_usuario' };

  // ─── 3. MENSAGENS E CONTEÚDO ───────────────────────────────────────────────

  const chatMessages = await _safeQuery('chat_messages', `
    SELECT m.id, m.conversation_id, m.message_type, m.content, m.file_url,
           m.file_name, m.file_size, m.created_at, m.deleted_at,
           c.type AS conversation_type, c.name AS conversation_name
    FROM chat_messages m
    INNER JOIN chat_conversations c ON c.id = m.conversation_id AND c.company_id = $2
    INNER JOIN chat_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
    WHERE m.sender_id = $1 AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC LIMIT $3
  `, [userId, companyId, MAX_ROWS_PER_TABLE]);
  sections.chat_messages = { data: chatMessages.rows, count: chatMessages.count, table: 'chat_messages' };

  const internalMessages = await _safeQuery('internal_chat_messages', `
    SELECT id, conversation_id, message_type, text_content, media_url,
           media_filename, status, created_at, edited_at
    FROM internal_chat_messages
    WHERE sender_id = $1 AND company_id = $2 AND deleted_at IS NULL
    ORDER BY created_at DESC LIMIT $3
  `, [userId, companyId, MAX_ROWS_PER_TABLE]);
  sections.internal_messages = { data: internalMessages.rows, count: internalMessages.count, table: 'internal_chat_messages' };

  const onboarding = await _safeQuery('onboarding_conversations', `
    SELECT id, tipo, role, content, created_at
    FROM onboarding_conversations
    WHERE user_id = $1 AND company_id = $2
    ORDER BY created_at DESC LIMIT $3
  `, [userId, companyId, MAX_ROWS_PER_TABLE]);
  sections.onboarding_conversations = { data: onboarding.rows, count: onboarding.count, table: 'onboarding_conversations' };

  const communications = await _safeQuery('communications', `
    SELECT id, source, message_type, text_content, media_url, status,
           ai_classification, ai_sentiment, ai_priority, created_at
    FROM communications
    WHERE company_id = $1 AND (sender_id = $2 OR recipient_id = $2)
    ORDER BY created_at DESC LIMIT $3
  `, [companyId, userId, MAX_ROWS_PER_TABLE]);
  sections.communications = { data: communications.rows, count: communications.count, table: 'communications' };

  // ─── 4. INTERAÇÕES IA ──────────────────────────────────────────────────────

  const aiTraces = await _safeQuery('ai_interaction_traces', `
    SELECT id, trace_id, module_name, model_info, input_payload, output_response,
           legal_basis, data_classification, created_at
    FROM ai_interaction_traces
    WHERE user_id = $1 AND company_id = $2
    ORDER BY created_at DESC LIMIT $3
  `, [userId, companyId, MAX_ROWS_PER_TABLE]);
  sections.ai_interactions = { data: aiTraces.rows, count: aiTraces.count, table: 'ai_interaction_traces' };

  const aiDecisions = await _safeQuery('ai_decision_logs', `
    SELECT id, decision_type, context, result, confidence, model_used, created_at
    FROM ai_decision_logs
    WHERE user_id = $1 AND company_id = $2
    ORDER BY created_at DESC LIMIT $3
  `, [userId, companyId, MAX_ROWS_PER_TABLE]);
  sections.ai_decisions = { data: aiDecisions.rows, count: aiDecisions.count, table: 'ai_decision_logs' };

  const tokenUsage = await _safeQuery('token_usage', `
    SELECT id, servico, quantidade, unidade, custo_real, created_at
    FROM token_usage
    WHERE user_id = $1 AND company_id = $2
    ORDER BY created_at DESC LIMIT $3
  `, [userId, companyId, MAX_ROWS_PER_TABLE]);
  sections.token_usage = { data: tokenUsage.rows, count: tokenUsage.count, table: 'token_usage' };

  // ─── 5. SESSION CONTEXT ────────────────────────────────────────────────────

  const sessionCtx = await _safeQuery('session_context', `
    SELECT id, contextual_meta, created_at, updated_at
    FROM session_context
    WHERE user_id = $1 AND company_id = $2
    ORDER BY created_at DESC LIMIT $3
  `, [userId, companyId, MAX_ROWS_PER_TABLE]);
  sections.session_context = { data: sessionCtx.rows, count: sessionCtx.count, table: 'session_context' };

  // ─── 6. COMPORTAMENTO ESTRATÉGICO ─────────────────────────────────────────

  const strategic = await _safeQuery('strategic_user_behavior', `
    SELECT id, behavior_type, context, score, confidence, created_at
    FROM strategic_user_behavior
    WHERE user_id = $1 AND company_id = $2
    ORDER BY created_at DESC LIMIT $3
  `, [userId, companyId, MAX_ROWS_PER_TABLE]);
  sections.strategic_behavior = { data: strategic.rows, count: strategic.count, table: 'strategic_user_behavior' };

  // ─── 7. ACTIVIDADE ─────────────────────────────────────────────────────────

  const activity = await _safeQuery('user_activity_logs', `
    SELECT id, activity_type, entity_type, entity_id, context, created_at
    FROM user_activity_logs
    WHERE user_id = $1 AND company_id = $2
    ORDER BY created_at DESC LIMIT $3
  `, [userId, companyId, MAX_ROWS_PER_TABLE]);
  sections.activity_logs = { data: activity.rows, count: activity.count, table: 'user_activity_logs' };

  const usageEvents = await _safeQuery('dashboard_usage_events', `
    SELECT id, event_type, entity_type, entity_id, context, created_at
    FROM dashboard_usage_events
    WHERE user_id = $1 AND company_id = $2
    ORDER BY created_at DESC LIMIT $3
  `, [userId, companyId, MAX_ROWS_PER_TABLE]);
  sections.usage_events = { data: usageEvents.rows, count: usageEvents.count, table: 'dashboard_usage_events' };

  // ─── 8. PREFERÊNCIAS ───────────────────────────────────────────────────────

  const dashPrefs = await _safeQuery('user_dashboard_preferences', `
    SELECT * FROM user_dashboard_preferences WHERE user_id = $1
  `, [userId]);
  sections.dashboard_preferences = { data: dashPrefs.rows, count: dashPrefs.count, table: 'user_dashboard_preferences' };

  const voicePrefs = await _safeQuery('voice_preferences', `
    SELECT id, alerts_enabled, alert_min_priority, auto_speak_responses,
           voice_id, speed, created_at
    FROM voice_preferences WHERE user_id = $1
  `, [userId]);
  sections.voice_preferences = { data: voicePrefs.rows, count: voicePrefs.count, table: 'voice_preferences' };

  const notifPrefs = await _safeQuery('manuia_notification_preferences', `
    SELECT * FROM manuia_notification_preferences WHERE user_id = $1
  `, [userId]);
  sections.notification_preferences = { data: notifPrefs.rows, count: notifPrefs.count, table: 'manuia_notification_preferences' };

  // ─── 9. DADOS OPERACIONAIS ─────────────────────────────────────────────────

  const operationalMemory = await _safeQuery('operational_memory', `
    SELECT id, scope_type, scope_label, fact_type, content, summary,
           priority, created_at, expires_at, is_active
    FROM operational_memory
    WHERE company_id = $1 AND (source_id = $2 OR scope_id = $2)
    ORDER BY created_at DESC LIMIT $3
  `, [companyId, userId, MAX_ROWS_PER_TABLE]);
  sections.operational_memory = { data: operationalMemory.rows, count: operationalMemory.count, table: 'operational_memory' };

  const notifications = await _safeQuery('notifications', `
    SELECT id, type, priority, title, message, read, read_at,
           action_url, created_at, expires_at
    FROM notifications
    WHERE user_id = $1 AND company_id = $2
    ORDER BY created_at DESC LIMIT $3
  `, [userId, companyId, MAX_ROWS_PER_TABLE]);
  sections.notifications = { data: notifications.rows, count: notifications.count, table: 'notifications' };

  // ─── 10. CONSENTIMENTOS E COMPLIANCE ───────────────────────────────────────

  const consents = await _safeQuery('consent_logs', `
    SELECT id, consent_type, document_version, granted, created_at, revoked_at
    FROM consent_logs
    WHERE user_id = $1
    ORDER BY created_at DESC
  `, [userId]);
  sections.consent_history = { data: consents.rows, count: consents.count, table: 'consent_logs' };

  const lgpdRequests = await _safeQuery('lgpd_data_requests', `
    SELECT id, request_type, description, status, response,
           deadline, created_at, processed_at, completed_at
    FROM lgpd_data_requests
    WHERE user_id = $1 AND company_id = $2
    ORDER BY created_at DESC
  `, [userId, companyId]);
  sections.lgpd_requests = { data: lgpdRequests.rows, count: lgpdRequests.count, table: 'lgpd_data_requests' };

  // ─── 11. SESSÕES ACTIVAS ───────────────────────────────────────────────────

  const sessions = await _safeQuery('sessions', `
    SELECT id, created_at, expires_at, last_activity, ip_address, user_agent
    FROM sessions
    WHERE user_id = $1 AND expires_at > NOW()
    ORDER BY created_at DESC LIMIT 100
  `, [userId]);
  sections.active_sessions = { data: sessions.rows, count: sessions.count, table: 'sessions' };

  // ─── MANIFEST ──────────────────────────────────────────────────────────────

  const durationMs = Date.now() - start;
  const totalRecords = Object.values(sections).reduce((sum, s) => sum + (s.count || 0), 0);

  const manifest = {
    schema_version: SCHEMA_VERSION,
    export_version: EXPORT_VERSION,
    export_type: 'dsr_portability',
    legal_basis: 'Art. 18, II LGPD — Direito de acesso e portabilidade',
    subject: {
      user_id: userId,
      company_id: companyId,
      name: sections.identity?.data?.name || null,
      email: sections.identity?.data?.email || null,
    },
    metadata: {
      correlation_id: correlationId,
      generated_at: new Date().toISOString(),
      duration_ms: durationMs,
      total_records: totalRecords,
      sections_count: Object.keys(sections).length,
      max_rows_per_table: MAX_ROWS_PER_TABLE,
      format: 'json',
      prepared_for_zip: true,
    },
    tables_included: EXPORT_TABLES,
    tables_excluded: EXCLUDED_TABLES,
    sections_summary: Object.fromEntries(
      Object.entries(sections).map(([key, val]) => [key, { count: val.count, has_data: val.count > 0, table: val.table }])
    ),
    legal_notes: {
      basis: 'Art. 18, II LGPD — Confirmação da existência de tratamento e acesso aos dados',
      portability: 'Art. 18, V LGPD — Portabilidade dos dados a outro fornecedor',
      excluded_justification: 'Tabelas de auditoria excluídas por Art. 37 LGPD (obrigação do controlador)',
      retention: 'Dados operacionais retidos pelo prazo contratual. Dados podem ser eliminados sob pedido separado (Art. 18, VI)',
    },
  };

  return { ok: true, manifest, sections };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY COMPAT — executeExport directo (backward compatible)
// ═══════════════════════════════════════════════════════════════════════════════

async function executeExport(userId, companyId, opts = {}) {
  if (!isDsrExportEnabled()) {
    return { ok: false, error: 'DSR Export disabled (IMPETUS_DSR_EXPORT=off)', code: 'DSR_DISABLED' };
  }
  if (!userId || !companyId) {
    return { ok: false, error: 'userId and companyId required', code: 'INVALID_INPUT' };
  }
  const correlationId = opts.correlationId || `dsr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return _collectExportData(userId, companyId, correlationId);
}

module.exports = {
  SCHEMA_VERSION,
  EXPORT_VERSION,
  SLA_DAYS,
  STAGES,
  EXPORT_TABLES,
  EXCLUDED_TABLES,
  isDsrExportEnabled,
  submitExportRequest,
  getExportStatus,
  approveExportRequest,
  executeExportRequest,
  executeExport,
};
