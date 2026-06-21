'use strict';

/**
 * SST Notification Service — distribuição regulada com escalonamento ocupacional.
 * Non-blocking; não altera workflow, investigações ou indicadores SST.
 */

const db = require('../db');

const SST_NOTIFICATION_TYPES = Object.freeze({
  INCIDENT_CREATED: 'sst_incident_created',
  INCIDENT_CRITICAL: 'sst_incident_critical',
  NEAR_MISS: 'sst_near_miss',
  ACCIDENT_REPORTED: 'sst_accident_reported',
  TRAINING_EXPIRED: 'sst_training_expired',
  TRAINING_DUE: 'sst_training_due',
  AUDIT_DUE: 'sst_audit_due',
  AUDIT_OVERDUE: 'sst_audit_overdue',
  NON_COMPLIANCE: 'sst_non_compliance',
  EMERGENCY_EVENT: 'sst_emergency_event'
});

/** Escalonamento ocupacional — reutilizável em ESG/AIOI */
const SST_ESCALATION_LEVELS = Object.freeze({
  1: Object.freeze({
    level: 1,
    label: 'Supervisor',
    description: 'Supervisor operacional'
  }),
  2: Object.freeze({
    level: 2,
    label: 'Supervisor + SST',
    description: 'Supervisor + responsáveis SST'
  }),
  3: Object.freeze({
    level: 3,
    label: 'Supervisor + SST + Gestão',
    description: 'Inclui gestão (hierarchy <= 2)'
  }),
  4: Object.freeze({
    level: 4,
    label: 'Executive Mode',
    description: 'Escalonamento executivo (reutiliza bridge existente)',
    reuseExecutive: true
  })
});

/** @type {Record<string, object>} */
const LIFECYCLE_PHASE_CONFIG = Object.freeze({
  SST_INCIDENT_CREATED: Object.freeze({
    phase: 'SST_INCIDENT_CREATED',
    escalationLevel: 2,
    patterns: [/incident_created/, /sst_incident_created/, /incidente_criado/]
  }),
  SST_INCIDENT_CRITICAL: Object.freeze({
    phase: 'SST_INCIDENT_CRITICAL',
    escalationLevel: 4,
    patterns: [/incident_critical/, /critical/, /critico/, /fatal/]
  }),
  SST_NEAR_MISS: Object.freeze({
    phase: 'SST_NEAR_MISS',
    escalationLevel: 2,
    patterns: [/near_miss/, /quase_acidente/, /near-miss/]
  }),
  SST_ACCIDENT_REPORTED: Object.freeze({
    phase: 'SST_ACCIDENT_REPORTED',
    escalationLevel: 3,
    patterns: [/accident_reported/, /acidente/, /cat/, /accident/]
  }),
  SST_TRAINING_EXPIRED: Object.freeze({
    phase: 'SST_TRAINING_EXPIRED',
    escalationLevel: 2,
    patterns: [/training_expired/, /treinamento_vencido/]
  }),
  SST_TRAINING_DUE: Object.freeze({
    phase: 'SST_TRAINING_DUE',
    escalationLevel: 1,
    patterns: [/training_due/, /treinamento_vencendo/]
  }),
  SST_AUDIT_DUE: Object.freeze({
    phase: 'SST_AUDIT_DUE',
    escalationLevel: 2,
    patterns: [/audit_due/, /auditoria_programada/]
  }),
  SST_AUDIT_OVERDUE: Object.freeze({
    phase: 'SST_AUDIT_OVERDUE',
    escalationLevel: 3,
    patterns: [/audit_overdue/, /auditoria_atrasada/]
  }),
  SST_NON_COMPLIANCE: Object.freeze({
    phase: 'SST_NON_COMPLIANCE',
    escalationLevel: 3,
    patterns: [/non_compliance/, /nao_conformidade/, /nc_sst/]
  }),
  SST_EMERGENCY_EVENT: Object.freeze({
    phase: 'SST_EMERGENCY_EVENT',
    escalationLevel: 4,
    patterns: [/emergency/, /emergencia/, /evacuacao/]
  })
});

function _log(event, data) {
  try {
    console.info(
      '[SST_NOTIFICATION]',
      JSON.stringify({ _type: 'sst_notification', event, ts: new Date().toISOString(), ...data })
    );
  } catch {
    /* never throw */
  }
}

function mapEventTypeToLifecyclePhase(eventType, severity) {
  const et = String(eventType || '').toLowerCase();
  for (const cfg of Object.values(LIFECYCLE_PHASE_CONFIG)) {
    if (cfg.patterns.some((p) => p.test(et))) {
      return cfg.phase;
    }
  }
  const sev = String(severity || 'medium').toLowerCase();
  if (sev === 'critical' || sev === 'critica') return 'SST_INCIDENT_CRITICAL';
  if (et.includes('near') || et.includes('quase')) return 'SST_NEAR_MISS';
  if (et.includes('training') || et.includes('treinamento')) return 'SST_TRAINING_DUE';
  if (et.includes('audit') || et.includes('auditoria')) return 'SST_AUDIT_DUE';
  if (et.includes('emergency') || et.includes('emergencia')) return 'SST_EMERGENCY_EVENT';
  if (et.includes('accident') || et.includes('acidente')) return 'SST_ACCIDENT_REPORTED';
  return 'SST_INCIDENT_CREATED';
}

