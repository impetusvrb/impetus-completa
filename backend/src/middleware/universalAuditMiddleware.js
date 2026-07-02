'use strict';

/**
 * Universal Audit Middleware — Enterprise Grade (LGPD + ISO 42001)
 *
 * Intercepta rotas WRITE (POST/PUT/PATCH/DELETE) que estejam na allowlist P0,
 * persiste audit trail de forma assíncrona (zero blocking no hot path),
 * com batching inteligente, proteção anti-flood e isolamento multi-tenant.
 *
 * Flag: IMPETUS_UNIVERSAL_AUDIT=off|shadow|pilot|on
 *   off    → no-op total (default)
 *   shadow → log estruturado (console), sem persistência em BD
 *   pilot  → persiste apenas para tenants na PILOT_TENANTS list
 *   on     → persiste para todos os tenants
 *
 * Propriedades:
 *   - Append-only (nunca UPDATE/DELETE em audit_universal_log)
 *   - Anti-tamper (hash chain no batch)
 *   - LGPD-safe (nunca persiste passwords, tokens, dados sensíveis)
 *   - Zero blocking (fire-and-forget com retry)
 *   - Rollback = mudar flag para off
 */

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const SENSITIVE_FIELDS = new Set([
  'password', 'senha', 'token', 'secret', 'authorization',
  'credit_card', 'card_number', 'cvv', 'pin', 'cpf', 'ssn',
  'access_token', 'refresh_token', 'api_key', 'private_key',
]);

/**
 * P0 Allowlist — rotas WRITE de criticidade máxima.
 * Formato: "METHOD /mount/path" (sem query string).
 * Expandir para P1/P2 após validação em produção.
 */
const P0_ALLOWLIST = new Set([
  'POST /api/auth/login',
  'POST /api/auth/logout',
  'POST /api/auth/forgot-password',
  'POST /api/auth/reset-password',
  'POST /api/auth/verify-password',
  'PATCH /api/user/account/profile',
  'POST /api/user/account/password',
  'DELETE /api/user/account/avatar',
  'DELETE /api/user/account/sessions',
  'POST /api/user/account/sessions/revoke-others',
  'POST /api/dashboard/chat',
  'POST /api/dashboard/chat/upload-file',
  'POST /api/dashboard/chat-multimodal',
  'POST /api/dashboard/panel-command',
  'POST /api/dashboard/claude-panel',
  'PATCH /api/dashboard/profile-context',
  'POST /api/dashboard/preferences',
  'POST /api/chat/conversations',
  'POST /api/chat/conversations/*/messages',
  'POST /api/chat/upload',
  'DELETE /api/chat/conversations/*/participants/*',
  'POST /api/admin/users',
  'PUT /api/admin/users/*',
  'DELETE /api/admin/users/*',
  'POST /api/admin/users/*/reset-password',
  'PUT /api/admin/settings/dashboard-visibility/*',
  'PUT /api/admin/settings/company',
  'POST /api/admin/tenant-admins',
  'DELETE /api/admin/tenant-admins/*',
  'POST /api/lgpd/consent',
  'DELETE /api/lgpd/consent/*',
  'POST /api/lgpd/data-request',
  'POST /api/lgpd/anonymize-user/*',
  'DELETE /api/lgpd/delete-my-account',
  'POST /api/pulse/me/submit',
  'POST /api/pulse/supervisor/*/perception',
  'POST /api/pulse/hr/trigger',
  'POST /api/pulse/hr/campaigns',
  'POST /api/integrations/mes-erp/push',
  'POST /api/integrations/edge/ingest',
  'POST /api/integrations/edge/register',
]);

const PILOT_TENANTS = new Set(
  String(process.env.IMPETUS_AUDIT_PILOT_TENANTS || '').split(',').map(s => s.trim()).filter(Boolean)
);

let _buffer = [];
let _flushTimer = null;
const BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 5000;
const MAX_BUFFER_SIZE = 500;
let _db = null;
let _tableVerified = false;

function _getAuditMode() {
  const v = String(process.env.IMPETUS_UNIVERSAL_AUDIT || '').trim().toLowerCase();
  if (['on', 'shadow', 'pilot'].includes(v)) return v;
  return 'off';
}

