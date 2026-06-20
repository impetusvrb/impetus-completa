'use strict';

/**
 * NC-03-BRIDGE — espelha produtores legados para unifiedMessaging / Notification Center.
 * Aditivo: não remove App Impetus, alerts nem operational_alerts.
 */

const db = require('../db');
const { isValidUUID } = require('../utils/security');
const observability = require('./observabilityService');

const BRIDGE_ENABLED = String(process.env.NC_03_BRIDGE_ENABLED || 'true').toLowerCase() !== 'false';

const METRIC_OPERATIONAL = 'notification_bridge_operational_alerts';
const METRIC_TPM = 'notification_bridge_tpm';
const METRIC_PROACTIVE = 'notification_bridge_ai_proactive';
const METRIC_EXECUTIVE = 'notification_bridge_executive';

const BRIDGE_REGISTRY = Object.freeze({
  operational_alerts: true,
  tpm: true,
  ai_proactive: true,
  executive_mode: true
});

function recordBridgeMetric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

function isBridgeEnabled() {
  return BRIDGE_ENABLED;
}

/**
 * @param {string|undefined|null} severidade
 */
function isOperationalSeverityEligible(severidade) {
  const s = String(severidade || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\u0307/g, '')
    .replace(/[\u0300-\u036f]/g, '');
  return ['alta', 'high', 'critical', 'critica'].includes(s);
}

/**
 * @param {object} incident
 */
function isTpmIncidentCritical(incident) {
  if (!incident || typeof incident !== 'object') return false;
  const sev = String(incident.severity || incident.priority || '')
    .trim()
    .toLowerCase();
  if (['critical', 'high', 'alta', 'critica'].includes(sev)) return true;
  const total =
    (Number(incident.losses_before) || 0) +
    (Number(incident.losses_during) || 0) +
    (Number(incident.losses_after) || 0);
  const minLoss = parseInt(String(process.env.TPM_NC_CRITICAL_LOSSES_MIN || '10'), 10) || 10;
  return total >= minLoss;
}

/**
 * @param {string} [role]
 * @param {string} [jobTitle]
 */
