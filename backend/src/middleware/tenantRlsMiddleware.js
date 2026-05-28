'use strict';

const flags = require('../tenant-isolation/config/tenantRlsFlags');
const gov = require('../tenant-isolation/governance/tenantRlsGovernanceService');
const tenantDb = require('../tenant-isolation/runtime/tenantDbContext');

/**
 * Define contexto de tenant para RLS (AsyncLocalStorage) após autenticação.
 * additive-only — no-op quando RLS off ou tenant fora do piloto.
 */
function tenantRlsContext(req, res, next) {
  if (!flags.isRlsEnabled() || !req.user?.company_id) {
    return next();
  }
  if (!gov.isActiveForTenant(req.user.company_id)) {
    return next();
  }

  tenantDb.setRequestTenant(req.user.company_id);

  res.on('finish', () => {
    tenantDb.setRequestTenant(null);
  });

  return next();
}

module.exports = { tenantRlsContext };
