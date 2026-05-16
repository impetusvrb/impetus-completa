'use strict';

/**
 * WAVE 7 — LGPD Industrial Preparation.
 * Classificação de dados + hooks de consentimento (structure-only por defeito).
 * Não enforça anonimização nem exclui dados automaticamente.
 * Flag: IMPETUS_LGPD_CLASSIFICATION_ENABLED (default false).
 *
 * Categorias LGPD aplicadas ao contexto industrial:
 *   personal   — dados pessoais (nome, CPF, email, IP)
 *   sensitive  — dados sensíveis (saúde, biometria) — Art. 5 IX LGPD
 *   operational — KPIs de máquina, eventos operacionais (não pessoal)
 *   industrial  — telemetria industrial, alertas (não pessoal)
 */

const { LGPD_CLASSIFICATION_ENABLED } = require('./governanceFlags');

/** @type {Map<string, object>} fieldPath → classification */
const _classifications = new Map();

const LGPD_CATEGORY = Object.freeze({
  PERSONAL: 'personal',
  SENSITIVE: 'sensitive',
  OPERATIONAL: 'operational',
  INDUSTRIAL: 'industrial'
});

const RETENTION_DAYS = Object.freeze({
  personal: 5 * 365,
  sensitive: 3 * 365,
  operational: 10 * 365,
  industrial: 10 * 365
});

const ANONYMIZATION_REQUIRED = Object.freeze({
  personal: true,
  sensitive: true,
  operational: false,
  industrial: false
});

// ── Built-in field classifications ─────────────────────────────────────────

const BUILT_IN_CLASSIFICATIONS = [
  // Dados pessoais
  { field: 'users.name', category: LGPD_CATEGORY.PERSONAL, description: 'Nome do utilizador' },
  { field: 'users.email', category: LGPD_CATEGORY.PERSONAL, description: 'E-mail do utilizador' },
  { field: 'users.cpf', category: LGPD_CATEGORY.SENSITIVE, description: 'CPF (documento fiscal)' },
  { field: 'users.phone', category: LGPD_CATEGORY.PERSONAL, description: 'Telefone' },
  { field: 'audit_logs.ip_address', category: LGPD_CATEGORY.PERSONAL, description: 'Endereço IP' },
  // Dados sensíveis (Art. 5 IX LGPD)
  { field: 'health_records.*', category: LGPD_CATEGORY.SENSITIVE, description: 'Dados de saúde' },
  { field: 'biometric.*', category: LGPD_CATEGORY.SENSITIVE, description: 'Dados biométricos' },
  // Dados operacionais (não pessoais)
  { field: 'machine_events.*', category: LGPD_CATEGORY.OPERATIONAL, description: 'Eventos de máquina' },
  { field: 'kpi_data.*', category: LGPD_CATEGORY.OPERATIONAL, description: 'Métricas KPI' },
  { field: 'operational_alerts.*', category: LGPD_CATEGORY.OPERATIONAL, description: 'Alertas operacionais' },
  // Dados industriais
  { field: 'telemetry_timeseries_v1.*', category: LGPD_CATEGORY.INDUSTRIAL, description: 'Telemetria industrial' },
  { field: 'industrial_telemetry_samples.*', category: LGPD_CATEGORY.INDUSTRIAL, description: 'Amostras industriais' },
  { field: 'industrial_audit_events.*', category: LGPD_CATEGORY.INDUSTRIAL, description: 'Eventos de auditoria industrial' }
];

for (const c of BUILT_IN_CLASSIFICATIONS) {
  _classifications.set(c.field, Object.freeze({ ...c, retention_days: RETENTION_DAYS[c.category], anonymization_required: ANONYMIZATION_REQUIRED[c.category] }));
}

/**
 * Regista uma classificação de campo.
 * @param {{ field: string, category: string, description?: string }} entry
 */
function classifyField(entry) {
  if (!entry || !entry.field || !entry.category) throw new Error('field and category required');
  const category = String(entry.category || LGPD_CATEGORY.PERSONAL);
  _classifications.set(entry.field, Object.freeze({
    ...entry,
    retention_days: RETENTION_DAYS[category] || RETENTION_DAYS.personal,
    anonymization_required: ANONYMIZATION_REQUIRED[category] ?? true
  }));
}

/**
 * Retorna a classificação de um campo.
 * @param {string} field
 */
function getFieldClassification(field) {
  return _classifications.get(String(field || '')) || null;
}

/**
 * Lista todas as classificações.
 */
function listClassifications() {
  return Array.from(_classifications.values());
}

/**
 * Retorna campos que requerem anonimização.
 */
function listFieldsRequiringAnonymization() {
  return listClassifications().filter((c) => c.anonymization_required);
}

// ── Consent tracking hooks (structure-only) ─────────────────────────────────

/** @type {Array<object>} registo em memória de consentimentos */
const _consentLog = [];
const MAX_CONSENT_LOG = 10000;

/**
 * Regista hook de consentimento (structure-only — não actua por si).
 * @param {{ user_id: string, company_id: string, purpose: string, granted: boolean }} consent
 */
function recordConsentHook(consent) {
  if (!LGPD_CLASSIFICATION_ENABLED) return { ok: true, mode: 'disabled' };
  const entry = {
    ...consent,
    recorded_at: new Date().toISOString(),
    id: `consent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  };
  if (_consentLog.length >= MAX_CONSENT_LOG) _consentLog.shift();
  _consentLog.push(entry);
  return { ok: true, id: entry.id };
}

/**
 * Lista consentimentos registados (em memória).
 */
function listConsentLog() {
  return [..._consentLog];
}

/**
 * Estatísticas LGPD.
 */
function getLgpdStats() {
  return {
    enabled: LGPD_CLASSIFICATION_ENABLED,
    classified_fields: _classifications.size,
    consent_records: _consentLog.length,
    fields_requiring_anonymization: listFieldsRequiringAnonymization().length
  };
}

module.exports = {
  LGPD_CATEGORY,
  RETENTION_DAYS,
  ANONYMIZATION_REQUIRED,
  classifyField,
  getFieldClassification,
  listClassifications,
  listFieldsRequiringAnonymization,
  recordConsentHook,
  listConsentLog,
  getLgpdStats
};
