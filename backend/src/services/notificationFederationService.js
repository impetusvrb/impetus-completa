'use strict';

/**
 * NC-04-FEDERATION — agregador read-only de notificações multi-fonte.
 * Sem alterar schemas, migrar dados ou substituir módulos.
 */

const db = require('../db');
const observability = require('./observabilityService');

const FEDERATION_SOURCES = Object.freeze([
  'app_notifications',
  'operational_alerts',
  'notifications',
  'manuia_inbox_notifications',
  'alerts'
]);

const METRIC_QUERIES = 'notification_federation_queries';
const METRIC_RESULTS = 'notification_federation_results';
const METRIC_LATENCY = 'notification_federation_latency_ms';

const CATEGORY_ALIASES = Object.freeze({
  todas: null,
  sistema: 'sistema',
  operacional: 'operacional',
  billing: 'billing',
  manuia: 'manuia',
  dsr: 'dsr',
  tpm: 'tpm'
});

/** @type {Set<string>|null} */
let _tableCache = null;

function isFederationEnabled() {
  return String(process.env.NC_04_FEDERATION_ENABLED || 'true').toLowerCase() !== 'false';
}

function _recordQuery() {
  observability.incrementMetric(METRIC_QUERIES);
}

function _recordResults(count) {
  if (count > 0) observability.incrementMetric(METRIC_RESULTS, count);
}

function _recordLatency(ms) {
  if (Number.isFinite(ms) && ms >= 0) {
    observability.incrementMetric(METRIC_LATENCY, Math.round(ms));
  }
}

async function _existingTables() {
  if (_tableCache) return _tableCache;
  const r = await db.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY($1::text[])
  `, [FEDERATION_SOURCES]);
  _tableCache = new Set((r.rows || []).map((row) => row.table_name));
  return _tableCache;
}

function resetTableCacheForTests() {
  _tableCache = null;
}

function _compositeId(source, id) {
  return `${source}:${id}`;
}

function _normalizeSeverity(raw) {
  const s = String(raw || 'info')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (['critical', 'critica', 'alta', 'high'].includes(s)) return 'high';
  if (['warning', 'aviso', 'amber'].includes(s)) return 'warning';
  if (['media', 'medium', 'medio'].includes(s)) return 'medium';
  if (['baixa', 'low', 'info'].includes(s)) return 'low';
  return s || 'info';
}

function _isBillingText(text) {
  return /inadimpl|assinatura.*atraso|billing|cobran/i.test(String(text || ''));
}

function _isTpmRow(row) {
  const tipo = String(row.tipo_alerta || row.type || row.source || '').toLowerCase();
  return tipo.includes('tpm') || tipo.includes('perdas');
}

function _inferOriginModule(source, row) {
  if (source === 'app_notifications') {
    return _isBillingText(row.text_content) ? 'billing' : 'sistema';
  }
  if (source === 'notifications') return 'dsr';
  if (source === 'manuia_inbox_notifications') return 'manuia';
  if (source === 'operational_alerts') {
    return _isTpmRow(row) ? 'tpm' : 'operacional';
  }
  if (source === 'alerts') {
    return _isTpmRow(row) ? 'tpm' : 'operacional';
  }
  return 'sistema';
}

/**
 * @param {string} source
 * @param {object} row
 * @returns {object}
 */
function mapRowToDto(source, row) {
  const origin_module = _inferOriginModule(source, row);
  let title = '';
  let message = '';
  let severity = 'info';
  let created_at = row.created_at || row.sent_at || new Date().toISOString();
  let read = false;
  let deep_link = null;

  if (source === 'app_notifications') {
    title = 'Notificação';
    message = row.text_content || '';
    severity = 'info';
    read = row.read_at != null;
    created_at = row.sent_at || row.created_at || created_at;
    if (origin_module === 'billing') title = 'Billing';
  } else if (source === 'operational_alerts') {
    title = row.titulo || row.tipo_alerta || 'Alerta operacional';
    message = row.mensagem || '';
    severity = _normalizeSeverity(row.severidade);
    read = row.resolvido === true;
    deep_link = '/app/centro-operacoes-industrial';
  } else if (source === 'notifications') {
    title = row.title || row.type || 'Notificação LGPD';
    message = row.message || '';
    severity = _normalizeSeverity(row.priority);
    read = row.read === true || row.read_at != null;
    deep_link = row.action_url || '/admin/lgpd';
  } else if (source === 'manuia_inbox_notifications') {
    title = row.title || 'ManuIA';
    message = row.body || '';
    severity = _normalizeSeverity(row.severity || row.alert_level);
    read = row.read_at != null;
    deep_link = '/app/manutencao-ia';
  } else if (source === 'alerts') {
    title = row.title || row.type || 'Alerta';
    message = row.description || '';
    severity = _normalizeSeverity(row.severity);
    read = row.resolved === true;
    deep_link = '/app/insights';
  }

  return {
    id: _compositeId(source, row.id),
    source,
    title: String(title || '').slice(0, 200),
    message: String(message || '').slice(0, 4000),
    severity,
    created_at,
    read: !!read,
    origin_module,
    deep_link,
    raw_id: row.id
  };
}

async function _fetchAppNotifications(userId, companyId, fetchLimit) {
  const tables = await _existingTables();
  if (!tables.has('app_notifications')) return [];

  try {
    const r = await db.query(
      `
      SELECT id, text_content, communication_id, sent_at, read_at, created_at
      FROM app_notifications
      WHERE recipient_id = $1::uuid AND company_id = $2::uuid
      ORDER BY sent_at DESC NULLS LAST, id DESC
      LIMIT $3
      `,
      [userId, companyId, fetchLimit]
    );
    return (r.rows || []).map((row) => mapRowToDto('app_notifications', row));
  } catch (err) {
    if (err && err.code === '42P01') return [];
    if (String(err.message || '').includes('company_id')) {
      const r2 = await db.query(
        `
        SELECT id, text_content, communication_id, sent_at, read_at, created_at
        FROM app_notifications
        WHERE recipient_id = $1::uuid
        ORDER BY sent_at DESC NULLS LAST, id DESC
        LIMIT $2
        `,
        [userId, fetchLimit]
      );
      return (r2.rows || []).map((row) => mapRowToDto('app_notifications', row));
    }
    throw err;
  }
}

async function _fetchOperationalAlerts(companyId, fetchLimit) {
  const tables = await _existingTables();
  if (!tables.has('operational_alerts')) return [];

  const r = await db.query(
    `
    SELECT id, company_id, tipo_alerta, titulo, mensagem, severidade, source,
           resolvido, created_at
    FROM operational_alerts
    WHERE company_id = $1::uuid
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [companyId, fetchLimit]
  );
  return (r.rows || []).map((row) => mapRowToDto('operational_alerts', row));
}

