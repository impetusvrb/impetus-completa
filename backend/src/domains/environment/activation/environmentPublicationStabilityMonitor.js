'use strict';

let _ok = 0;
let _fail = 0;

function notePublicationOk() {
  _ok += 1;
}

function notePublicationFail() {
  _fail += 1;
}

function getStabilitySnapshot() {
  const total = _ok + _fail;
  return {
    ok_count: _ok,
    fail_count: _fail,
    ok_ratio: total ? _ok / total : 1,
    menu_stability_protected: true
  };
}

module.exports = {
  notePublicationOk,
  notePublicationFail,
  getStabilitySnapshot
};