function resolveEscalationLevel(lifecyclePhase, severity) {
  const cfg = LIFECYCLE_PHASE_CONFIG[lifecyclePhase];
  let level = cfg?.escalationLevel || 2;
  const sev = String(severity || '').toLowerCase();
  if (sev === 'critical' || sev === 'critica' || sev === 'alta') {
    level = Math.max(level, 3);
  }
  if (sev === 'critical' && (lifecyclePhase.includes('CRITICAL') || lifecyclePhase.includes('EMERGENCY'))) {
    level = 4;
  }
  return Math.min(4, Math.max(1, level));
}

/**
 * Classifica alerta operacional como SST para roteamento EG-11B.
 * @param {object} alert
 */
function isSstOperationalAlert(alert) {
  const tipo = String(alert?.tipo_alerta || '').toLowerCase();
  const src = String(alert?.source || '').toLowerCase();
  const titulo = String(alert?.titulo || alert?.title || '').toLowerCase();

  if (tipo.startsWith('sst_') || tipo.startsWith('safety_')) return true;
  if (src.includes('safety') || src.includes('sst') || src.includes('seguranca')) return true;
  if (/incident|near_miss|acidente|emergency|emergencia|apr|pt_|loto|epi|cat|evacu/.test(tipo)) {
    return true;
  }
  if (/sst|seguranca|acidente|near.?miss|emergencia/.test(titulo)) return true;
  return false;
}

function _mapOperationalSeverity(sev) {
  const s = String(sev || 'media').toLowerCase();
  if (s === 'alta' || s === 'high' || s === 'critical' || s === 'critica') return 'high';
  if (s === 'baixa' || s === 'low') return 'low';
  return 'medium';
}

/**
 * Resolve destinatários por nível de escalonamento SST.
 * @param {string} companyId
 * @param {number} escalationLevel
 * @returns {Promise<string[]>}
 */
async function resolveRecipientsByEscalation(companyId, escalationLevel) {
  const level = Math.min(4, Math.max(1, Number(escalationLevel) || 1));
  const ids = new Set();

  try {
    if (level >= 1) {
      const sup = await db.query(
        `SELECT id FROM users
         WHERE company_id = $1 AND active = true AND deleted_at IS NULL
         AND hierarchy_level <= 3`,
        [companyId]
      );
      for (const row of sup.rows || []) ids.add(String(row.id));
    }

    if (level >= 2) {
      const sst = await db.query(
        `SELECT id FROM users
         WHERE company_id = $1 AND active = true AND deleted_at IS NULL
         AND (
           LOWER(COALESCE(functional_area, '')) IN ('safety', 'seguranca', 'sst', 'ehs')
           OR LOWER(COALESCE(role, '')) LIKE '%seguranca%'
           OR LOWER(COALESCE(role, '')) LIKE '%sst%'
           OR LOWER(COALESCE(job_title, '')) LIKE '%seguranca%'
         )`,
        [companyId]
      );
      for (const row of sst.rows || []) ids.add(String(row.id));
    }

    if (level >= 3) {
      const mgmt = await db.query(
        `SELECT id FROM users
         WHERE company_id = $1 AND active = true AND deleted_at IS NULL
         AND hierarchy_level <= 2`,
        [companyId]
      );
      for (const row of mgmt.rows || []) ids.add(String(row.id));
    }

    if (level >= 4) {
      const notificationBridge = require('./notificationBridgeService');
      const execIds = await notificationBridge.findSupervisorNcRecipients(companyId, 12);
      for (const uid of execIds || []) ids.add(String(uid));

      try {
        const execMode = require('./executiveMode');
        if (typeof execMode.loadUserExecutiveEligibility === 'function') {
          const eligible = await db.query(
            `SELECT id FROM users
             WHERE company_id = $1 AND active = true AND deleted_at IS NULL
             AND hierarchy_level <= 1`,
            [companyId]
          );
          for (const row of eligible.rows || []) ids.add(String(row.id));
        }
      } catch {
        /* executive helpers optional */
      }
    }
  } catch (err) {
    console.warn('[SST_NOTIFICATION][resolveRecipients]', err?.message ?? err);
  }

  return [...ids];
}

/**
 * Execução legada — NC via unifiedMessaging + escalonamento.
 * @param {object} input
 */
