'use strict';

function learnOrganizationalStability(store = {}) {
  const snapshots = store.snapshots || [];
  const stable = snapshots.filter((s) => s.runtime_safe !== false).length;
  return { stability_ratio: stable / Math.max(snapshots.length, 1), stable: stable >= snapshots.length * 0.8 };
}

module.exports = { learnOrganizationalStability };
