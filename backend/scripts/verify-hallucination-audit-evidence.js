#!/usr/bin/env node
'use strict';

/**
 * Verificação independente — Hallucination Detection em modo audit.
 * Uso: node scripts/verify-hallucination-audit-evidence.js
 *
 * Saída: JSON em stdout (ok: true/false). Exit 0 se conforme, 1 se falhar checks críticos.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const db = require('../src/db');
const svc = require('../src/services/hallucinationDetectionService');

const CHECKS = [];

function check(name, passed, detail) {
  CHECKS.push({ name, passed: !!passed, detail });
}

async function main() {
  const diag = svc.getDiagnostics();

  check('mode_is_audit', diag.mode === 'audit', { mode: diag.mode });
  check('block_disabled', diag.block_enabled === false, { block_enabled: diag.block_enabled });
  check('review_threshold_valid', diag.review_threshold > 0 && diag.review_threshold < 1, {
    review_threshold: diag.review_threshold,
  });

  let tableOk = false;
  let stats = null;
  try {
    const cols = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ai_hallucination_assessments'
    `);
    const required = [
      'trace_id',
      'company_id',
      'confidence_score',
      'requires_human_review',
      'explainability',
      'governance_metadata',
      'created_at',
    ];
    const names = new Set(cols.rows.map((r) => r.column_name));
    const missing = required.filter((c) => !names.has(c));
    tableOk = missing.length === 0;
    check('schema_columns', tableOk, { missing, total_columns: cols.rows.length });

    const r = await db.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE requires_human_review = true AND false_positive_marked = false)::int AS review_pending,
        COUNT(*) FILTER (WHERE false_positive_marked = true)::int AS false_positives,
        ROUND(AVG(confidence_score)::numeric, 4) AS avg_confidence
      FROM ai_hallucination_assessments
    `);
    stats = r.rows[0];
    check('table_readable', true, stats);
  } catch (err) {
    check('schema_columns', false, { error: err.message });
    check('table_readable', false, { error: err.message });
  }

  let auditEvents = 0;
  try {
    const ar = await db.query(`
      SELECT COUNT(*)::int AS cnt FROM audit_logs WHERE action = 'hallucination_assessment'
    `);
    auditEvents = ar.rows[0].cnt;
    check('audit_logs_action_exists', true, { audit_events: auditEvents });
  } catch (err) {
    check('audit_logs_action_exists', false, { error: err.message });
  }

  let recentAuditSample = null;
  if (auditEvents > 0) {
    try {
      const s = await db.query(`
        SELECT description, created_at, company_id
        FROM audit_logs
        WHERE action = 'hallucination_assessment'
        ORDER BY created_at DESC
        LIMIT 1
      `);
      const desc = s.rows[0]?.description;
      let parsed = null;
      try {
        parsed = typeof desc === 'string' ? JSON.parse(desc) : desc;
      } catch {
        parsed = { raw: desc };
      }
      recentAuditSample = parsed;
      check('audit_payload_has_mode', parsed?.mode === 'audit', { mode: parsed?.mode });
      check('audit_payload_should_not_block', parsed?.should_block === false, {
        should_block: parsed?.should_block,
      });
    } catch (err) {
      check('audit_payload_parse', false, { error: err.message });
    }
  } else {
    check('audit_payload_has_mode', true, { note: 'no audit events yet — acceptable on cold start' });
    check('audit_payload_should_not_block', true, { note: 'no audit events yet' });
  }

  const criticalFailed = CHECKS.filter((c) => !c.passed && !c.name.includes('audit_payload')).length;
  const allCriticalPassed = CHECKS.every((c) => c.passed);

  const report = {
    ok: allCriticalPassed,
    generated_at: new Date().toISOString(),
    diagnostics: diag,
    table_stats: stats,
    audit_events: auditEvents,
    recent_audit_sample: recentAuditSample,
    checks: CHECKS,
    summary: {
      passed: CHECKS.filter((c) => c.passed).length,
      failed: CHECKS.filter((c) => !c.passed).length,
      critical_failed: criticalFailed,
    },
    rollback: {
      IMPETUS_HALLUCINATION_DETECTION: 'shadow',
      IMPETUS_HALLUCINATION_BLOCK: 'off',
      command: 'pm2 restart impetus-backend --update-env',
    },
    documentation: 'backend/docs/HALLUCINATION_DPO_AUDITOR_EVIDENCE_PACK.md',
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(allCriticalPassed ? 0 : 1);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
  process.exit(1);
});