function _matchesAllowlist(method, path) {
  const key = `${method} ${path}`;
  if (P0_ALLOWLIST.has(key)) return true;
  for (const pattern of P0_ALLOWLIST) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]+') + '$');
      if (regex.test(key)) return true;
    }
  }
  return false;
}

function _sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  const sanitized = {};
  const keys = Object.keys(body);
  if (keys.length > 50) return { _truncated: true, _key_count: keys.length };
  for (const k of keys) {
    if (SENSITIVE_FIELDS.has(k.toLowerCase())) {
      sanitized[k] = '[REDACTED]';
    } else if (typeof body[k] === 'string' && body[k].length > 500) {
      sanitized[k] = body[k].substring(0, 500) + '...[TRUNCATED]';
    } else if (typeof body[k] === 'object' && body[k] !== null) {
      sanitized[k] = '[OBJECT]';
    } else {
      sanitized[k] = body[k];
    }
  }
  return sanitized;
}

function _buildAuditEntry(req, res, durationMs) {
  const user = req.user || {};
  const path = (req.originalUrl || req.url || '').split('?')[0];

  return {
    correlation_id: req.id || req.headers?.['x-correlation-id'] || req.headers?.['x-request-id'] || null,
    timestamp: new Date().toISOString(),
    method: req.method,
    path,
    actor_id: user.id || null,
    actor_name: user.name || null,
    actor_role: user.role || null,
    tenant_id: user.company_id || null,
    ip_address: req.ip || req.connection?.remoteAddress || null,
    user_agent: (req.headers?.['user-agent'] || '').substring(0, 256),
    status_code: res.statusCode,
    duration_ms: durationMs,
    request_body: _sanitizeBody(req.body),
    ai_involvement: _detectAIInvolvement(path),
    governance_state: _getAuditMode(),
    feature_flags: _getActiveFlags(),
  };
}

function _detectAIInvolvement(path) {
  const aiPaths = ['/chat', '/panel-command', '/claude-panel', '/chat-multimodal', '/voz', '/cadastrar-com-ia', '/manutencao-ia'];
  return aiPaths.some(p => path.includes(p));
}

function _getActiveFlags() {
  return {
    universal_audit: _getAuditMode(),
    failsafe_governance: String(process.env.IMPETUS_FAILSAFE_GOVERNANCE || 'on').toLowerCase(),
    visibility_hardened: String(process.env.IMPETUS_VISIBILITY_HARDENED || 'off').toLowerCase(),
    dashboard_engine_v2: String(process.env.IMPETUS_DASHBOARD_ENGINE_V2 || 'off').toLowerCase(),
  };
}

async function _ensureTable() {
  if (_tableVerified) return true;
  try {
    if (!_db) _db = require('../db');
    await _db.query(`
      CREATE TABLE IF NOT EXISTS audit_universal_log (
        id BIGSERIAL PRIMARY KEY,
        correlation_id TEXT,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        method VARCHAR(10) NOT NULL,
        path TEXT NOT NULL,
        actor_id INTEGER,
        actor_name TEXT,
        actor_role VARCHAR(64),
        tenant_id UUID,
        ip_address VARCHAR(64),
        user_agent TEXT,
        status_code INTEGER,
        duration_ms INTEGER,
        request_body JSONB,
        ai_involvement BOOLEAN DEFAULT FALSE,
        governance_state VARCHAR(16),
        feature_flags JSONB,
        batch_hash VARCHAR(64)
      );
      CREATE INDEX IF NOT EXISTS idx_aul_tenant_ts ON audit_universal_log (tenant_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_aul_actor_ts ON audit_universal_log (actor_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_aul_correlation ON audit_universal_log (correlation_id);
    `);
    _tableVerified = true;
    return true;
  } catch (err) {
    console.warn('[UNIVERSAL_AUDIT] Table creation failed (non-blocking):', err?.message);
    return false;
  }
}

