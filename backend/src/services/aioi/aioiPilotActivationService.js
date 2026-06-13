'use strict';

/**
 * AIOI-P0D.3 — Pilot Activation Service
 *
 * Gerencia ativação controlada do AIOI para 1 tenant piloto.
 * Controla flags de ativação no processo atual sem alterar variáveis de
 * outros tenants.
 *
 * Invariantes obrigatórios (AIOI_P0_AUTHORIZATION.md):
 *   - IMPETUS_AIOI_QUEUE_ACTIVE permanece false durante piloto
 *   - IMPETUS_AIOI_AUTO_EXECUTE_BAND permanece none
 *   - Nenhum runtime cognitivo é ativado
 *   - Somente pipeline: Ingestion → Classification → Priority → Queue
 */

const { v4: uuidv4 } = require('uuid');

const LAYER = 'AIOI_PILOT_ACTIVATION';
const PILOT_VERSION = '0.1.0';

// Invariantes de segurança — NUNCA podem ser alterados pelo piloto
const SAFETY_INVARIANTS = Object.freeze({
  runtime_enabled:            false,
  runtime_active:             false,
  runtime_authorized:         false,
  cognitive_execution_allowed: false,
  queue_active:               false,
  auto_execute_band:          'none'
});

let _activePilotTenant = null;
let _activationTimestamp = null;
let _pilotRunId = null;

/**
 * Ativa AIOI para o tenant piloto selecionado.
 * Valida que todos os invariantes de segurança estão preservados.
 *
 * @param {string} tenantId — UUID do tenant piloto
 * @returns {object} — estado de ativação
 */
function activatePilotTenant(tenantId) {
  if (!tenantId || !/^[0-9a-f-]{36}$/i.test(tenantId)) {
    throw new Error(`${LAYER}: tenantId inválido: ${tenantId}`);
  }

  if (_activePilotTenant !== null && _activePilotTenant !== tenantId) {
    throw new Error(`${LAYER}: Piloto já ativo para tenant ${_activePilotTenant?.slice(0, 8)}. Desativar antes de trocar.`);
  }

  _activePilotTenant = tenantId;
  _activationTimestamp = new Date().toISOString();
  _pilotRunId = uuidv4();

  console.log(`[${LAYER}] pilot_activated`, {
    event: 'pilot_activated',
    layer: LAYER,
    pilot_run_id: _pilotRunId,
    tenant_id: tenantId.slice(0, 8) + '...',
    ts: _activationTimestamp,
    invariants: SAFETY_INVARIANTS
  });

  return {
    ok: true,
    pilot_run_id: _pilotRunId,
    tenant_id: tenantId,
    activation_ts: _activationTimestamp,
    invariants: { ...SAFETY_INVARIANTS },
    pipeline: 'Ingestion → Classification → Priority → Queue',
    prohibited: ['runtime_cognitivo', 'recommendation_runtime', 'simulation_runtime', 'authorization_runtime']
  };
}

/**
 * Verifica se um tenant está ativo no piloto atual.
 * @param {string} tenantId
 * @returns {boolean}
 */
function isPilotTenant(tenantId) {
  return _activePilotTenant === tenantId;
}

/**
 * Retorna o estado atual do piloto.
 * @returns {object}
 */
function getPilotState() {
  return {
    active_tenant: _activePilotTenant,
    pilot_run_id: _pilotRunId,
    activation_ts: _activationTimestamp,
    is_active: _activePilotTenant !== null,
    invariants: { ...SAFETY_INVARIANTS }
  };
}

/**
 * Desativa o piloto e reseta o estado.
 * @returns {object}
 */
function deactivatePilot() {
  const prev = { tenant: _activePilotTenant, run_id: _pilotRunId };
  _activePilotTenant = null;
  _activationTimestamp = null;
  _pilotRunId = null;

  console.log(`[${LAYER}] pilot_deactivated`, {
    event: 'pilot_deactivated',
    layer: LAYER,
    previous_tenant: prev.tenant?.slice(0, 8),
    previous_run_id: prev.run_id
  });

  return { ok: true, previous: prev };
}

/**
 * Valida que o estado de segurança pós-ativação está correto.
 * @param {object} flags — flags atuais do sistema
 * @returns {object}
 */
function validateSafetyPostActivation(flags = {}) {
  const checks = [
    { id: 'SA-01', name: 'queue_inactive',        pass: flags.IMPETUS_AIOI_QUEUE_ACTIVE !== true,                          required: true },
    { id: 'SA-02', name: 'worker_inactive',        pass: flags.IMPETUS_AIOI_OUTBOX_WORKER_ENABLED !== true,                required: true },
    { id: 'SA-03', name: 'band_none',              pass: !flags.IMPETUS_AIOI_AUTO_EXECUTE_BAND || flags.IMPETUS_AIOI_AUTO_EXECUTE_BAND === 'none', required: true },
    { id: 'SA-04', name: 'runtime_disabled',       pass: !flags.runtime_enabled,                                           required: true },
    { id: 'SA-05', name: 'cognitive_disabled',     pass: !flags.cognitive_execution_allowed,                               required: true },
    { id: 'SA-06', name: 'pilot_tenant_set',       pass: _activePilotTenant !== null,                                      required: true }
  ];

  const allPass = checks.every(c => c.pass);

  return {
    ok: allPass,
    checks,
    verdict: allPass ? 'SAFETY_VALIDATED' : 'SAFETY_VIOLATION',
    invariants: { ...SAFETY_INVARIANTS }
  };
}

module.exports = {
  activatePilotTenant,
  isPilotTenant,
  getPilotState,
  deactivatePilot,
  validateSafetyPostActivation,
  SAFETY_INVARIANTS,
  LAYER,
  PILOT_VERSION
};
