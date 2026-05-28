'use strict';

/**
 * Valida estado de produção PROMPT 1–32 (read-only).
 */

const fs = require('fs');
const path = require('path');
const catalog = require('../catalog/promptSequenceCatalog');
const collector = require('../collectors/runtimeEvidenceCollector');

function _resolveFlagProduction(prompt) {
  const states = [];
  for (const f of prompt.flags || []) {
    states.push(collector._flagState(f));
  }
  if (prompt.enabled_flag) {
    const en = collector._env(prompt.enabled_flag).toLowerCase();
    states.push({
      flag: prompt.enabled_flag,
      raw: en,
      mode: en || 'unset',
      production_on: catalog.isProductionMode(en) || en === 'true',
      shadow: false,
      audit_only: false,
      off: !en || en === 'false'
    });
  }
  if (!states.length) return { production_on: null, states: [], reason: 'no_flags_defined' };
  const allOn = states.every((s) => s.production_on && !s.shadow);
  const anyShadow = states.some((s) => s.shadow);
  const anyOff = states.some((s) => s.off);
  return {
    production_on: allOn && !anyShadow && !anyOff,
    states,
    any_shadow: anyShadow,
    any_off: anyOff
  };
}

function _validateSpecial(prompt) {
  const v = prompt.validate;
  if (v === 'visibility_route') {
    const routes = path.join(__dirname, '../../routes/dashboard.js');
    const content = fs.existsSync(routes) ? fs.readFileSync(routes, 'utf8') : '';
    const ok = /\/visibility|dashboardVisibility/.test(content);
    return { production_on: ok, evidence: 'dashboard_visibility_route_or_service' };
  }
  if (v === 'dashboard_sections') {
    const fe = path.join(__dirname, '../../../../frontend/src');
    const ok =
      fs.existsSync(path.join(fe, 'hooks/useDashboardVisibility.js')) ||
      fs.existsSync(path.join(fe, 'components/DashboardInteligente.jsx'));
    return { production_on: ok, evidence: 'frontend_dashboard_integration' };
  }
  if (v === 'audit_universal') {
    const mode = collector._env('IMPETUS_AUDIT_MIDDLEWARE_UNIVERSAL') || collector._env('IMPETUS_UNIVERSAL_AUDIT_ENABLED');
    const on = catalog.isProductionMode(mode) || collector._envBool('IMPETUS_UNIVERSAL_AUDIT_ENABLED');
    const mw = fs.existsSync(path.join(__dirname, '../../middleware/audit.js'));
    return { production_on: on || mw, evidence: 'audit_middleware_present' };
  }
  if (v === 'flag_reconciler') {
    const ok = fs.existsSync(path.join(__dirname, '../../services/flagReconcilerService.js')) ||
      fs.existsSync(path.join(__dirname, '../../governance/flagReconcilerBootCheck.js'));
    return { production_on: ok, evidence: 'flag_reconciler_module' };
  }
  if (v === 'cognitive_exec') {
    const exec = collector._env('IMPETUS_COGNITIVE_RUNTIME_EXEC');
    const obs = collector._env('IMPETUS_SEMANTIC_DELIVERY_OBSERVABILITY');
    return {
      production_on: catalog.isProductionMode(exec) || catalog.isProductionMode(obs),
      evidence: 'cognitive_exec_or_observability_gate'
    };
  }
  if (v === 'dsr_workflow') {
    const ok =
      fs.existsSync(path.join(__dirname, '../../routes/lgpd.js')) ||
      fs.existsSync(path.join(__dirname, '../../services/dsrNotificationService.js'));
    return { production_on: ok, evidence: 'dsr_routes_or_scheduler' };
  }
  if (v === 'retention') {
    const mode = collector._env('IMPETUS_RETENTION_MODE');
    return { production_on: catalog.isProductionMode(mode), evidence: `retention_mode=${mode}` };
  }
  if (v === 'ai_anon_worker') {
    const mode = collector._env('IMPETUS_AI_ANONYMIZATION_MODE') || collector._env('IMPETUS_AI_ANON_WORKER_MODE');
    const ok = fs.existsSync(path.join(__dirname, '../../workers/aiAnonymizationWorker.js'));
    return { production_on: catalog.isProductionMode(mode) || ok, evidence: 'ai_anonymization_worker' };
  }
  if (v === 'kms') {
    const mode = collector._env('IMPETUS_KMS_MODE');
    const ok = fs.existsSync(path.join(__dirname, '../../services/kms/kmsGovernanceService.js'));
    return { production_on: catalog.isProductionMode(mode) || ok, evidence: 'kms_governance_service' };
  }
  if (v === 'sz5_anon') {
    return _resolveFlagProduction({ flags: ['IMPETUS_SZ5_ANONYMIZATION_MODE'] });
  }
  if (v === 'ai_registry') {
    const mode = collector._env('IMPETUS_AI_MODEL_REGISTRY_MODE');
    const ok = fs.existsSync(path.join(__dirname, '../../governance/aiModelRegistry.js'));
    return { production_on: catalog.isProductionMode(mode) || ok, evidence: 'ai_model_registry' };
  }
  if (v === 'hallucination') {
    const mode = collector._env('IMPETUS_HALLUCINATION_DETECTION_MODE');
    const ok = fs.existsSync(path.join(__dirname, '../../services/hallucinationDetectionService.js'));
    return { production_on: catalog.isProductionMode(mode) || ok, evidence: 'hallucination_detection' };
  }
  if (v === 'apm') {
    const st = _resolveFlagProduction(prompt);
    return { ...st, evidence: 'apm_enterprise_flags' };
  }
  if (v === 'sz4_persistence') {
    const p = collector._env('IMPETUS_SZ4_PERSISTENCE');
    return {
      production_on: catalog.isProductionMode(p),
      evidence: `sz4_persistence=${p}`
    };
  }
  if (v === 'federation' || v === 'mfa' || v === 'rls') {
    return _resolveFlagProduction(prompt);
  }
  if (v === 'mqtt_real' || v === 'opcua_real' || v === 'modbus_real' || v === 'edge_runtime') {
    return _resolveFlagProduction(prompt);
  }
  if (v === 'mode_flag') {
    return _resolveFlagProduction(prompt);
  }
  return { production_on: false, evidence: 'unknown_validator' };
}

