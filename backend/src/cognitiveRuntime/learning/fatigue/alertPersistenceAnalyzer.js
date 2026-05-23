'use strict';

function analyzeAlertPersistence(store = {}) {
  const snapshots = store.snapshots || [];
  const highAlerts = snapshots.filter((s) => (s.alert_count ?? 0) > 3).length;
  return { alert_persistence: highAlerts >= 2, occurrences: highAlerts };
}

module.exports = { analyzeAlertPersistence };