function isExecutiveRoleEligible(role, jobTitle) {
  const r = String(role || '').trim().toLowerCase();
  const j = String(jobTitle || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (r === 'ceo') return true;
  if (r === 'diretor' && (j.includes('industrial') || j.includes('operac'))) return true;
  if (/diretor industrial|director industrial|director_industrial/.test(j)) return true;
  if (r === 'gerente' && j.includes('industrial')) return true;
  if (/gerente industrial|manager industrial/.test(j)) return true;
  return false;
}

function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

/**
 * @param {string} companyId
 * @param {number} [limit]
 */
async function findSupervisorNcRecipients(companyId, limit = 5) {
  const cid = companyId != null ? String(companyId).trim() : '';
  if (!cid) return [];
  try {
    const r = await db.query(
      `
      SELECT id FROM users
      WHERE company_id = $1::uuid
        AND active = true
        AND deleted_at IS NULL
        AND (
          hierarchy_level <= 2
          OR LOWER(COALESCE(role, '')) IN ('admin', 'manager', 'gerente', 'supervisor', 'ceo', 'diretor')
        )
      ORDER BY hierarchy_level ASC NULLS LAST, name ASC
      LIMIT $2
      `,
      [cid, Math.max(1, limit)]
    );
    return (r.rows || []).map((row) => row.id).filter((id) => isValidUUID(id));
  } catch (err) {
    console.warn('[notificationBridge][findSupervisorNcRecipients]', err?.message ?? err);
    return [];
  }
}

/**
 * @param {string} companyId
 * @param {string} phone
 */
async function resolveUserIdByPhone(companyId, phone) {
  const digits = normalizePhoneDigits(phone);
  if (digits.length < 10 || !companyId) return null;
  try {
    const r = await db.query(
      `
      SELECT id FROM users
      WHERE company_id = $1::uuid AND active = true AND deleted_at IS NULL
        AND (
          RIGHT(REPLACE(REPLACE(COALESCE(phone,''), ' ', ''), '-', ''), 11) = RIGHT($2, 11)
          OR RIGHT(REPLACE(REPLACE(COALESCE(whatsapp_number,''), ' ', ''), '-', ''), 11) = RIGHT($2, 11)
        )
      LIMIT 1
      `,
      [companyId, digits]
    );
    const id = r.rows?.[0]?.id;
    return isValidUUID(id) ? id : null;
  } catch (err) {
    console.warn('[notificationBridge][resolveUserIdByPhone]', err?.message ?? err);
    return null;
  }
}

/**
 * @param {string} companyId
 * @param {string} userId
 */
async function loadUserExecutiveEligibility(companyId, userId) {
  if (!isValidUUID(userId) || !companyId) return false;
  try {
    const r = await db.query(
      `
      SELECT role, job_title FROM users
      WHERE id = $1::uuid AND company_id = $2::uuid AND active = true AND deleted_at IS NULL
      LIMIT 1
      `,
      [userId, companyId]
    );
    const row = r.rows?.[0];
    if (!row) return false;
    return isExecutiveRoleEligible(row.role, row.job_title);
  } catch (err) {
    console.warn('[notificationBridge][loadUserExecutiveEligibility]', err?.message ?? err);
    return false;
  }
}

/**
 * @param {string} companyId
 * @param {string} userId
 * @param {string} message
 * @param {object} [opts]
 */
async function sendNcToUser(companyId, userId, message, opts = {}) {
  if (!isBridgeEnabled() || !companyId || !userId || !message) {
    return { ok: false, skipped: true };
  }
  try {
    const unifiedMessaging = require('./unifiedMessagingService');
    return unifiedMessaging.sendToUser(companyId, userId, String(message).slice(0, 4000), opts);
  } catch (err) {
    console.warn('[notificationBridge][sendNcToUser]', err?.message ?? err);
    return { ok: false, error: err?.message };
  }
}

/**
 * @param {string} companyId
 * @param {{ severidade?: string, titulo?: string, mensagem?: string, tipo_alerta?: string }} alert
 */
async function bridgeOperationalAlert(companyId, alert) {
  if (!isBridgeEnabled() || !alert) return { bridged: 0 };
  if (!isOperationalSeverityEligible(alert.severidade || alert.severity)) {
    return { bridged: 0, skipped: 'severity' };
  }

  const titulo = alert.titulo || alert.title || alert.tipo_alerta || 'Alerta operacional';
  const mensagem = alert.mensagem || alert.message || '';
  const text = `[Alerta operacional] ${titulo}${mensagem ? `\n${mensagem}` : ''}`.slice(0, 4000);

  const userIds = await findSupervisorNcRecipients(companyId);
  let bridged = 0;
  for (const uid of userIds) {
    const r = await sendNcToUser(companyId, uid, text, { type: 'operational_alert_bridge' });
    if (r.ok) bridged += 1;
  }
  if (bridged > 0) recordBridgeMetric(METRIC_OPERATIONAL, bridged);
  return { bridged };
}

/**
 * @param {string} companyId
 * @param {object} incident
 * @param {string} msg
 * @param {object[]} recipients
 */
async function bridgeTpmIncident(companyId, incident, msg, recipients = []) {
  if (!isBridgeEnabled() || !isTpmIncidentCritical(incident)) {
    return { bridged: 0, skipped: 'not_critical' };
  }

  let bridged = 0;
  const seen = new Set();
  for (const rec of recipients || []) {
    const uid = rec?.id;
    if (!isValidUUID(uid) || seen.has(uid)) continue;
    seen.add(uid);
    const r = await sendNcToUser(companyId, uid, msg, { type: 'tpm_bridge' });
    if (r.ok) bridged += 1;
  }

  if (bridged === 0) {
    const fallbackIds = await findSupervisorNcRecipients(companyId, 3);
    for (const uid of fallbackIds) {
      if (seen.has(uid)) continue;
      const r = await sendNcToUser(companyId, uid, msg, { type: 'tpm_bridge' });
      if (r.ok) bridged += 1;
    }
  }

  if (bridged > 0) recordBridgeMetric(METRIC_TPM, bridged);
  return { bridged };
}

/**
 * @param {string} companyId
 * @param {string|null|undefined} recipientUserId
 * @param {string|null|undefined} recipientPhone
 * @param {string} message
 */
async function bridgeProactiveMessage(companyId, recipientUserId, recipientPhone, message) {
  if (!isBridgeEnabled()) return { bridged: 0 };

  let uid = isValidUUID(recipientUserId) ? recipientUserId : null;
  if (!uid && recipientPhone) {
    uid = await resolveUserIdByPhone(companyId, recipientPhone);
  }
  if (!uid) return { bridged: 0, skipped: 'no_user_id' };

  const text = `[IA Proativa] ${String(message || '').slice(0, 3900)}`;
  const r = await sendNcToUser(companyId, uid, text, { type: 'ai_proactive_bridge' });
  if (r.ok) {
    recordBridgeMetric(METRIC_PROACTIVE);
    return { bridged: 1 };
  }
  return { bridged: 0 };
}

/**
 * @param {string} companyId
 * @param {string|null|undefined} recipientUserId
 * @param {string|null|undefined} recipientPhone
 * @param {string} message
 */
async function bridgeExecutiveMessage(companyId, recipientUserId, recipientPhone, message) {
  if (!isBridgeEnabled()) return { bridged: 0 };

  let uid = isValidUUID(recipientUserId) ? recipientUserId : null;
  if (!uid && recipientPhone) {
    uid = await resolveUserIdByPhone(companyId, recipientPhone);
  }
  if (!uid) return { bridged: 0, skipped: 'no_user_id' };

  const eligible = await loadUserExecutiveEligibility(companyId, uid);
  if (!eligible) return { bridged: 0, skipped: 'role' };

  const text = `[Modo Executivo] ${String(message || '').slice(0, 3900)}`;
  const r = await sendNcToUser(companyId, uid, text, { type: 'executive_bridge' });
  if (r.ok) {
    recordBridgeMetric(METRIC_EXECUTIVE);
    return { bridged: 1 };
  }
  return { bridged: 0 };
}

function getBridgeRegistry() {
  return { ...BRIDGE_REGISTRY, enabled: isBridgeEnabled() };
}

function getBridgeMetricsSnapshot() {
  const m = observability.getMetricsSnapshot();
  return {
    notification_bridge_operational_alerts: m[METRIC_OPERATIONAL] || 0,
    notification_bridge_tpm: m[METRIC_TPM] || 0,
    notification_bridge_ai_proactive: m[METRIC_PROACTIVE] || 0,
    notification_bridge_executive: m[METRIC_EXECUTIVE] || 0
  };
}

module.exports = {
  isBridgeEnabled,
  isOperationalSeverityEligible,
  isTpmIncidentCritical,
  isExecutiveRoleEligible,
  bridgeOperationalAlert,
  bridgeTpmIncident,
  bridgeProactiveMessage,
  bridgeExecutiveMessage,
  getBridgeRegistry,
  getBridgeMetricsSnapshot,
  METRIC_OPERATIONAL,
  METRIC_TPM,
  METRIC_PROACTIVE,
  METRIC_EXECUTIVE
};
