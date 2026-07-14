'use strict';

/**
 * Política de pesos do score SEC-RECON — documentação e implementação única.
 */
const SCORE_WEIGHTS = Object.freeze([
  {
    signal: 'TECHNOLOGY_MISMATCH_PROBE',
    weight: 4,
    ttlMs: 120000,
    deduplication: 'per_path_first_hit_full',
    maxContribution: 4,
    stateImpact: 'high'
  },
  {
    signal: 'CREDENTIAL_PROBE',
    weight: 3,
    ttlMs: 120000,
    deduplication: 'per_path_first_hit_full',
    maxContribution: 3,
    stateImpact: 'high'
  },
  {
    signal: 'HTTP_404_FLOOD',
    weight: 5,
    ttlMs: 120000,
    deduplication: 'once_per_window',
    maxContribution: 5,
    stateImpact: 'critical'
  },
  {
    signal: 'PATH_DISCOVERY',
    weight: 1,
    ttlMs: 120000,
    deduplication: 'distinct_path_only',
    maxContribution: null,
    stateImpact: 'medium'
  },
  {
    signal: 'SCANNER_UA',
    weight: 3,
    ttlMs: 120000,
    deduplication: 'once_per_window',
    maxContribution: 3,
    stateImpact: 'high'
  },
  {
    signal: 'NOT_FOUND_HIT',
    weight: 0.5,
    ttlMs: 120000,
    deduplication: 'distinct_path_only',
    maxContribution: null,
    stateImpact: 'low'
  },
  {
    signal: 'DISTINCT_PATHS_10',
    weight: 2,
    ttlMs: 120000,
    deduplication: 'threshold_once',
    maxContribution: 2,
    stateImpact: 'medium'
  },
  {
    signal: 'DISTINCT_PATHS_30',
    weight: 3,
    ttlMs: 120000,
    deduplication: 'threshold_once',
    maxContribution: 3,
    stateImpact: 'high'
  },
  {
    signal: 'PROBE_HITS_2',
    weight: 2,
    ttlMs: 120000,
    deduplication: 'threshold_once',
    maxContribution: 2,
    stateImpact: 'high'
  },
  {
    signal: 'EXTERNAL_BAN_OBSERVED',
    weight: 1,
    ttlMs: 120000,
    deduplication: 'once_per_window',
    maxContribution: 1,
    stateImpact: 'forces_contain'
  },
  {
    signal: 'VALIDATED_IDENTITY',
    weight: -3,
    ttlMs: 120000,
    deduplication: 'per_request',
    maxContribution: -3,
    stateImpact: 'reducer'
  }
]);

const STATE_THRESHOLDS = Object.freeze({
  OBSERVE: { min: 0, max: 2 },
  SUSPECT: { min: 3, max: 5 },
  THROTTLE: { min: 6, max: 8 },
  CONTAIN: { min: 9, max: Infinity }
});

function getScoreWeightsTable() {
  return SCORE_WEIGHTS;
}

function getStateThresholds() {
  return STATE_THRESHOLDS;
}

module.exports = {
  SCORE_WEIGHTS,
  STATE_THRESHOLDS,
  getScoreWeightsTable,
  getStateThresholds
};
