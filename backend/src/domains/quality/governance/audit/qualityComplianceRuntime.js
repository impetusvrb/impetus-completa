'use strict';

const FRAMEWORKS = Object.freeze(['FDA_21CFR11', 'ISO_9001', 'ISO_13485']);

function tagComplianceContext(evidence = {}) {
  const tags = [];
  if (evidence.electronic_signature) tags.push('FDA_21CFR11');
  if (evidence.qms_scope) tags.push('ISO_9001');
  if (evidence.medical_device) tags.push('ISO_13485');
  return { frameworks_considered: FRAMEWORKS, matched_tags: tags, advisory_only: true };
}

module.exports = {
  FRAMEWORKS,
  tagComplianceContext
};
