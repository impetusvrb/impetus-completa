'use strict';

/**
 * WAVE 7 — Feature flags de governança industrial.
 * Todos os módulos desactivados por defeito (observe-only ou structure-only).
 */

function envBool(name, def = false) {
  const v = process.env[name];
  if (v === undefined || v === '') return def;
  return v.toLowerCase() === 'true';
}

/** Habilita todo o módulo WAVE 7. */
const GOVERNANCE_V7_ENABLED = envBool('IMPETUS_GOVERNANCE_V7_ENABLED', false);

/** ABAC extension activo; sem isso as políticas são observe-only. */
const ABAC_ENFORCE = envBool('IMPETUS_ABAC_ENFORCE', false);

/** Audit industrial activo (dual-write). */
const INDUSTRIAL_AUDIT_ENABLED = envBool('IMPETUS_INDUSTRIAL_AUDIT_ENABLED', false);

/** Hash chain para tamper-evidence nos registos de auditoria. */
const AUDIT_HASH_CHAIN_ENABLED = envBool('IMPETUS_AUDIT_HASH_CHAIN_ENABLED', false);

/** LGPD: classifica dados e regista consentimento (structure, não enforça). */
const LGPD_CLASSIFICATION_ENABLED = envBool('IMPETUS_LGPD_CLASSIFICATION_ENABLED', false);

/** Rastreabilidade industrial (chain-of-custody). */
const TRACEABILITY_ENABLED = envBool('IMPETUS_TRACEABILITY_ENABLED', false);

/** Capability matrix workflow × role (observe). */
const WORKFLOW_CAPABILITY_MATRIX_ENABLED = envBool('IMPETUS_WORKFLOW_CAPABILITY_MATRIX_ENABLED', false);

/** Permissão de workflow (observe → enforce). */
const WORKFLOW_PERMISSION_ENFORCE = envBool('IMPETUS_WORKFLOW_PERMISSION_ENFORCE', false);

/** Domain capability governance activa. */
const DOMAIN_CAPABILITY_GOVERNANCE_ENABLED = envBool('IMPETUS_DOMAIN_CAPABILITY_GOVERNANCE_ENABLED', false);

module.exports = {
  GOVERNANCE_V7_ENABLED,
  ABAC_ENFORCE,
  INDUSTRIAL_AUDIT_ENABLED,
  AUDIT_HASH_CHAIN_ENABLED,
  LGPD_CLASSIFICATION_ENABLED,
  TRACEABILITY_ENABLED,
  WORKFLOW_CAPABILITY_MATRIX_ENABLED,
  WORKFLOW_PERMISSION_ENFORCE,
  DOMAIN_CAPABILITY_GOVERNANCE_ENABLED
};
