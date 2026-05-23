'use strict';

const { isDomainIsolatedFrom, getDomainIsolationRules } = require('../registry/cognitiveDomainRegistry');

function validateCrossDomainIsolation(sourceDomain, blocks = []) {
  const rules = getDomainIsolationRules(sourceDomain);
  const violations = [];

  for (const b of blocks) {
    const blockDomain = b.domain || _extractDomain(b.block_id || b.id);
    if (!blockDomain || blockDomain === sourceDomain) continue;
    if (isDomainIsolatedFrom(sourceDomain, blockDomain)) {
      violations.push({
        block_id: b.block_id || b.id,
        block_domain: blockDomain,
        source_domain: sourceDomain,
        violation: 'cross_domain_blocked'
      });
    }
  }

  return {
    isolated: violations.length === 0,
    violations,
    violation_count: violations.length,
    governance_rules: rules
  };
}

function filterBlocksByDomainIsolation(sourceDomain, blocks = []) {
  const result = validateCrossDomainIsolation(sourceDomain, blocks);
  if (result.isolated) return { blocks, filtered_count: 0, violations: [] };

  const violatedIds = new Set(result.violations.map((v) => v.block_id));
  return {
    blocks: blocks.filter((b) => !violatedIds.has(b.block_id || b.id)),
    filtered_count: violatedIds.size,
    violations: result.violations
  };
}

function _extractDomain(blockId = '') {
  const parts = String(blockId).split('.');
  if (parts.length >= 2) {
    const prefix = parts[0];
    const map = { quality: 'quality', sst: 'safety', hr: 'hr', env: 'environmental', maint: 'maintenance', prod: 'production', exec: 'executive' };
    return map[prefix] || prefix;
  }
  return null;
}

module.exports = { validateCrossDomainIsolation, filterBlocksByDomainIsolation };
