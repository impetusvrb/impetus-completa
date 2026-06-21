'use strict';

/**
 * ESG Notification Service — distribuição regulada com escalonamento corporativo.
 * Non-blocking; não altera indicadores, inventários, medições ou compliance ESG.
 */

const db = require('../db');

const ESG_NOTIFICATION_TYPES = Object.freeze({
  EMISSION_THRESHOLD: 'esg_emission_threshold',
  WASTE_THRESHOLD: 'esg_waste_threshold',
  ENERGY_THRESHOLD: 'esg_energy_threshold',
  WATER_THRESHOLD: 'esg_water_threshold',
  COMPLIANCE_RISK: 'esg_compliance_risk',
  AUDIT_DUE: 'esg_audit_due',
  AUDIT_OVERDUE: 'esg_audit_overdue',
  SUSTAINABILITY_ALERT: 'esg_sustainability_alert',
  ENVIRONMENTAL_INCIDENT: 'esg_environmental_incident'
});

/** Escalonamento corporativo — modelo reutilizado de SST (EG-11B) */
const ESG_ESCALATION_LEVELS = Object.freeze({
  1: Object.freeze({
    level: 1,
    label: 'Supervisor',
    description: 'Supervisor operacional'
  }),
  2: Object.freeze({
    level: 2,
    label: 'Supervisor + ESG',
    description: 'Supervisor + responsáveis ESG/ambientais'
  }),
  3: Object.freeze({
    level: 3,
    label: 'Supervisor + ESG + Gestão',
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
  ESG_EMISSION_THRESHOLD: Object.freeze({
    phase: 'ESG_EMISSION_THRESHOLD',
    escalationLevel: 2,
    patterns: [/emission/, /emissao/, /emissão/, /carbon/, /carbono/, /co2/]
  }),
  ESG_WASTE_THRESHOLD: Object.freeze({
    phase: 'ESG_WASTE_THRESHOLD',
    escalationLevel: 2,
    patterns: [/waste/, /residuo/, /resíduo/, /residuo/]
  }),
  ESG_ENERGY_THRESHOLD: Object.freeze({
    phase: 'ESG_ENERGY_THRESHOLD',
    escalationLevel: 2,
    patterns: [/energy/, /energia/, /consumo_energia/]
  }),
  ESG_WATER_THRESHOLD: Object.freeze({
    phase: 'ESG_WATER_THRESHOLD',
    escalationLevel: 2,
    patterns: [/water/, /agua/, /água/, /effluent/, /efluente/]
  }),
  ESG_COMPLIANCE_RISK: Object.freeze({
    phase: 'ESG_COMPLIANCE_RISK',
    escalationLevel: 3,
    patterns: [/compliance/, /conformidade/, /nao_conformidade/, /non_compliance/, /regulatory/]
  }),
  ESG_AUDIT_DUE: Object.freeze({
    phase: 'ESG_AUDIT_DUE',
    escalationLevel: 2,
    patterns: [/audit_due/, /auditoria_programada/, /esg_audit_due/]
  }),
  ESG_AUDIT_OVERDUE: Object.freeze({
    phase: 'ESG_AUDIT_OVERDUE',
    escalationLevel: 3,
    patterns: [/audit_overdue/, /auditoria_atrasada/, /esg_audit_overdue/]
  }),
  ESG_SUSTAINABILITY_ALERT: Object.freeze({
    phase: 'ESG_SUSTAINABILITY_ALERT',
    escalationLevel: 2,
    patterns: [/sustainability/, /sustentabil/, /esg_score/, /esg_alert/]
  }),
  ESG_ENVIRONMENTAL_INCIDENT: Object.freeze({
    phase: 'ESG_ENVIRONMENTAL_INCIDENT',
    escalationLevel: 4,
    patterns: [/environmental_incident/, /incident_opened/, /incidente_ambiental/, /environmental_alert/]
  })
});

function _log(event, data) {
  try {
    console.info(
      '[ESG_NOTIFICATION]',
      JSON.stringify({ _type: 'esg_notification', event, ts: new Date().toISOString(), ...data })
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
  if (sev === 'critical' || sev === 'critica') return 'ESG_ENVIRONMENTAL_INCIDENT';
  if (et.includes('emission') || et.includes('emissao')) return 'ESG_EMISSION_THRESHOLD';
  if (et.includes('waste') || et.includes('residuo')) return 'ESG_WASTE_THRESHOLD';
  if (et.includes('energy') || et.includes('energia')) return 'ESG_ENERGY_THRESHOLD';
  if (et.includes('water') || et.includes('agua')) return 'ESG_WATER_THRESHOLD';
  if (et.includes('audit') || et.includes('auditoria')) return 'ESG_AUDIT_DUE';
  if (et.includes('compliance') || et.includes('conformidade')) return 'ESG_COMPLIANCE_RISK';
  if (et.includes('sustainability') || et.includes('sustentabil')) return 'ESG_SUSTAINABILITY_ALERT';
  return 'ESG_SUSTAINABILITY_ALERT';
}

function resolveEscalationLevel(lifecyclePhase, severity) {
  const cfg = LIFECYCLE_PHASE_CONFIG[lifecyclePhase];
  let level = cfg?.escalationLevel || 2;
  const sev = String(severity || '').toLowerCase();
  if (sev === 'critical' || sev === 'critica' || sev === 'alta' || sev === 'high') {
    level = Math.max(level, 3);
  }
  if (
    sev === 'critical' &&
    (lifecyclePhase.includes('INCIDENT') || lifecyclePhase.includes('COMPLIANCE'))
  ) {
    level = 4;
  }
  return Math.min(4, Math.max(1, level));
}

/**
 * Classifica alerta operacional como ESG para roteamento EG-11C.
 * @param {object} alert
 */
function isEsgOperationalAlert(alert) {
  const tipo = String(alert?.tipo_alerta || '').toLowerCase();
  const src = String(alert?.source || '').toLowerCase();
  const titulo = String(alert?.titulo || alert?.title || '').toLowerCase();

  if (tipo.startsWith('esg_') || tipo.startsWith('environment_') || tipo.startsWith('environmental_')) {
    return true;
  }
  if (
    src.includes('environment') ||
    src.includes('esg') ||
    src.includes('sustainability') ||
    src.includes('ambiental')
  ) {
    return true;
  }
  if (
    /emission|emissao|emissão|waste|residuo|resíduo|energy|energia|water|agua|água|carbon|carbono|esg|ambient|sustentabil|effluent|efluente|environmental/.test(
      tipo
    )
  ) {
    return true;
  }
  if (/esg|ambient|emiss|carbon|resíduo|residuo|sustentabil|conformidade ambient/.test(titulo)) {
    return true;
  }
  return false;
}

function _mapOperationalSeverity(sev) {
  const s = String(sev || 'media').toLowerCase();
  if (s === 'alta' || s === 'high' || s === 'critical' || s === 'critica') return 'high';
  if (s === 'baixa' || s === 'low') return 'low';
  return 'medium';
}

/**
 * Resolve destinatários por nível de escalonamento ESG.
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
      const esg = await db.query(
        `SELECT id FROM users
         WHERE company_id = $1 AND active = true AND deleted_at IS NULL
         AND (
           LOWER(COALESCE(functional_area, '')) IN ('environment', 'esg', 'sustainability', 'ambiental', 'ehs')
           OR LOWER(COALESCE(role, '')) LIKE '%esg%'
           OR LOWER(COALESCE(role, '')) LIKE '%ambient%'
           OR LOWER(COALESCE(role, '')) LIKE '%sustentab%'
           OR LOWER(COALESCE(job_title, '')) LIKE '%esg%'
           OR LOWER(COALESCE(job_title, '')) LIKE '%ambient%'
         )`,
        [companyId]
      );
      for (const row of esg.rows || []) ids.add(String(row.id));
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
        const eligible = await db.query(
          `SELECT id FROM users
           WHERE company_id = $1 AND active = true AND deleted_at IS NULL
           AND hierarchy_level <= 1`,
          [companyId]
        );
        for (const row of eligible.rows || []) ids.add(String(row.id));
      } catch {
        /* optional */
      }
    }
  } catch (err) {
    console.warn('[ESG_NOTIFICATION][resolveRecipients]', err?.message ?? err);
  }

  return [...ids];
}

