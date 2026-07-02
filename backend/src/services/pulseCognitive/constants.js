/**
 * CERT-PULSE-02 — Constantes do Pulse Cognitivo Organizacional.
 */
'use strict';

const DIMENSIONS = [
  { key: 'engagement', label: 'Engajamento', weight: 0.15 },
  { key: 'participation', label: 'Participação', weight: 0.12 },
  { key: 'development', label: 'Desenvolvimento', weight: 0.1 },
  { key: 'collaboration', label: 'Colaboração', weight: 0.1 },
  { key: 'learning', label: 'Aprendizado', weight: 0.08 },
  { key: 'stability', label: 'Estabilidade', weight: 0.15 },
  { key: 'integration', label: 'Integração', weight: 0.1 },
  { key: 'consistency', label: 'Consistência', weight: 0.1 },
  { key: 'evolution', label: 'Evolução', weight: 0.1 }
];

const ORGANIZATIONAL_STATES = {
  healthy_team: { label: 'Equipe saudável', severity: 'info' },
  stable_team: { label: 'Equipe estável', severity: 'info' },
  growing_team: { label: 'Equipe em crescimento', severity: 'info' },
  overloaded_team: { label: 'Equipe sobrecarregada', severity: 'watch' },
  disengaged_team: { label: 'Equipe desengajada', severity: 'elevated' },
  transforming_team: { label: 'Equipe em transformação', severity: 'watch' },
  at_risk_team: { label: 'Equipe em risco', severity: 'critical' }
};

const EVENT_TYPES = [
  'tpm_recorded',
  'proacao_submitted',
  'intelligent_registration',
  'training_completed',
  'role_changed',
  'sector_changed',
  'hierarchy_changed',
  'overtime_recorded',
  'recognition',
  'quality_event',
  'sst_incident',
  'near_miss',
  'communication',
  'improvement_participation',
  'task_completed',
  'procedure_compliance',
  'internal_event',
  'pulse_self_evaluation',
  'pulse_supervisor_perception',
  'pdi_update',
  'absence_recorded',
  'vacation_recorded',
  'os_completed',
  'reconciliation_scan'
];

const SCOPE_TYPES = ['team', 'sector', 'shift', 'supervisor', 'department', 'unit', 'company'];

const GOVERNANCE = {
  assistive_only: true,
  human_in_the_loop: true,
  no_absolute_labels: true,
  min_confidence_display: 0.35
};

module.exports = {
  DIMENSIONS,
  ORGANIZATIONAL_STATES,
  EVENT_TYPES,
  SCOPE_TYPES,
  GOVERNANCE
};
