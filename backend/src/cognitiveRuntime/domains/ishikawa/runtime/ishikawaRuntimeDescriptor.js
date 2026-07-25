'use strict';

/**
 * GF-015 — Descriptor canónico ishikawa_native (existência, sem inteligência).
 */

function buildIshikawaRuntimeDescriptor(overrides = {}) {
  return {
    runtime_id: 'ishikawa_native',
    runtime_name: 'ishikawa_native',
    cockpit_mode: 'off',
    phase: 'Z.23',
    foundation_inc: 'GF-015',
    foundation_status: 'registered_inactive',
    consolidation_applied: false,
    promotion_applied: false,
    inactive: true,
    centers_count: 0,
    binding_ratio: 0,
    pilot_blocks: [],
    bound_blocks: [],
    missing_blocks: [],
    global_replace: false,
    auto_action: false,
    ...overrides
  };
}

function isIshikawaProfile(payload = {}, ctx = {}) {
  const pc = String(payload.profile_code || ctx.profile_code || '').toLowerCase();
  const axis = String(payload.functional_axis || payload.functional_area || ctx.domain_axis || '').toLowerCase();
  if (axis === 'quality' || axis === 'qualidade' || axis === 'eixo_qualidade') {
    return true;
  }
  return (
    pc.includes('quality') ||
    pc.includes('qualidade') ||
    pc.includes('ishikawa') ||
    pc.includes('capa') ||
    pc === 'manager_quality' ||
    pc === 'coordinator_quality' ||
    pc === 'supervisor_quality' ||
    pc === 'inspector_quality'
  );
}

module.exports = { buildIshikawaRuntimeDescriptor, isIshikawaProfile };
