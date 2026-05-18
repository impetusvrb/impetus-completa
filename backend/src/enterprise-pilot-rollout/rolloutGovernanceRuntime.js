'use strict';

const _state = new Map();

function defaultState(tenantId) {
  return {
    tenant_id: tenantId,
    paused: false,
    frozen: false,
    audience_frozen: false,
    stage: 'pilot',
    pilot_wave: 1,
    rollback_generation: 0,
    updated_at: new Date().toISOString()
  };
}

function getGovernanceState(tenantId) {
  const k = String(tenantId);
  if (!_state.has(k)) _state.set(k, defaultState(k));
  return { ..._state.get(k) };
}

function freezeTenant(tenantId, reason) {
  const s = getGovernanceState(tenantId);
  s.frozen = true;
  s.freeze_reason = reason || 'manual_freeze';
  s.updated_at = new Date().toISOString();
  _state.set(String(tenantId), s);
  return { ok: true, state: s };
}

function pauseRollout(tenantId, reason) {
  const s = getGovernanceState(tenantId);
  s.paused = true;
  s.pause_reason = reason || 'manual_pause';
  s.updated_at = new Date().toISOString();
  _state.set(String(tenantId), s);
  return { ok: true, state: s };
}

function rollbackTenant(tenantId) {
  const s = getGovernanceState(tenantId);
  s.stage = 'shadow';
  s.pilot_wave = 1;
  s.paused = false;
  s.frozen = false;
  s.rollback_generation = (s.rollback_generation || 0) + 1;
  s.updated_at = new Date().toISOString();
  _state.set(String(tenantId), s);
  return { ok: true, state: s, rolled_back: true };
}

function rollbackAudience(tenantId) {
  const s = getGovernanceState(tenantId);
  s.audience_frozen = true;
  s.pilot_wave = 1;
  s.updated_at = new Date().toISOString();
  _state.set(String(tenantId), s);
  return { ok: true, state: s, audience_rolled_back: true };
}

function resumePilot(tenantId) {
  const s = getGovernanceState(tenantId);
  s.paused = false;
  s.frozen = false;
  s.audience_frozen = false;
  s.updated_at = new Date().toISOString();
  _state.set(String(tenantId), s);
  return { ok: true, state: s };
}

function advancePilotWave(tenantId) {
  const s = getGovernanceState(tenantId);
  if (s.frozen || s.paused) return { ok: false, error: 'tenant_frozen_or_paused' };
  s.pilot_wave = Math.min(5, (s.pilot_wave || 1) + 1);
  s.updated_at = new Date().toISOString();
  _state.set(String(tenantId), s);
  return { ok: true, state: s };
}

module.exports = {
  getGovernanceState,
  freezeTenant,
  pauseRollout,
  rollbackTenant,
  rollbackAudience,
  resumePilot,
  advancePilotWave
};
