'use strict';

const SUPPLY_EVENT_PREFIX = 'supply.';

function isSupplyEvent(type) {
  return String(type || '').startsWith(SUPPLY_EVENT_PREFIX);
}

function buildSupplyEventType(suffix) {
  const s = String(suffix || '').replace(/^supply\./, '');
  return `${SUPPLY_EVENT_PREFIX}${s}`;
}

module.exports = {
  SUPPLY_EVENT_PREFIX,
  isSupplyEvent,
  buildSupplyEventType
};
