'use strict';

/**
 * INC-038 — Descriptor canónico logistics_native (existência, sem inteligência).
 */

function buildLogisticsRuntimeDescriptor(overrides = {}) {
  return {
    runtime_id: 'logistics_native',
    runtime_name: 'logistics_native',
    cockpit_mode: 'logistics_native',
    phase: 'Z.23',
    foundation_inc: 'INC-038',
    foundation_status: 'registered_inactive',
    consolidation_applied: false,
    promotion_applied: false,
    inactive: true,
    centers_count: 0,
    binding_ratio: 0,
    global_replace: false,
    auto_action: false,
    ...overrides
  };
}

function isLogisticsProfile(payload = {}, ctx = {}) {
  const pc = String(payload.profile_code || ctx.profile_code || '').toLowerCase();
  const axis = String(payload.functional_axis || payload.functional_area || ctx.domain_axis || '').toLowerCase();
  if (axis === 'logistics' || axis === 'logistica' || axis === 'logística' || axis === 'eixo_logistica' || axis === 'eixo_estoque') {
    return true;
  }
  return (
    pc.includes('logistics') ||
    pc.includes('logistica') ||
    pc.includes('logística') ||
    pc === 'manager_logistics' ||
    pc === 'coordinator_logistics' ||
    pc === 'supervisor_logistics'
  );
}

module.exports = { buildLogisticsRuntimeDescriptor, isLogisticsProfile };
