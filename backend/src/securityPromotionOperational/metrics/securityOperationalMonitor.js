'use strict';

const counters = {
  promotion_success: 0,
  promotion_failure: 0,
  promotion_duration: 0,
  rollback_count: 0,
  runtime_errors: 0,
  operational_score: 0,
  security_modules_online: 0,
  security_modules_offline: 0,
  validations: 0
};

function increment(name, n = 1) {
  if (Object.prototype.hasOwnProperty.call(counters, name)) counters[name] += n;
}

function setOperationalScore(n) {
  counters.operational_score = Math.min(100, Math.max(0, Math.floor(n)));
}

function setModulesOnline(n) {
  counters.security_modules_online = n;
}

function setModulesOffline(n) {
  counters.security_modules_offline = n;
}

function recordDuration(ms) {
  counters.promotion_duration = ms;
}

function getSnapshot() {
  return { ...counters };
}

function resetForTests() {
  Object.keys(counters).forEach((k) => { counters[k] = 0; });
}

module.exports = { increment, setOperationalScore, setModulesOnline, setModulesOffline, recordDuration, getSnapshot, resetForTests };
