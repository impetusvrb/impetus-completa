'use strict';

const catalog = require('../catalog/capabilityCatalog');

function resolveCapabilityFlags() {
  return catalog.listCapabilities().map((cap) => {
    const modeRaw = cap.mode_flag ? process.env[cap.mode_flag] : null;
    const enabledRaw = cap.enabled_flag ? process.env[cap.enabled_flag] : null;
    let effectiveMode = modeRaw != null && String(modeRaw).trim() !== '' ? String(modeRaw).trim().toLowerCase() : 'off';
    if (!cap.allowed_modes.includes(effectiveMode)) {
      effectiveMode = 'off';
    }
    return {
      capability_id: cap.id,
      label: cap.label,
      prompt: cap.prompt,
      mode_flag: cap.mode_flag,
      effective_mode: effectiveMode,
      enabled_flag: cap.enabled_flag || null,
      effective_enabled:
        enabledRaw == null
          ? true
          : ['true', '1', 'yes', 'on'].includes(String(enabledRaw).toLowerCase()),
      pilot_env: cap.pilot_env || null,
      pilot_tenants: cap.pilot_env
        ? String(process.env[cap.pilot_env] || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      runtime_stage: cap.runtime_stage,
      health_route: cap.health_route
    };
  });
}

function resolveGlobalEffectiveFlags(limit = 80) {
  let effective = {};
  try {
    const fr = require('../../governance/flagReconcilerRuntime');
    effective = fr.getEffectiveFlags();
  } catch (_e) {
    effective = {};
  }
  const impetus = Object.entries(process.env)
    .filter(([k]) => k.startsWith('IMPETUS_'))
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, limit)
    .map(([key, value]) => ({ key, value: String(value) }));
  return { reconciler_count: Object.keys(effective).length, impetus_env_sample: impetus, reconciler_effective: effective };
}

module.exports = { resolveCapabilityFlags, resolveGlobalEffectiveFlags };
