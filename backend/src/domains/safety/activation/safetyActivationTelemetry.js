'use strict';

let _shadow = 0;

function noteShadowPublication() {
  _shadow += 1;
}

function getActivationTelemetrySnapshot() {
  return { shadow_publication_total: _shadow };
}

module.exports = {
  noteShadowPublication,
  getActivationTelemetrySnapshot
};
