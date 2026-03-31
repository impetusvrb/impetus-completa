/**
 * Motor de despacho de eventos industriais para a inbox ManuIA (multi-destinatário, tenant-safe).
 * Ativo apenas com variáveis de ambiente explícitas — não altera comportamento legacy quando desligado.
 */
'use strict';

const recipientResolver = require('./manuiaRecipientResolverService');
const ingest = require('./manuiaInboxIngestService');

function dispatchEnabled() {
  return String(process.env.MANUIA_EVENT_DISPATCH_ENABLED || '').toLowerCase() === 'true';
}

function plcDispatchEnabled() {
  return (
    dispatchEnabled() &&
    String(process.env.MANUIA_DISPATCH_PLC || '').toLowerCase() === 'true'
  );
}

function warehouseDispatchEnabled() {
  return (
    dispatchEnabled() &&
    String(process.env.MANUIA_DISPATCH_WAREHOUSE || '').toLowerCase() === 'true'
  );
}

function logisticsDispatchEnabled() {
  return (
    dispatchEnabled() &&
    String(process.env.MANUIA_DISPATCH_LOGISTICS || '').toLowerCase() === 'true'
  );
}

function qualityDispatchEnabled() {
  return (
    dispatchEnabled() &&
    String(process.env.MANUIA_DISPATCH_QUALITY || '').toLowerCase() === 'true'
  );
}

function operationalAnomalyDispatchEnabled() {
  return (
    dispatchEnabled() &&
    String(process.env.MANUIA_DISPATCH_OPERATIONAL_ANOMALY || '').toLowerCase() === 'true'
  );
}

function escalationEnabled() {
  return String(process.env.MANUIA_ESCALATION_ON_BLOCK || '').toLowerCase() === 'true';
}

function isCriticalSeverity(sev) {
  const s = String(sev || '').toLowerCase();
  return s === 'critical' || s === 'critica' || s === 'high' || s === 'alta';
}

/**
 * Envia o mesmo evento a vários utilizadores de manutenção (fan-out com ingest individual + regras por utilizador).
 * @param {object} payload — mesmo contrato que ingest.ingestForUser, sem userId; pode incluir primaryUserId para priorizar
 */
async function dispatchToMaintenanceTeam(payload) {
  if (!dispatchEnabled()) {
    return { skipped: true, reason: 'MANUIA_EVENT_DISPATCH_ENABLED' };
  }
  const companyId = payload.companyId;
  if (!companyId || !payload.title) {
    throw new Error('dispatchToMaintenanceTeam: companyId e title obrigatórios');
  }

  const max = Math.min(parseInt(payload.maxRecipients, 10) || 25, 50);
  let ids = await recipientResolver.listMaintenanceUserIds(companyId, { limit: max });

  if (payload.primaryUserId) {
    const p = String(payload.primaryUserId);
    ids = [p, ...ids.filter((id) => id !== p)];
  }

  const seen = new Set();
  const unique = ids.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const { primaryUserId, maxRecipients, companyId: _c, ...ingestRest } = payload;
  const results = [];

  for (const userId of unique) {
    try {
      const one = await ingest.ingestForUser({ ...ingestRest, companyId, userId });
      results.push({ userId, ok: true, inboxId: one.row?.id });
      if (
        escalationEnabled() &&
        primaryUserId &&
        userId === String(primaryUserId) &&
        isCriticalSeverity(payload.severity) &&
        !one.decision?.delivery?.deliver
      ) {
        const sups = await recipientResolver.listSupervisorMaintenanceUserIds(companyId, {
          excludeUserId: userId,
          limit: 8
        });
        for (const supId of sups) {
          try {
            const esc = await ingest.ingestForUser({
              ...ingestRest,
              companyId,
              userId: supId,
              title: `[Escalado] ${String(ingestRest.title || '').slice(0, 450)}`,
              source: ingestRest.source ? `${ingestRest.source}_escalation` : 'escalation',
              payload: {
                ...(ingestRest.payload || {}),
                escalated_from_user_id: userId,
                escalation_reason: 'primary_blocked_or_off_hours'
              }
            });
            results.push({ userId: supId, ok: true, inboxId: esc.row?.id, escalation: true });
          } catch (e2) {
            results.push({ userId: supId, ok: false, error: e2.message, escalation: true });
          }
        }
      }
    } catch (e) {
      results.push({ userId, ok: false, error: e.message });
    }
  }

  return { dispatched: results.filter((r) => r.ok).length, results };
}

