'use strict';

const os = require('os');

let metrics = {
  activationRuns: 0,
  promotionSuccess: 0,
  promotionBlocked: 0,
  endpointChecks: 0,
  endpointFailures: 0,
  attackValidations: 0,
  lastResourceSample: null
};

function resetForTests() {
  metrics = {
    activationRuns: 0,
    promotionSuccess: 0,
    promotionBlocked: 0,
    endpointChecks: 0,
    endpointFailures: 0,
    attackValidations: 0,
    lastResourceSample: null
  };
}

function sampleResources() {
  const mem = process.memoryUsage();
  const sample = {
    sampledAt: new Date().toISOString(),
    heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
    rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
    externalMb: Math.round((mem.external / 1024 / 1024) * 100) / 100,
    uptimeSec: Math.round(process.uptime() * 100) / 100,
    loadAvg: os.loadavg(),
    freeMemMb: Math.round((os.freemem() / 1024 / 1024) * 100) / 100
  };
  metrics.lastResourceSample = sample;
  return sample;
}

function recordActivation(success) {
  metrics.activationRuns++;
  if (success) metrics.promotionSuccess++;
  else metrics.promotionBlocked++;
}

function recordEndpointCheck(ok) {
  metrics.endpointChecks++;
  if (!ok) metrics.endpointFailures++;
}

function recordAttackValidation() {
  metrics.attackValidations++;
}

function getSnapshot() {
  return { ...metrics, lastResourceSample: metrics.lastResourceSample ? { ...metrics.lastResourceSample } : null };
}

module.exports = {
  resetForTests,
  sampleResources,
  recordActivation,
  recordEndpointCheck,
  recordAttackValidation,
  getSnapshot
};
