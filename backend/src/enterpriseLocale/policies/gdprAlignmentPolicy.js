'use strict';

/**
 * Alinhamento GDPR ↔ LGPD (checklist operacional, sem bypass de DSR existente).
 */

function buildGdprAlignmentPack(regionCode = 'BR') {
  const isEu = String(regionCode).toUpperCase() === 'EU';
  return {
    framework: isEu ? 'gdpr' : 'lgpd_primary',
    dpa_required: isEu,
    lawful_basis_documented: true,
    data_subject_rights: {
      export: String(process.env.IMPETUS_DSR_EXPORT || '').toLowerCase() === 'on',
      erase: String(process.env.IMPETUS_DSR_ERASE || '').toLowerCase() === 'on',
      erase_strict: String(process.env.IMPETUS_DSR_ERASE_STRICT || '').toLowerCase() === 'on'
    },
    retention: {
      mode: process.env.IMPETUS_RETENTION_MODE || 'off',
      enabled: String(process.env.IMPETUS_RETENTION_ENABLED || '').toLowerCase() === 'true'
    },
    anonymization: {
      ai: String(process.env.IMPETUS_AI_ANONYMIZATION || '').toLowerCase() === 'on',
      sz5: String(process.env.IMPETUS_SZ5_ANONYMIZATION_MODE || '').toLowerCase() === 'on'
    },
    explainability_required: true,
    cross_border_transfer: isEu
      ? 'Requires SCC/adequacy decision — use data residency EU zone.'
      : 'LGPD international transfer rules apply when leaving BR.'
  };
}

module.exports = { buildGdprAlignmentPack };