/**
 * Normaliza alerta PLC recém-criado para o pipeline ManuIA.
 */
/**
 * Agenda despacho assíncrono após commit de transação (evita bloquear INSERT e isola falhas).
 * @param {string} logTag — prefixo de log (ex.: [MANUIA_DISPATCH_WAREHOUSE])
 * @param {() => Promise<unknown>} fn
 */
function scheduleDispatch(logTag, fn) {
  setImmediate(() => {
    Promise.resolve(fn()).catch((e) => console.warn(logTag, e?.message || e));
  });
}

/**
 * Alerta de almoxarifado (warehouse_alerts) → inbox manutenção.
 */
async function dispatchFromWarehouseAlert(companyId, row) {
  if (!warehouseDispatchEnabled() || !row) {
    return { skipped: true };
  }
  const severity = row.severity || 'medium';
  const alertType = String(row.alert_type || 'alert').slice(0, 64);
  const title = row.title || 'Alerta de almoxarifado';
  const body = row.description || row.ai_analysis || null;
  let metrics = row.metrics;
  if (typeof metrics === 'string') {
    try {
      metrics = JSON.parse(metrics);
    } catch (_) {
      metrics = {};
    }
  }

  return dispatchToMaintenanceTeam({
    companyId,
    eventType: `warehouse_${alertType}`,
    severity,
    title: String(title).slice(0, 500),
    body: body != null ? String(body).slice(0, 3500) : null,
    source: 'warehouse',
    machineId: row.entity_id && String(row.entity_type || '').includes('equip') ? row.entity_id : null,
    payload: {
      warehouse_alert_id: row.id,
      material_id: row.material_id,
      alert_type: row.alert_type,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      metrics: metrics || {},
      ai_recommendations: row.ai_recommendations
    },
    requiresAck: isCriticalSeverity(severity)
  });
}

/**
 * Alerta logístico (logistics_alerts) → inbox manutenção.
 */
async function dispatchFromLogisticsAlert(companyId, row) {
  if (!logisticsDispatchEnabled() || !row) {
    return { skipped: true };
  }
  const severity = row.severity || 'medium';
  const alertType = String(row.alert_type || 'alert').slice(0, 64);
  const title = row.title || 'Alerta logístico';
  const body = row.description || row.ai_analysis || null;
  let metrics = row.metrics;
  if (typeof metrics === 'string') {
    try {
      metrics = JSON.parse(metrics);
    } catch (_) {
      metrics = {};
    }
  }

  const machineHint =
    row.vehicle_id || row.expedition_id || row.route_id || row.entity_id || null;

  return dispatchToMaintenanceTeam({
    companyId,
    eventType: `logistics_${alertType}`,
    severity,
    title: String(title).slice(0, 500),
    body: body != null ? String(body).slice(0, 3500) : null,
    source: 'logistics',
    machineId: machineHint,
    payload: {
      logistics_alert_id: row.id,
      alert_type: row.alert_type,
      expedition_id: row.expedition_id,
      vehicle_id: row.vehicle_id,
      route_id: row.route_id,
      driver_id: row.driver_id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      metrics: metrics || {}
    },
    requiresAck: isCriticalSeverity(severity)
  });
}

/**
 * Alerta de qualidade (quality_alerts) → inbox manutenção.
 */
async function dispatchFromQualityAlert(companyId, row) {
  if (!qualityDispatchEnabled() || !row) {
    return { skipped: true };
  }
  const severity = row.severity || 'medium';
  const alertType = String(row.alert_type || 'alert').slice(0, 64);
  const title = row.title || 'Alerta de qualidade';
  const body = row.description || row.ai_analysis || null;
  let metrics = row.metrics;
  if (typeof metrics === 'string') {
    try {
      metrics = JSON.parse(metrics);
    } catch (_) {
      metrics = {};
    }
  }

  return dispatchToMaintenanceTeam({
    companyId,
    eventType: `quality_${alertType}`,
    severity,
    title: String(title).slice(0, 500),
    body: body != null ? String(body).slice(0, 3500) : null,
    source: 'quality',
    machineId: row.entity_id || null,
    payload: {
      quality_alert_id: row.id,
      alert_type: row.alert_type,
      lot_number: row.lot_number,
      supplier_name: row.supplier_name,
      raw_material_id: row.raw_material_id,
      product_id: row.product_id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      metrics: metrics || {}
    },
    requiresAck: isCriticalSeverity(severity)
  });
}

