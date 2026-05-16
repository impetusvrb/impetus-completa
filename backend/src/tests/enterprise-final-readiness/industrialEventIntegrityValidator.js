'use strict';

const path = require('path');
const { check, phaseResult } = require('./common/readinessResult');

const ROOT = path.resolve(__dirname, '../..');

function validate() {
  const { validateCatalogType, parseIndustrialEventType } = require(path.join(
    ROOT,
    'eventPipeline/catalog/industrialEventCatalog'
  ));
  const contract = require(path.join(ROOT, 'domains/quality/contracts/qualityDomainContract'));

  const checks = [];
  for (const ev of contract.EVENTS) {
    const parsed = parseIndustrialEventType(ev);
    checks.push(check(`pattern_${ev}`, parsed != null, 'fail', ev));
    const v = validateCatalogType(ev, { strict: true });
    checks.push(check(`catalog_${ev}`, v.ok, 'fail', v.reason || ''));
  }

  const dup = new Set();
  let dupFound = false;
  for (const ev of contract.EVENTS) {
    if (dup.has(ev)) dupFound = true;
    dup.add(ev);
  }
  checks.push(check('quality_contract_events_no_dup', !dupFound));

  return phaseResult('P4', 'Industrial Event Integrity', checks);
}

module.exports = { validate };