async function _fetchDsrNotifications(userId, companyId, fetchLimit) {
  const tables = await _existingTables();
  if (!tables.has('notifications')) return [];

  const r = await db.query(
    `
    SELECT id, company_id, user_id, type, priority, title, message,
           read, read_at, action_url, created_at
    FROM notifications
    WHERE company_id = $1::uuid AND user_id = $2::uuid
      AND dismissed IS NOT TRUE
    ORDER BY created_at DESC
    LIMIT $3
    `,
    [companyId, userId, fetchLimit]
  );
  return (r.rows || []).map((row) => mapRowToDto('notifications', row));
}

async function _fetchManuiaInbox(userId, companyId, fetchLimit) {
  const tables = await _existingTables();
  if (!tables.has('manuia_inbox_notifications')) return [];

  const r = await db.query(
    `
    SELECT id, company_id, user_id, source, severity, alert_level, title, body,
           read_at, created_at
    FROM manuia_inbox_notifications
    WHERE company_id = $1::uuid AND user_id = $2::uuid
    ORDER BY created_at DESC
    LIMIT $3
    `,
    [companyId, userId, fetchLimit]
  );
  return (r.rows || []).map((row) => mapRowToDto('manuia_inbox_notifications', row));
}

async function _fetchAlerts(companyId, fetchLimit) {
  const tables = await _existingTables();
  if (!tables.has('alerts')) return [];

  const r = await db.query(
    `
    SELECT id, company_id, type, severity, title, description, resolved, created_at
    FROM alerts
    WHERE company_id = $1::uuid
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [companyId, fetchLimit]
  );
  return (r.rows || []).map((row) => mapRowToDto('alerts', row));
}

function _matchesCategory(item, category) {
  if (!category || category === 'todas') return true;
  const c = String(category).toLowerCase();
  if (c === 'sistema') return item.origin_module === 'sistema' && item.source === 'app_notifications';
  if (c === 'operacional') {
    return item.origin_module === 'operacional' ||
      item.source === 'operational_alerts' ||
      item.source === 'alerts';
  }
  if (c === 'billing') return item.origin_module === 'billing';
  if (c === 'manuia') return item.origin_module === 'manuia';
  if (c === 'dsr') return item.origin_module === 'dsr';
  if (c === 'tpm') return item.origin_module === 'tpm';
  return item.origin_module === c || item.source === c;
}

function _matchesFilters(item, opts) {
  if (opts.source && item.source !== opts.source) return false;
  if (opts.severity && _normalizeSeverity(item.severity) !== _normalizeSeverity(opts.severity)) {
    return false;
  }
  if (opts.unreadOnly && item.read) return false;
  if (opts.category && !_matchesCategory(item, opts.category)) return false;
  return true;
}

/**
 * @param {string} userId
 * @param {string} companyId
 * @param {{ limit?: number, offset?: number, source?: string, severity?: string, unread?: boolean, category?: string }} opts
 */
async function getUnifiedNotifications(userId, companyId, opts = {}) {
  const started = Date.now();
  _recordQuery();

  if (!isFederationEnabled()) {
    _recordLatency(Date.now() - started);
    return { notifications: [], total: 0, limit: 0, offset: 0, federation_enabled: false };
  }

  const limit = Math.min(50, Math.max(1, parseInt(String(opts.limit || 20), 10) || 20));
  const offset = Math.max(0, parseInt(String(opts.offset || 0), 10) || 0);
  const unreadOnly = opts.unread === true || opts.unreadOnly === true;
  const fetchLimit = Math.min(100, limit + offset + 20);

  const [app, operational, dsr, manuia, alerts] = await Promise.all([
    _fetchAppNotifications(userId, companyId, fetchLimit),
    _fetchOperationalAlerts(companyId, fetchLimit),
    _fetchDsrNotifications(userId, companyId, fetchLimit),
    _fetchManuiaInbox(userId, companyId, fetchLimit),
    _fetchAlerts(companyId, fetchLimit)
  ]);

  const merged = [...app, ...operational, ...dsr, ...manuia, ...alerts]
    .filter((item) => _matchesFilters(item, { ...opts, unreadOnly }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = merged.length;
  const page = merged.slice(offset, offset + limit);

  _recordResults(page.length);
  _recordLatency(Date.now() - started);

  return {
    notifications: page,
    total,
    limit,
    offset,
    federation_enabled: true
  };
}

/**
 * @param {string} [companyId]
 */
async function getFederationAuditStatus(companyId) {
  const enabled = isFederationEnabled();
  const tables = await _existingTables();
  const sources = FEDERATION_SOURCES.filter((s) => tables.has(s));

  let totalItems = 0;
  if (companyId) {
    for (const source of sources) {
      try {
        let q = '';
        let params = [companyId];
        if (source === 'app_notifications') {
          q = 'SELECT COUNT(*)::int AS n FROM app_notifications WHERE company_id = $1::uuid';
        } else if (source === 'operational_alerts') {
          q = 'SELECT COUNT(*)::int AS n FROM operational_alerts WHERE company_id = $1::uuid';
        } else if (source === 'notifications') {
          q = 'SELECT COUNT(*)::int AS n FROM notifications WHERE company_id = $1::uuid';
        } else if (source === 'manuia_inbox_notifications') {
          q = 'SELECT COUNT(*)::int AS n FROM manuia_inbox_notifications WHERE company_id = $1::uuid';
        } else if (source === 'alerts') {
          q = 'SELECT COUNT(*)::int AS n FROM alerts WHERE company_id = $1::uuid';
        }
        if (q) {
          const r = await db.query(q, params);
          totalItems += r.rows[0]?.n ?? 0;
        }
      } catch (_e) {
        /* skip missing column/table */
      }
    }
  }

  return {
    federation_enabled: enabled,
    sources,
    total_items: totalItems
  };
}

module.exports = {
  getUnifiedNotifications,
  getFederationAuditStatus,
  mapRowToDto,
  isFederationEnabled,
  resetTableCacheForTests,
  FEDERATION_SOURCES,
  CATEGORY_ALIASES,
  METRIC_QUERIES,
  METRIC_RESULTS,
  METRIC_LATENCY
};