function validateAllPrompts(evidence = {}) {
  const results = catalog.listPrompts().map((prompt) => {
    let validation;
    if (prompt.validate === 'mode_flag' || prompt.flags?.length) {
      validation = prompt.flags?.length && prompt.validate !== 'mode_flag'
        ? { ..._validateSpecial(prompt), ..._resolveFlagProduction(prompt) }
        : prompt.validate === 'mode_flag'
          ? _resolveFlagProduction(prompt)
          : _validateSpecial(prompt);
    } else {
      validation = _validateSpecial(prompt);
    }

    const docOk = !prompt.doc || collector._docExists(prompt.doc);
    const production_on = validation.production_on === true;
    const status = production_on ? 'production_on' : validation.any_shadow ? 'shadow' : validation.any_off ? 'off' : 'partial';

    return {
      prompt_id: prompt.id,
      code: prompt.code,
      title: prompt.title,
      tier: prompt.tier,
      status,
      production_on,
      doc_present: docOk,
      flags: validation.states || [],
      evidence: validation.evidence || null,
      anti_pattern: status === 'shadow' ? 'shadow_first_eternal_risk' : null
    };
  });

  const onCount = results.filter((r) => r.production_on).length;
  return {
    total: results.length,
    production_on_count: onCount,
    production_on_pct: Math.round((onCount / results.length) * 100),
    shadow_count: results.filter((r) => r.status === 'shadow').length,
    off_count: results.filter((r) => r.status === 'off').length,
    partial_count: results.filter((r) => r.status === 'partial').length,
    prompts: results
  };
}

function validateRuntimeZones(evidence = {}) {
  const zones = catalog.RUNTIME_ZONES.map((z) => {
    if (z.check === 'motor_a') {
      return { ...z, production_on: evidence.core_runtime_files?.motor_a === true, score: 88 };
    }
    if (z.check === 'engine_v2') {
      return { ...z, production_on: evidence.core_runtime_files?.engine_v2 === true, score: 82 };
    }
    if (z.check === 'runtime_z') {
      return {
        ...z,
        production_on: evidence.core_runtime_files?.sz5_injector === true,
        score: 78
      };
    }
    if (z.check === 'ai_safety') {
      const h = evidence.runtime_health_probes?.action_runtime?.health;
      const reg = evidence.runtime_health_probes?.cognitive_registry?.health;
      const on = !!(h || reg);
      return { ...z, production_on: on, score: on ? 72 : 40 };
    }
    if (z.check === 'telemetry_real') {
      const mqtt = catalog.isProductionMode(collector._env('IMPETUS_MQTT_REAL_MODE'));
      const opc = catalog.isProductionMode(collector._env('IMPETUS_OPCUA_REAL_MODE'));
      const mod = catalog.isProductionMode(collector._env('IMPETUS_MODBUS_REAL_MODE'));
      const score = [mqtt, opc, mod].filter(Boolean).length * 25 + 10;
      return { ...z, production_on: mqtt && opc && mod, score };
    }
    if (z.flags) {
      const on = z.flags.every((f) => catalog.isProductionMode(collector._env(f)));
      return { ...z, production_on: on, score: on ? 85 : 45 };
    }
    return { ...z, production_on: false, score: 30 };
  });
  return zones;
}

module.exports = { validateAllPrompts, validateRuntimeZones };
