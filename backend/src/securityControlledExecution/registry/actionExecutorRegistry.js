'use strict';

/**
 * SEC-13 — Action Executor Registry.
 * AUTO_EXECUTABLE (LOW) vs MANUAL_ONLY.
 */

const AUTO_EXECUTABLE = Object.freeze([
  {
    id: 'increase_log_level',
    label: 'Aumentar nível de log (módulos security)',
    riskLevel: 'LOW',
    classification: 'AUTO_EXECUTABLE',
    rollbackAutomatic: true
  },
  {
    id: 'generate_snapshot',
    label: 'Gerar snapshot adicional SEC',
    riskLevel: 'LOW',
    classification: 'AUTO_EXECUTABLE',
    rollbackAutomatic: true
  },
  {
    id: 'amplified_evidence_collection',
    label: 'Colecta ampliada de evidências',
    riskLevel: 'LOW',
    classification: 'AUTO_EXECUTABLE',
    rollbackAutomatic: true
  },
  {
    id: 'trigger_correlation_sec02',
    label: 'Refresh correlação SEC-02',
    riskLevel: 'LOW',
    classification: 'AUTO_EXECUTABLE',
    rollbackAutomatic: true
  },
  {
    id: 'trigger_integrity_sec04',
    label: 'Verificação integridade SEC-04',
    riskLevel: 'LOW',
    classification: 'AUTO_EXECUTABLE',
    rollbackAutomatic: true
  },
  {
    id: 'consolidated_report',
    label: 'Relatório consolidado Enterprise Security',
    riskLevel: 'LOW',
    classification: 'AUTO_EXECUTABLE',
    rollbackAutomatic: true
  },
  {
    id: 'open_internal_incident',
    label: 'Abrir incidente interno SEC-13',
    riskLevel: 'LOW',
    classification: 'AUTO_EXECUTABLE',
    rollbackAutomatic: true
  }
]);

const MANUAL_ONLY = Object.freeze([
  { id: 'nginx_hardened_profile', reason: 'infra nginx — ciclo futuro' },
  { id: 'block_known_fingerprint', reason: 'bloqueio IP/fingerprint proibido SEC-13' },
  { id: 'rate_limit_profile', reason: 'rate limiting — aprovação humana' },
  { id: 'maintenance_mode', reason: 'disponibilidade — aprovação humana' },
  { id: 'restrict_admin', reason: 'acesso admin — aprovação humana' },
  { id: 'limit_uploads', reason: 'uploads — aprovação humana' },
  { id: 'hide_documentation', reason: 'superfície — aprovação humana' },
  { id: 'emergency_login_policy', reason: 'auth — aprovação humana' },
  { id: 'hide_admin_endpoints', reason: 'superfície — aprovação humana' },
  { id: 'reduce_api_exposure', reason: 'API — aprovação humana' },
  { id: 'pm2_restart', reason: 'PM2 proibido' },
  { id: 'firewall_change', reason: 'firewall proibido' },
  { id: 'ssh_change', reason: 'SSH proibido' },
  { id: 'lockdown', reason: 'lockdown proibido SEC-13' },
  { id: 'event_governance_change', reason: 'EG intocável' },
  { id: 'eco_change', reason: 'ECO intocável' },
  { id: 'cognitive_core_change', reason: 'Cognitive Core intocável' }
]);

function getAutoExecutableActions() {
  return AUTO_EXECUTABLE.map((a) => ({ ...a }));
}

function isAutoExecutable(actionId) {
  return AUTO_EXECUTABLE.some((a) => a.id === actionId);
}

function isManualOnly(actionId) {
  return MANUAL_ONLY.some((a) => a.id === actionId);
}

function getManualOnlyEntry(actionId) {
  return MANUAL_ONLY.find((a) => a.id === actionId) || null;
}

module.exports = {
  AUTO_EXECUTABLE,
  MANUAL_ONLY,
  getAutoExecutableActions,
  isAutoExecutable,
  isManualOnly,
  getManualOnlyEntry
};
