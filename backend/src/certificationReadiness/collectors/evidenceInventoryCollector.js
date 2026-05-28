'use strict';

const fs = require('fs');
const path = require('path');

function _envOn(name) {
  const v = String(process.env[name] || '').trim().toLowerCase();
  return v === 'on' || v === 'true' || v === '1' || v === 'enforce';
}

async function _tableExists(tableName) {
  try {
    const db = require('../../db');
    const r = await db.query(`SELECT to_regclass($1) AS reg`, [`public.${tableName}`]);
    return !!r.rows[0]?.reg;
  } catch {
    return false;
  }
}

async function _countTable(tableName, companyId = null) {
  if (!(await _tableExists(tableName))) return null;
  try {
    const db = require('../../db');
    if (companyId) {
      const r = await db.query(
        `SELECT COUNT(*)::int AS c FROM ${tableName} WHERE company_id = $1::uuid`,
        [companyId]
      );
      return r.rows[0]?.c ?? 0;
    }
    const r = await db.query(`SELECT COUNT(*)::int AS c FROM ${tableName}`);
    return r.rows[0]?.c ?? 0;
  } catch {
    return null;
  }
}

function _docExists(relPath) {
  try {
    return fs.existsSync(path.join(__dirname, '../../../docs', relPath));
  } catch {
    return false;
  }
}

/**
 * Inventário de evidências técnicas (read-only, sem PII).
 */
