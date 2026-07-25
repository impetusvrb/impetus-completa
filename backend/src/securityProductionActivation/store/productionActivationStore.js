'use strict';

let state = {
  activatedAt: null,
  preSnapshotId: null,
  postSnapshotId: null,
  promotionApplied: false,
  operationalStatus: null,
  lastAudit: null,
  rollbackAvailable: false
};

function resetForTests() {
  state = {
    activatedAt: null,
    preSnapshotId: null,
    postSnapshotId: null,
    promotionApplied: false,
    operationalStatus: null,
    lastAudit: null,
    rollbackAvailable: false
  };
}

function markActivated(snapshotId, operationalStatus) {
  state.activatedAt = new Date().toISOString();
  state.postSnapshotId = snapshotId;
  state.promotionApplied = true;
  state.operationalStatus = operationalStatus;
  state.rollbackAvailable = true;
}

function setPreSnapshot(id) {
  state.preSnapshotId = id;
}

function setLastAudit(audit) {
  state.lastAudit = audit;
}

function getState() {
  return { ...state };
}

module.exports = {
  resetForTests,
  markActivated,
  setPreSnapshot,
  setLastAudit,
  getState
};