async function executeLegacyDistribution(input) {
  const companyId = input.companyId;
  if (!companyId) return { ok: false, reason: 'missing_companyId' };

  const lifecyclePhase =
    input.lifecyclePhase || mapEventTypeToLifecyclePhase(input.eventType, input.severity);
  const escalationLevel =
    input.escalationLevel ?? resolveEscalationLevel(lifecyclePhase, input.severity);
  const title = String(input.title || 'Alerta SST').slice(0, 500);
  const message = String(input.message || input.body || title).slice(0, 3800);
  const prefix = escalationLevel >= 4 ? '[SST CRÍTICO] ' : escalationLevel >= 3 ? '[SST] ' : '';
  const fullMessage = `${prefix}${title}\n\n${message}`.trim();

  const recipientIds =
    input.recipientUserIds?.length > 0
      ? input.recipientUserIds
      : await resolveRecipientsByEscalation(companyId, escalationLevel);

  if (!recipientIds.length) {
    return { ok: false, reason: 'no_recipients', escalationLevel };
  }

  const unifiedMessaging = require('./unifiedMessagingService');
  let sent = 0;

  for (const userId of recipientIds) {
    try {
      const result = await unifiedMessaging.sendToUser(companyId, userId, fullMessage, {
        type: escalationLevel >= 4 ? 'critical' : 'warning'
      });
      if (result?.ok) sent += 1;
    } catch (err) {
      console.warn('[SST_NOTIFICATION][legacy_send]', userId, err?.message ?? err);
    }
  }

  if (escalationLevel >= 4 && SST_ESCALATION_LEVELS[4].reuseExecutive) {
    try {
      const notificationBridge = require('./notificationBridgeService');
      const execIds = await notificationBridge.findSupervisorNcRecipients(companyId, 12);
      for (const userId of execIds || []) {
        await notificationBridge.bridgeExecutiveMessage(companyId, userId, null, fullMessage);
      }
    } catch (err) {
      console.warn('[SST_NOTIFICATION][executive_bridge]', err?.message ?? err);
    }
  }

  _log('legacy_sent', { companyId, sent, total: recipientIds.length, escalationLevel });
  return {
    ok: sent > 0,
    sent,
    total: recipientIds.length,
    escalationLevel,
    lifecyclePhase
  };
}

/**
 * EG-11B — delega distribuição ao adapter (shadow/migrado) com fallback legado.
 * @param {object} params
 */
async function _dispatchSstNotify(params) {
  try {
    const adapter = require('./governanceAdapters/sstGovernanceAdapter');
    const dispatch = await adapter.dispatchSstNotification(params);
    if (dispatch.mode === 'governance' && dispatch.distribution?.success) {
      return { ok: true, mode: 'governance' };
    }
    if (dispatch.useLegacy !== false) {
      return adapter.runLegacyDistribution(params);
    }
    return { ok: false, reason: dispatch.reason || 'dispatch_failed' };
  } catch (err) {
    console.warn('[SST_NOTIFICATION][governance_dispatch]', err?.message ?? err);
    try {
      const adapter = require('./governanceAdapters/sstGovernanceAdapter');
      return adapter.runLegacyDistribution(params);
    } catch (fallbackErr) {
      console.error('[SST_NOTIFICATION][legacy_fallback]', fallbackErr?.message ?? fallbackErr);
      return { ok: false, error: fallbackErr?.message };
    }
  }
}

/**
 * Notificação SST — ponto central de distribuição.
 * @param {object} params
 */
async function notify(params) {
  const {
    companyId,
    eventType,
    severity,
    title,
    message,
    body,
    incidentId,
    recipientUserIds,
    lifecyclePhase,
    escalationLevel
  } = params;

  if (!companyId || (!title && !message && !body)) {
    _log('notify_skip', { reason: 'missing_params', companyId });
    return { ok: false, reason: 'missing_params' };
  }

  const result = await _dispatchSstNotify({
    companyId,
    eventType: eventType || SST_NOTIFICATION_TYPES.INCIDENT_CREATED,
    severity: severity || 'medium',
    title,
    message: message || body,
    incidentId,
    recipientUserIds,
    lifecyclePhase,
    escalationLevel
  });

  if (result.ok) {
    _log('notify_sent', { companyId, eventType, escalationLevel: result.escalationLevel });
  }

  return result;
}

/**
 * Despacho a partir de alerta operacional classificado como SST.
 * @param {string} companyId
 * @param {object} alert
 */
async function dispatchFromOperationalAlert(companyId, alert) {
  const eventType = `sst_${String(alert.tipo_alerta || 'operational').replace(/[^a-z0-9_]/gi, '_')}`;
  return notify({
    companyId,
    eventType,
    severity: _mapOperationalSeverity(alert.severidade || alert.severity),
    title: alert.titulo || alert.title || 'Alerta SST',
    message: alert.mensagem || alert.message || '',
    tipo_alerta: alert.tipo_alerta,
    source: alert.source || 'operational_alerts'
  });
}

module.exports = {
  SST_NOTIFICATION_TYPES,
  SST_ESCALATION_LEVELS,
  LIFECYCLE_PHASE_CONFIG,
  mapEventTypeToLifecyclePhase,
  resolveEscalationLevel,
  isSstOperationalAlert,
  resolveRecipientsByEscalation,
  executeLegacyDistribution,
  notify,
  dispatchFromOperationalAlert
};
