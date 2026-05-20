'use strict';

function compareLegacyVsPrecise(legacy, precise) {
  const legacyModules = new Set(legacy?.visible_modules || []);
  const preciseModules = new Set(precise?.visible_modules || precise?.precise_modules || []);
  const overdelivery = [...legacyModules].filter((m) => !preciseModules.has(m));
  const underdelivery = [...preciseModules].filter((m) => !legacyModules.has(m));

  return {
    match: overdelivery.length === 0 && underdelivery.length === 0,
    overdelivery,
    underdelivery,
    legacy_count: legacyModules.size,
    precise_count: preciseModules.size,
    delivery_mismatch: overdelivery.length + underdelivery.length
  };
}

function compareDomainVsExposure(domain, exposureList = []) {
  const mismatches = exposureList.filter((e) => e.domain && e.domain !== domain && e.domain !== 'shared');
  return {
    domain,
    mismatch_count: mismatches.length,
    mismatches
  };
}

module.exports = { compareLegacyVsPrecise, compareDomainVsExposure };
