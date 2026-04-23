'use strict';

/**
 * Ciclo de vida de dados: retenção, expurgo e anonimização em background.
 * Expurgo respeita FK (incidentes): remove apenas traces elegíveis ou minimiza payload in-place.
 */

const db = require('../db');

const DEFAULT_RETENTION = {
  trace: Math.min(365, Math.max(7, parseInt(process.env.DATA_RETENTION_TRACE_DAYS || '30', 10))),
  audit_logs: Math.min(730, Math.max(30, parseInt(process.env.DATA_RETENTION_AUDIT_LOG_DAYS || '90', 10))),
  sensitive_data: parseInt(process.env.DATA_RETENTION_SENSITIVE_DAYS || '0', 10)
};

let lastRunStats = {
  at: null,
  traces_deleted: 0,
  traces_anonymized: 0,
  audit_logs_deleted: 0,
  errors: []
};

function getRetentionPolicy() {
  return {
    retention_policy: {
      trace: DEFAULT_RETENTION.trace,
      audit_logs: DEFAULT_RETENTION.audit_logs,
      sensitive_data: DEFAULT_RETENTION.sensitive_data
    }
  };
}

function mergePolicyRetention(policyRules) {
  const base = getRetentionPolicy().retention_policy;
  if (!policyRules || typeof policyRules !== 'object') return base;
  const out = { ...base };
  const t = policyRules.data_retention_trace_days;
  const a = policyRules.data_retention_audit_days;
  if (t != null && Number.isFinite(Number(t))) {
    out.trace = Math.min(365, Math.max(7, Math.floor(Number(t))));
  }
  if (a != null && Number.isFinite(Number(a))) {
    out.audit_logs = Math.min(730, Math.max(30, Math.floor(Number(a))));
  }
  if (policyRules.data_retention_sensitive_days != null && Number.isFinite(Number(policyRules.data_retention_sensitive_days))) {
    out.sensitive_data = Math.max(0, Math.floor(Number(policyRules.data_retention_sensitive_days)));
  }
  return out;
}

function getLastRunStats() {
  return { ...lastRunStats, retention_policy: getRetentionPolicy().retention_policy };
}

/**
 * Executa um ciclo de retenção (chamado por cron; não bloquear request HTTP).
 * @param {object} [opts]
 * @param {object} [opts.policyOverride] — retenção efetiva opcional (admin)
 */
async function runRetentionCycle(opts = {}) {
  const policy = opts.policyOverride || getRetentionPolicy().retention_policy;
  const errors = [];
  let traces_deleted = 0;
  let traces_anonymized = 0;
  let audit_logs_deleted = 0;

  const traceCutoffDays = policy.trace;
  const auditCutoffDays = policy.audit_logs;

  try {
    const delTr = await db.query(
      `
      DELETE FROM ai_interaction_traces t
      WHERE t.created_at < now() - ($1::int * interval '1 day')
        AND NOT EXISTS (SELECT 1 FROM ai_incidents i WHERE i.trace_id = t.trace_id)
      `,
      [traceCutoffDays]
    );
    traces_deleted = delTr.rowCount || 0;
  } catch (e) {
    errors.push(`traces_delete: ${e.message || e}`);
  }

  try {
    const anonRes = await db.query(
      `
      UPDATE ai_interaction_traces t
      SET
        input_payload = jsonb_build_object('_lifecycle', 'minimized', '_at', to_jsonb(now())),
        output_response = jsonb_build_object('_lifecycle', 'minimized', '_at', to_jsonb(now())),
        model_info = COALESCE(t.model_info, '{}'::jsonb) || jsonb_build_object('lifecycle_redacted', true, 'lifecycle_redacted_at', to_jsonb(now()))
      WHERE t.created_at < now() - ($1::int * interval '1 day')
        AND EXISTS (SELECT 1 FROM ai_incidents i WHERE i.trace_id = t.trace_id)
        AND (t.model_info->>'lifecycle_redacted') IS DISTINCT FROM 'true'
      `,
      [traceCutoffDays]
    );
    traces_anonymized = anonRes.rowCount || 0;
  } catch (e) {
    errors.push(`traces_anonymize: ${e.message || e}`);
  }

  try {
    const delAu = await db.query(
      `DELETE FROM ai_legal_audit_logs WHERE created_at < now() - ($1::int * interval '1 day')`,
      [auditCutoffDays]
    );
    audit_logs_deleted = delAu.rowCount || 0;
  } catch (e) {
    errors.push(`audit_logs_delete: ${e.message || e}`);
  }

  lastRunStats = {
    at: new Date().toISOString(),
    traces_deleted,
    traces_anonymized,
    audit_logs_deleted,
    errors
  };

  return lastRunStats;
}

function computeRegulatoryAlerts(policy) {
  const alerts = [];
  const st = lastRunStats;
  if (st.errors && st.errors.length) {
    alerts.push({
      code: 'LIFECYCLE_JOB_ERROR',
      severity: 'HIGH',
      message: 'Falha parcial no job de ciclo de vida de dados.'
    });
  }
  if (policy.sensitive_data === 0) {
    alerts.push({
      code: 'SENSITIVE_IMMEDIATE_ANONYMIZATION_POLICY',
      severity: 'INFO',
      message: 'Política ativa: dados sensíveis com retenção zero — anonimização prioritária na camada de conformidade.'
    });
  }
  return alerts;
}

module.exports = {
  getRetentionPolicy,
  mergePolicyRetention,
  runRetentionCycle,
  getLastRunStats,
  computeRegulatoryAlerts,
  DEFAULT_RETENTION
};
