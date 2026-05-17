'use strict';

const { resolveDomainAudienceBand } = require('../../../../../shared/domain-publication/domainAudienceResolver.cjs');

const EXTENDED_AUDIENCES = Object.freeze([
  'operator',
  'inspector',
  'laboratory',
  'supervisor',
  'coordinator',
  'director',
  'auditor',
  'production',
  'maintenance',
  'third_party'
]);

function resolveQualityAudienceForActivation(user) {
  const band = resolveDomainAudienceBand(user, { defaultBand: 'production' });
  return {
    band,
    extended_supported: EXTENDED_AUDIENCES.includes(band),
    audiences_catalog: EXTENDED_AUDIENCES
  };
}

function previewAudienceMatrix(sampleUsers = []) {
  const out = [];
  for (const u of sampleUsers) {
    out.push({
      user_id: u?.id || null,
      role: u?.role || null,
      resolved: resolveQualityAudienceForActivation(u)
    });
  }
  return out;
}

module.exports = {
  resolveQualityAudienceForActivation,
  previewAudienceMatrix,
  EXTENDED_AUDIENCES
};