/**
 * Linha em operational_anomalies (após INSERT) → inbox manutenção.
 */
async function dispatchFromOperationalAnomaly(companyId, row) {
  if (!operationalAnomalyDispatchEnabled() || !row) {
    return { skipped: true };
  }
  const severity = row.severity || 'medium';
  const anomalyType = String(row.anomaly_type || 'unknown').slice(0, 64);
  const title =
    row.entity_name ||
    `Anomalia operacional: ${anomalyType.replace(/_/g, ' ')}`;
  const body =
    row.ai_analysis ||
    (row.related_maintenance ? `Manutenção relacionada: ${row.related_maintenance}` : null) ||
    null;
  let raw = row.raw_data;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch (_) {
      raw = {};
    }
  }

  return dispatchToMaintenanceTeam({
    companyId,
    eventType: `ops_anomaly_${anomalyType}`,
    severity,
    title: String(title).slice(0, 500),
    body: body != null ? String(body).slice(0, 3500) : null,
    source: 'operational_anomaly',
    machineId: row.machine_identifier || row.entity_id || null,
    payload: {
      operational_anomaly_id: row.id,
      anomaly_type: row.anomaly_type,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      entity_name: row.entity_name,
      machine_identifier: row.machine_identifier,
      line_name: row.line_name,
      raw_data: raw || {}
    },
    requiresAck: isCriticalSeverity(severity)
  });
}

async function dispatchFromPlcAlert(companyId, alertRow, analysisHints = {}) {
  if (!plcDispatchEnabled()) {
    return { skipped: true };
  }
  const title = alertRow.title || analysisHints.alert_title || 'Alerta PLC';
  const body = alertRow.message || analysisHints.variation_description || '';
  const severity = alertRow.severity || analysisHints.severity || 'medium';

  const eventType = isCriticalSeverity(severity) ? 'plc_critical' : 'plc_variation';

  return dispatchToMaintenanceTeam({
    companyId,
    eventType,
    severity,
    title: String(title).slice(0, 500),
    body: String(body).slice(0, 3500),
    source: 'plc',
    machineId: alertRow.equipment_id || null,
    payload: {
      plc_alert_id: alertRow.id,
      analysis_id: alertRow.analysis_id,
      equipment_id: alertRow.equipment_id,
      machineName: alertRow.equipment_name,
      suggestion: analysisHints.recommendation || null
    },
    requiresAck: isCriticalSeverity(severity)
  });
}

/**
 * Notifica supervisores após ação manual de escalação no app.
 */
async function notifySupervisorsOnManualEscalation({
  companyId,
  originUserId,
  inboxNotificationId,
  title,
  body,
  note
}) {
  if (!dispatchEnabled()) {
    return { skipped: true };
  }
  const sups = await recipientResolver.listSupervisorMaintenanceUserIds(companyId, {
    excludeUserId: originUserId,
    limit: 12
  });
  const results = [];
  for (const supId of sups) {
    try {
      const r = await ingest.ingestForUser({
        companyId,
        userId: supId,
        eventType: 'manual_escalation',
        severity: 'urgent',
        title: `[Escalação] ${String(title || 'Alerta').slice(0, 400)}`,
        body: [body, note ? `Nota: ${note}` : null].filter(Boolean).join('\n').slice(0, 3500),
        source: 'manual_escalation',
        requiresAck: false,
        payload: {
          origin_user_id: originUserId,
          original_notification_id: inboxNotificationId
        }
      });
      results.push({ userId: supId, ok: true, inboxId: r.row?.id });
    } catch (e) {
      results.push({ userId: supId, ok: false, error: e.message });
    }
  }
  return { results };
}

module.exports = {
  dispatchEnabled,
  scheduleDispatch,
  dispatchToMaintenanceTeam,
  dispatchFromPlcAlert,
  dispatchFromWarehouseAlert,
  dispatchFromLogisticsAlert,
  dispatchFromQualityAlert,
  dispatchFromOperationalAnomaly,
  notifySupervisorsOnManualEscalation,
  warehouseDispatchEnabled,
  logisticsDispatchEnabled,
  qualityDispatchEnabled,
  operationalAnomalyDispatchEnabled
};