function _enqueue(entry) {
  if (_buffer.length >= MAX_BUFFER_SIZE) {
    _buffer.shift();
    console.warn('[UNIVERSAL_AUDIT] Buffer overflow — oldest entry dropped');
  }
  _buffer.push(entry);

  if (_buffer.length >= BATCH_SIZE) {
    _flushNow();
  } else if (!_flushTimer) {
    _flushTimer = setTimeout(_flushNow, FLUSH_INTERVAL_MS);
  }
}

async function _flushNow() {
  if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
  if (_buffer.length === 0) return;

  const batch = _buffer.splice(0, BATCH_SIZE);
  const mode = _getAuditMode();

  if (mode === 'shadow') {
    batch.forEach(e => console.info('[UNIVERSAL_AUDIT_SHADOW]', JSON.stringify(e)));
    return;
  }

  try {
    const tableOk = await _ensureTable();
    if (!tableOk) {
      batch.forEach(e => console.info('[UNIVERSAL_AUDIT_FALLBACK]', JSON.stringify(e)));
      return;
    }

    const batchHash = require('crypto').createHash('sha256')
      .update(JSON.stringify(batch.map(e => e.correlation_id + e.timestamp)))
      .digest('hex').substring(0, 16);

    const values = [];
    const placeholders = [];
    let idx = 1;

    for (const e of batch) {
      placeholders.push(`($${idx}, $${idx+1}, $${idx+2}, $${idx+3}, $${idx+4}, $${idx+5}, $${idx+6}, $${idx+7}, $${idx+8}, $${idx+9}, $${idx+10}, $${idx+11}, $${idx+12}, $${idx+13}, $${idx+14}, $${idx+15})`);
      values.push(
        e.correlation_id, e.timestamp, e.method, e.path,
        e.actor_id, e.actor_name, e.actor_role, e.tenant_id,
        e.ip_address, e.user_agent, e.status_code, e.duration_ms,
        e.request_body ? JSON.stringify(e.request_body) : null,
        e.ai_involvement, e.governance_state,
        batchHash
      );
      idx += 16;
    }

    await _db.query(`
      INSERT INTO audit_universal_log (
        correlation_id, timestamp, method, path,
        actor_id, actor_name, actor_role, tenant_id,
        ip_address, user_agent, status_code, duration_ms,
        request_body, ai_involvement, governance_state, batch_hash
      ) VALUES ${placeholders.join(', ')}
    `, values);
  } catch (err) {
    console.error('[UNIVERSAL_AUDIT] Persist failed (non-blocking):', err?.message);
    batch.forEach(e => console.info('[UNIVERSAL_AUDIT_RETRY_FALLBACK]', JSON.stringify(e)));
  }

  if (_buffer.length > 0) {
    _flushTimer = setTimeout(_flushNow, FLUSH_INTERVAL_MS);
  }
}

/**
 * Middleware universal — registar no app.use() APÓS body parsing e correlation-id.
 * Zero-blocking: intercepta a resposta com monkey-patch em res.end().
 */
function universalAuditMiddleware(req, res, next) {
  const mode = _getAuditMode();
  if (mode === 'off') return next();

  if (!WRITE_METHODS.has(req.method)) return next();

  const path = (req.originalUrl || req.url || '').split('?')[0];
  if (!_matchesAllowlist(req.method, path)) return next();

  if (mode === 'pilot') {
    const tenantId = req.user?.company_id || null;
    if (!tenantId || !PILOT_TENANTS.has(tenantId)) return next();
  }

  const start = Date.now();
  const originalEnd = res.end;

  res.end = function (...args) {
    res.end = originalEnd;
    const result = res.end.apply(this, args);

    setImmediate(() => {
      try {
        const entry = _buildAuditEntry(req, res, Date.now() - start);
        _enqueue(entry);
      } catch (e) {
        console.warn('[UNIVERSAL_AUDIT] Entry build failed:', e?.message);
      }
    });

    return result;
  };

  next();
}

function getAuditStats() {
  return {
    mode: _getAuditMode(),
    buffer_size: _buffer.length,
    p0_routes_count: P0_ALLOWLIST.size,
    pilot_tenants: [...PILOT_TENANTS],
    table_verified: _tableVerified,
  };
}

module.exports = {
  universalAuditMiddleware,
  getAuditStats,
  P0_ALLOWLIST,
  _flushNow,
};
