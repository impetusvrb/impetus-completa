'use strict';

/**
 * AIOI-P1E.1 — Tenant Registry Service
 *
 * Registro operacional de tenants AIOI — substitui dependência exclusiva
 * de IMPETUS_AIOI_PILOT_TENANTS quando registry configurado.
 *
 * ADDITIVE ONLY · zero breaking changes:
 *   - Se IMPETUS_AIOI_TENANT_REGISTRY vazio → fallback pilot tenants
 *   - aioiPilotFlags.js inalterado (certificação P0D/P1A preservada)
 *
 * Config:
 *   IMPETUS_AIOI_TENANT_REGISTRY=uuid1,uuid2,...  (sem limite de 3)
 *   IMPETUS_AIOI_TENANT_REGISTRY_MAX=100
 */

const crypto = require('crypto');
const pilotFlags = require('../aioiPilotFlags');
const { isValidUUID } = require('../../../utils/security');

const LAYER = 'AIOI_TENANT_REGISTRY';
const DEFAULT_MAX = 100;

function _getMaxTenants() {
  const n = parseInt(String(process.env.IMPETUS_AIOI_TENANT_REGISTRY_MAX || DEFAULT_MAX), 10);
  return Math.min(Math.max(Number.isFinite(n) ? n : DEFAULT_MAX, 1), 1000);
}

function _parseRegistryRaw() {
  const raw = String(process.env.IMPETUS_AIOI_TENANT_REGISTRY || '').trim();
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Carrega tenants do registry ou fallback pilot.
 * @returns {{ tenants: string[], source: string, registry_enabled: boolean }}
 */
function loadRegisteredTenants() {
  const candidates = _parseRegistryRaw();
  const max = _getMaxTenants();

  if (candidates.length === 0) {
    const pilot = pilotFlags.getPilotTenants();
    return {
      tenants: pilot,
      source: 'IMPETUS_AIOI_PILOT_TENANTS',
      registry_enabled: false,
      max_tenants: pilotFlags.MAX_PILOT_TENANTS
    };
  }

  const valid = [];
  for (const id of candidates) {
    if (!isValidUUID(String(id))) {
      console.warn(`[${LAYER}] UUID inválido ignorado`, { tenant: id });
      continue;
    }
    if (valid.length >= max) break;
    if (!valid.includes(id)) valid.push(id);
  }

  return {
    tenants: valid,
    source: 'IMPETUS_AIOI_TENANT_REGISTRY',
    registry_enabled: true,
    max_tenants: max
  };
}

/**
 * Valida registry (sem side effects).
 * @returns {{ ok: boolean, errors: string[], tenants: string[], source: string }}
 */
function validateTenantRegistry() {
  const loaded = loadRegisteredTenants();
  const errors = [];

  if (loaded.registry_enabled) {
    const raw = _parseRegistryRaw();
    if (raw.length > _getMaxTenants()) {
      errors.push(`REGISTRY_LIMIT_EXCEEDED: máximo ${_getMaxTenants()}`);
    }
    for (const id of raw) {
      if (!isValidUUID(String(id))) {
        errors.push(`REGISTRY_INVALID_UUID: ${id}`);
      }
    }
  } else {
    const pilotValidation = pilotFlags.validatePilotConfig();
    if (!pilotValidation.ok) {
      errors.push(...pilotValidation.errors);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    tenants: loaded.tenants,
    source: loaded.source,
    registry_enabled: loaded.registry_enabled
  };
}

/**
 * Tenants ativos para operações de scale (registry ou pilot).
 * @returns {string[]}
 */
function getActiveTenants() {
  return loadRegisteredTenants().tenants;
}

/**
 * Contagem de tenants ativos.
 * @returns {number}
 */
function getTenantCount() {
  return getActiveTenants().length;
}

/**
 * Hash estável de tenant para particionamento.
 * @param {string} tenantId
 * @returns {number}
 */
function getTenantHash(tenantId) {
  const buf = crypto.createHash('sha256').update(String(tenantId)).digest();
  return buf.readUInt32BE(0);
}

module.exports = {
  loadRegisteredTenants,
  validateTenantRegistry,
  getActiveTenants,
  getTenantCount,
  getTenantHash,
  LAYER,
  DEFAULT_MAX
};
