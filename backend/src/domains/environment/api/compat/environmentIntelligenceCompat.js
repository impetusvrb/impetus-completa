'use strict';

const isolation = require('../../../_core/domainIsolationGuard');
let legacy;

function svc() {
  if (!legacy) {
    try {
      legacy = require('../../../../services/environmentalCognitiveService');
    } catch {
      legacy = { getEnvironmentalSnapshot: async () => ({ ok: true, assistive_only: true }) };
    }
  }
  return legacy;
}

module.exports = {
  domainId: 'environment',
  delegate: () => svc(),
  async snapshot(companyId) {
    return isolation.wrapAclCall('environment', 'platform', () =>
      svc().getEnvironmentalSnapshot?.(companyId) || svc()
    );
  }
};
