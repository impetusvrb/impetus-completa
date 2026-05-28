'use strict';

const regionCatalog = require('../catalog/regionCatalog');
const flags = require('../config/enterpriseLocaleFlags');

/**
 * Política de residência de dados — advisory; não bloqueia hot paths em shadow.
 */
function evaluateResidency({ regionCode, targetRegion, operation = 'read' } = {}) {
  const home = regionCatalog.getRegion(regionCode || flags.defaultRegionCode());
  const target = regionCatalog.getRegion(targetRegion || home.code);

  const cross_border = home.code !== target.code;
  const allowed =
    !cross_border ||
    String(process.env.IMPETUS_DATA_RESIDENCY_STRICT || '').toLowerCase() !== 'on';

  return {
    home_region: home.code,
    target_region: target.code,
    data_residency: home.data_residency,
    storage_zone: home.storage_zone,
    operation,
    cross_border,
    allowed,
    policy: allowed ? 'permit' : 'deny_cross_border',
    note: cross_border
      ? 'Transferência cross-region requer DPA/GDPR alignment documentado.'
      : 'Dados na região home do tenant.'
  };
}

module.exports = { evaluateResidency };