/**
 * Execução legada — NC via unifiedMessaging + escalonamento ESG.
 * @param {object} input
 */
async function executeLegacyDistribution(input) {
  const companyId = input.companyId;
  if (!companyId) return { ok: false, reason: 'missing_companyId' };

  const lifecyclePhase =
    input.lifecyclePhase || mapEventTypeToLifecyclePhase(input.eventType, input.severity);
  const escalationLevel =
    input.escalationLevel ?? resolveEscalationLevel(lifecyclePhase, input.severity);
  const title = String(input.title || 'Alerta ESG').slice(0, 500);
  const message = String(input.message || input.body || title).slice(0, 3800);
  const prefix = escalationLevel >= 4 ? '[ESG CRÍTICO] ' : escalationLevel >= 3 ? '[ESG] ' : '';
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
      console.warn('[ESG_NOTIFICATION][legacy_send]', userId, err?.message ?? err);
    }
  }

  if (escalationLevel >= 4 && ESG_ESCALATION_LEVELS[4].reuseExecutive) {
    try {
      const notificationBridge = require('./notificationBridgeService');
      const execIds = await notificationBridge.findSupervisorNcRecipients(companyId, 12);
      for (const userId of execIds || []) {
        await notificationBridge.bridgeExecutiveMessage(companyId, userId, null, fullMessage);
      }
    } catch (err) {
      console.warn('[ESG_NOTIFICATION][executive_bridge]', err?.message ?? err);
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
 * EG-11C — delega distribuição ao adapter (shadow/migrado) com fallback legado.
 * @param {object} params
 */
async function _dispatchEsgNotify(params) {
  try {
    const adapter = require('./governanceAdapters/esgGovernanceAdapter');
    const dispatch = await adapter.dispatchEsgNotification(params);
    if (dispatch.mode === 'governance' && dispatch.distribution?.success) {
      return { ok: true, mode: 'governance' };
    }
    if (dispatch.useLegacy !== false) {
      return adapter.runLegacyDistribution(params);
    }
    return { ok: false, reason: dispatch.reason || 'dispatch_failed' };
  } catch (err) {
    console.warn('[ESG_NOTIFICATION][governance_dispatch]', err?.message ?? err);
    try {
      const adapter = require('./governanceAdapters/esgGovernanceAdapter');
      return adapter.runLegacyDistribution(params);
    } catch (fallbackErr) {
      console.error('[ESG_NOTIFICATION][legacy_fallback]', fallbackErr?.message ?? fallbackErr);
      return { ok: false, error: fallbackErr?.message };
    }
  }
}

/**
 * Notificação ESG — ponto central de distribuição.
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
    recipientUserIds,
    lifecyclePhase,
    escalationLevel
  } = params;

  if (!companyId || (!title && !message && !body)) {
    _log('notify_skip', { reason: 'missing_params', companyId });
    return { ok: false, reason: 'missing_params' };
  }

  const result = await _dispatchEsgNotify({
    companyId,
    eventType: eventType || ESG_NOTIFICATION_TYPES.SUSTAINABILITY_ALERT,
    severity: severity || 'medium',
    title,
    message: message || body,
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
 * Despacho a partir de alerta operacional classificado como ESG.
 * @param {string} companyId
 * @param {object} alert
 */
async function dispatchFromOperationalAlert(companyId, alert) {
  const eventType = `esg_${String(alert.tipo_alerta || 'operational').replace(/[^a-z0-9_]/gi, '_')}`;
  return notify({
    companyId,
    eventType,
    severity: _mapOperationalSeverity(alert.severidade || alert.severity),
    title: alert.titulo || alert.title || 'Alerta ESG',
    message: alert.mensagem || alert.message || '',
    tipo_alerta: alert.tipo_alerta,
    source: alert.source || 'operational_alerts'
  });
}

module.exports = {
  ESG_NOTIFICATION_TYPES,
  ESG_ESCALATION_LEVELS,
  LIFECYCLE_PHASE_CONFIG,
  mapEventTypeToLifecyclePhase,
  resolveEscalationLevel,
  isEsgOperationalAlert,
  resolveRecipientsByEscalation,
  executeLegacyDistribution,
  notify,
  dispatchFromOperationalAlert
};