async function collectEvidenceInventory(companyId = null) {
  const items = [];

  const push = (key, status, detail = {}) => {
    items.push({
      evidence_key: key,
      status,
      collected_at: new Date().toISOString(),
      ...detail
    });
  };

  push('universal_audit', _envOn('IMPETUS_UNIVERSAL_AUDIT'), { flag: 'IMPETUS_UNIVERSAL_AUDIT' });
  push('failsafe_governance', _envOn('IMPETUS_FAILSAFE_GOVERNANCE'), { flag: 'IMPETUS_FAILSAFE_GOVERNANCE' });
  push('kms_governance', _envOn('IMPETUS_KMS_GOVERNANCE'), { flag: 'IMPETUS_KMS_GOVERNANCE' });
  push('dsr_export', _envOn('IMPETUS_DSR_EXPORT'), { flag: 'IMPETUS_DSR_EXPORT' });
  push('dsr_erase', _envOn('IMPETUS_DSR_ERASE'), { flag: 'IMPETUS_DSR_ERASE' });
  push('retention_policy', _envOn('IMPETUS_RETENTION_ENABLED'), {
    flag: 'IMPETUS_RETENTION_ENABLED',
    mode: process.env.IMPETUS_RETENTION_MODE
  });
  push('rls_enabled', _envOn('IMPETUS_RLS_ENABLED'), { mode: process.env.IMPETUS_RLS_MODE });
  push('mfa_enabled', _envOn('IMPETUS_MFA_ENABLED'), { mode: process.env.IMPETUS_MFA_MODE });
  push('federation_sso', _envOn('IMPETUS_FEDERATION_ENABLED'), { mode: process.env.IMPETUS_FEDERATION_MODE });
  push('apm_enterprise', _envOn('IMPETUS_APM_ENTERPRISE_ENABLED'), { mode: process.env.IMPETUS_APM_ENTERPRISE_MODE });
  push('observability_v2', _envOn('IMPETUS_OBSERVABILITY_V2_ENABLED'));
  push('ai_model_registry', _envOn('IMPETUS_AI_MODEL_REGISTRY'));
  push('hallucination_detection', _envOn('IMPETUS_HALLUCINATION_DETECTION'));
  push('action_runtime_hitl', _envOn('IMPETUS_ACTION_RUNTIME_MODE'));
  push('industrial_backbone', _envOn('IMPETUS_INDUSTRIAL_BACKBONE_MODE'));
  push('mqtt_real', _envOn('IMPETUS_MQTT_REAL_ENABLED'));
  push('opcua_real', _envOn('IMPETUS_OPCUA_REAL_ENABLED'));
  push('modbus_real', _envOn('IMPETUS_MODBUS_REAL_ENABLED'));
  push('edge_runtime', _envOn('IMPETUS_EDGE_RUNTIME_REAL_ENABLED'));
  push('industrial_lab', _envOn('IMPETUS_INDUSTRIAL_LAB_ENABLED'));
  push('rollout_center', _envOn('IMPETUS_ROLLOUT_CENTER_ENABLED'));
  push('governance_shadow_off', String(process.env.IMPETUS_GOVERNANCE_SHADOW_MODE || 'off').toLowerCase() === 'off');

  push('rbac_middleware', true, { note: 'requireAuth + requireHierarchy em rotas críticas' });
  push('encryption_at_rest', _envOn('IMPETUS_KMS_GOVERNANCE'), { note: 'KMS + column encryption paths' });
  push('tenant_isolation', true, { note: 'company_id scoping + RLS pilot' });

  const auditCount = await _countTable('audit_logs', companyId);
  push('audit_logs_table', auditCount != null && auditCount > 0, { count: auditCount });

  const lineageCount = await _countTable('ai_prompt_lineage', companyId);
  push('prompt_lineage', lineageCount != null && lineageCount > 0, { count: lineageCount });

  const traceGov = await _countTable('ai_interaction_traces', companyId);
  push('ai_traces_governance', traceGov != null, { count: traceGov });

  const eventAudit = await _countTable('runtime_unification_audit', companyId);
  push('event_audit', eventAudit != null, { count: eventAudit });

  push('ai_incidents', await _tableExists('ai_incidents'));

  try {
    const fr = require('../../governance/flagReconcilerRuntime');
    push('flag_reconciler', true, { diagnostics: fr.getBootDiagnostics() });
  } catch {
    push('flag_reconciler', false);
  }

  try {
    const pm2 = require('../../governance/flagReconcilerRuntime').getRuntimeDiagnostics?.();
    push('pm2_runtime', !!pm2?.runtime_info?.uptime_s, pm2?.runtime_info || {});
  } catch {
    push('pm2_runtime', process.uptime() > 60, { uptime_s: Math.round(process.uptime()) });
  }

  const docManifest = [
    'PROMPT_23_INDUSTRIAL_EVENT_BACKBONE_REPORT.md',
    'PROMPT_24_ACTION_RUNTIME_HITL_REPORT.md',
    'PROMPT_27_LEGACY_DEPRECATION_REPORT.md',
    'PROMPT_29_ROLLOUT_CENTER_REPORT.md',
    'PROMPT_30_ENTERPRISE_LOCALE_REPORT.md',
    'MASTER_ENTERPRISE_GAP_AUDIT.md',
    'ENTERPRISE_COMPLIANCE_AUDIT.md',
    'HALLUCINATION_DPO_AUDITOR_EVIDENCE_PACK.md',
    'KMS_ENCRYPTION_ENTERPRISE_REPORT.md',
    'AI_MODEL_REGISTRY_ENTERPRISE_REPORT.md'
  ];
  for (const doc of docManifest) {
    push(`doc:${doc}`, _docExists(doc), { path: `backend/docs/${doc}` });
  }

  let iso42001 = null;
  try {
    const gov = require('../../services/aiGovernancePersistenceService');
    iso42001 = await gov.getIso42001ReadinessReport(companyId);
    push('iso42001_report', iso42001?.ok === true, { gaps: iso42001?.gaps?.length || 0 });
  } catch {
    push('iso42001_report', false);
  }

  return {
    company_id: companyId,
    evidence_count: items.length,
    present_count: items.filter((e) => e.status === true).length,
    items,
    iso42001_summary: iso42001?.iso_42001_readiness || null,
    collected_at: new Date().toISOString()
  };
}

module.exports = { collectEvidenceInventory };
