'use strict';

/**
 * AIOI-P2.5 — Pilot Tenant Flags
 *
 * Governança de tenants piloto AIOI (máximo 3).
 * Ativação explícita via IMPETUS_AIOI_PILOT_TENANTS — sem hardcode.
 */

const { isValidUUID } = require('../../utils/security');

const MAX_PILOT_TENANTS = 3;
const LAYER = 'AIOI_PILOT_FLAGS';

function _parseTenantList(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Lista de tenants piloto (máx. 3 UUIDs válidos).
 * @returns {string[]}
 */
function getPilotTenants() {
  const candidates = _parseTenantList(process.env.IMPETUS_AIOI_PILOT_TENANTS || '');
  const valid = [];
  for (const id of candidates) {
    if (!isValidUUID(String(id))) {
      console.warn(`[${LAYER}] UUID piloto inválido ignorado`, { tenant: id });
      continue;
    }
    if (valid.length >= MAX_PILOT_TENANTS) break;
    if (!valid.includes(id)) valid.push(id);
  }
  return valid;
}

/**
 * Verifica se companyId pertence ao piloto AIOI.
 * @param {string} companyId
 * @returns {boolean}
 */
function isPilotTenant(companyId) {
  if (!companyId) return false;
  return getPilotTenants().includes(String(companyId));
}

const VALID_AUTO_EXECUTE_BANDS = ['none', 'low', 'medium'];
const VALID_BUS_MODES = ['outbox', 'redis', 'off'];

function getAioiFlags() {
  const autoExecRaw = String(process.env.IMPETUS_AIOI_AUTO_EXECUTE_BAND || 'none').toLowerCase();
  const busModeRaw  = String(process.env.IMPETUS_AIOI_BUS_MODE || 'outbox').toLowerCase();

  return {
    IMPETUS_AIOI_ENABLED:              String(process.env.IMPETUS_AIOI_ENABLED || 'false').toLowerCase() === 'true',
    IMPETUS_AIOI_QUEUE_ACTIVE:         String(process.env.IMPETUS_AIOI_QUEUE_ACTIVE || 'false').toLowerCase() === 'true',
    IMPETUS_AIOI_OUTBOX_WORKER_ENABLED: String(process.env.IMPETUS_AIOI_OUTBOX_WORKER_ENABLED || 'false').toLowerCase() === 'true',
    IMPETUS_AIOI_AUTO_EXECUTE_BAND:    VALID_AUTO_EXECUTE_BANDS.includes(autoExecRaw) ? autoExecRaw : 'none',
    IMPETUS_AIOI_BUS_MODE:             VALID_BUS_MODES.includes(busModeRaw) ? busModeRaw : 'outbox'
  };
}

/**
 * Valida configuração piloto (sem side effects).
 * @returns {{ ok: boolean, errors: string[], pilot_tenants: string[] }}
 */
function validatePilotConfig() {
  const errors = [];
  const raw = _parseTenantList(process.env.IMPETUS_AIOI_PILOT_TENANTS || '');
  const flags = getAioiFlags();

  if (raw.length > MAX_PILOT_TENANTS) {
    errors.push(`PILOT_TENANT_LIMIT_EXCEEDED: máximo ${MAX_PILOT_TENANTS}`);
  }

  for (const id of raw) {
    if (!isValidUUID(String(id))) {
      errors.push(`PILOT_TENANT_INVALID_UUID: ${id}`);
    }
  }

  const pilotTenants = getPilotTenants();
  if (flags.IMPETUS_AIOI_OUTBOX_WORKER_ENABLED && pilotTenants.length === 0) {
    errors.push('PILOT_TENANTS_REQUIRED_WHEN_WORKER_ENABLED');
  }

  return { ok: errors.length === 0, errors, pilot_tenants: pilotTenants };
}

/**
 * Verifica se auto-execução é permitida para a banda de prioridade dada.
 * Contrato R2: HITL obrigatório para critical/high quando band=none.
 * @param {'low'|'medium'|'high'|'critical'} priorityBand
 * @returns {boolean}
 */
function isAutoExecutionAllowed(priorityBand) {
  const band = getAioiFlags().IMPETUS_AIOI_AUTO_EXECUTE_BAND;
  if (band === 'none') return false;
  if (band === 'low') return priorityBand === 'low';
  if (band === 'medium') return priorityBand === 'low' || priorityBand === 'medium';
  return false;
}

module.exports = {
  MAX_PILOT_TENANTS,
  VALID_AUTO_EXECUTE_BANDS,
  VALID_BUS_MODES,
  getPilotTenants,
  isPilotTenant,
  getAioiFlags,
  validatePilotConfig,
  isAutoExecutionAllowed
};
