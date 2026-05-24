'use strict';

function adviseDriftRollback(drift = {}, regression = {}, integrity = {}) {
  const rollback_recommended = regression.rollback_recommended === true || drift.drift_severity === 'high';
  const quarantine_recommended = drift.drift_severity === 'high' && !integrity.integrity_safe;
  const authoritative_reduction_suggested =
    drift.drift_dimensions?.includes('authority') && drift.drift_severity !== 'none';

  const mitigation = [];
  if (rollback_recommended) mitigation.push('rollback_observational — rever flags C4/C5 shadow');
  if (quarantine_recommended) mitigation.push('quarantine_runtime — isolar tenant em auditoria');
  if (authoritative_reduction_suggested) mitigation.push('reduce_authoritative_controlled — manter CONTROLLED');
  if (drift.drift_dimensions?.includes('economic')) mitigation.push('economic_heuristic_review');
  if (!mitigation.length) mitigation.push('continue_monitoring');

  return {
    rollback_recommended,
    quarantine_recommended,
    authoritative_reduction_suggested,
    drift_mitigation_plan: mitigation,
    auto_rollback_executed: false,
    auto_quarantine_executed: false,
    supervised_only: true,
    auto_decisions: false
  };
}

module.exports = { adviseDriftRollback };
