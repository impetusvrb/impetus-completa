'use strict';

/**
 * Colector read-only de evidências para auditoria final (env, BD, módulos, docs).
 */

const fs = require('fs');
const path = require('path');
const catalog = require('../catalog/promptSequenceCatalog');

const DOCS_DIR = path.join(__dirname, '../../../docs');
const MASTER_DOCS = [
  'MASTER_ENTERPRISE_GAP_AUDIT.md',
  'ENTERPRISE_COMPLIANCE_AUDIT.md',
  'TECHNICAL_DEBT_MASTER_REPORT.md',
  'MARKET_READINESS_ASSESSMENT.md',
  'FINAL_STRATEGIC_DEVELOPMENT_ROADMAP.md',
  'ENTERPRISE_OPERATIONAL_MATURITY_SCORE.md'
];

function _env(name) {
  return String(process.env[name] ?? '').trim();
}

function _envBool(name) {
  const v = _env(name).toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

function _docExists(filename) {
  if (!filename) return false;
  return fs.existsSync(path.join(DOCS_DIR, filename));
}

function _safeRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (_e) {
    return null;
  }
}

function _flagState(flagName) {
  const raw = _env(flagName);
  const mode = raw.toLowerCase() || 'unset';
  return {
    flag: flagName,
    raw: raw || null,
    mode,
    production_on: catalog.isProductionMode(mode),
    shadow: mode === 'shadow',
    audit_only: mode === 'audit',
    off: !raw || mode === 'off' || mode === 'false'
  };
}

async function _dbCounts() {
  const out = {};
  try {
    const db = require('../../db');
    const tables = [
      'ai_legal_audit_logs',
      'z_conversation_message_index',
      'certification_readiness_snapshots',
      'rollout_center_audit',
      'runtime_unification_audit',
      'legacy_deprecation_audit',
      'enterprise_locale_audit'
    ];
    for (const t of tables) {
      try {
        const r = await db.query(`SELECT COUNT(*)::int AS c FROM ${t}`);
        out[t] = r.rows[0]?.c ?? 0;
      } catch (_e) {
        out[t] = null;
      }
    }
  } catch (_e) {
    out.error = 'db_unavailable';
  }
  return out;
}

function _collectShadowAntiPatterns() {
  const shadows = [];
  const keys = Object.keys(process.env).filter((k) => k.startsWith('IMPETUS_'));
  for (const k of keys) {
    const v = _env(k).toLowerCase();
    if (v === 'shadow' || v === 'true' && k.endsWith('_SHADOW_MODE')) {
      shadows.push({ flag: k, value: v });
    }
    if (k.endsWith('_SHADOW_MODE') && (v === 'true' || v === '1')) {
      shadows.push({ flag: k, value: v });
    }
  }
  return shadows;
}

function _runtimeHealthProbes() {
  const probes = {};
  const modules = [
    ['rollout_center', '../rolloutCenter/facade/rolloutCenterFacade', 'getHealth'],
    ['certification_readiness', '../certificationReadiness/facade/certificationReadinessFacade', 'getHealth'],
    ['runtime_unification', '../runtimeUnification/facade/unifiedSz5RuntimeFacade', 'getHealth'],
    ['legacy_deprecation', '../legacyDeprecation/governance/legacyCompatibilityRouter', 'getHealth'],
    ['cognitive_registry', '../cognitiveRegistry/consolidation/unifiedCognitiveRegistry', 'getHealth'],
    ['action_runtime', '../actionRuntime/orchestration/actionRuntimeOrchestrator', 'getHealth'],
    ['workflow_engine', '../workflowEngine/orchestration/workflowOrchestrator', 'getHealth']
  ];
  for (const [id, mod, fn] of modules) {
    const m = _safeRequire(path.join(__dirname, mod));
    if (m && typeof m[fn] === 'function') {
      try {
        probes[id] = { ok: true, health: m[fn]() };
      } catch (e) {
        probes[id] = { ok: false, error: e?.message };
      }
    } else {
      probes[id] = { ok: false, error: 'module_unavailable' };
    }
  }
  return probes;
}

function _motorAEngineV2Evidence() {
  return {
    motor_a: fs.existsSync(path.join(__dirname, '../../services/dashboardService.js')),
    engine_v2: fs.existsSync(path.join(__dirname, '../../dashboardEngineV2/runtimeEngineV2.js')),
    chat_consolidated: fs.existsSync(path.join(__dirname, '../../services/chatAIService.consolidated.js')),
    sz5_injector: fs.existsSync(
      path.join(__dirname, '../../runtime-z-sovereign/sz5/injection/zUnifiedConversationalContextInjector.js')
    )
  };
}

async function collectRuntimeEvidence(companyId = null) {
  const effectiveFlags = {};
  const impetusFlags = Object.keys(process.env)
    .filter((k) => k.startsWith('IMPETUS_'))
    .sort();
  for (const k of impetusFlags) {
    effectiveFlags[k] = _env(k);
  }

  const masterDocs = MASTER_DOCS.map((d) => ({
    file: d,
    present: fs.existsSync(path.join(DOCS_DIR, d))
  }));

  const promptDocs = catalog.listPrompts().map((p) => ({
    prompt: p.id,
    code: p.code,
    doc: p.doc,
    doc_present: _docExists(p.doc)
  }));

  let certificationScore = null;
  try {
    const crFlags = require('../../certificationReadiness/config/certificationReadinessFlags');
    if (crFlags.isCertificationReadinessActive()) {
      const inv = await require('../../certificationReadiness/collectors/evidenceInventoryCollector').collectEvidenceInventory(
        companyId
      );
      const gap = require('../../certificationReadiness/engine/gapAnalysisEngine').runGapAnalysis(inv, null);
      certificationScore = gap.overall_score;
    }
  } catch (_e) {
    certificationScore = null;
  }

  return {
    collected_at: new Date().toISOString(),
    company_id: companyId,
    pm2_process: process.env.PM2_PROCESS_NAME || process.env.name || null,
    node_env: process.env.NODE_ENV || null,
    effective_flags_count: impetusFlags.length,
    effective_flags_sample: impetusFlags.slice(0, 80),
    master_audit_docs: masterDocs,
    prompt_delivery_docs: promptDocs,
    db_counts: await _dbCounts(),
    shadow_anti_patterns: _collectShadowAntiPatterns(),
    runtime_health_probes: _runtimeHealthProbes(),
    core_runtime_files: _motorAEngineV2Evidence(),
    pilot_tenant_hint: _env('IMPETUS_SZ4_PROMOTED_TENANTS') || _env('IMPETUS_INDUSTRIAL_BACKBONE_PILOT_TENANTS'),
    certification_readiness_score: certificationScore,
    governance_aggregator: (() => {
      try {
        return require('../../rolloutCenter/resolvers/governanceStateAggregator').aggregateGovernanceStates(companyId);
      } catch (_e) {
        return [];
      }
    })()
  };
}

module.exports = {
  collectRuntimeEvidence,
  _flagState,
  _docExists,
  _env,
  _envBool
};
