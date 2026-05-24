'use strict';

const flags = require('../config/sz3FeatureFlags');

const _m = {
  applied_total: 0,
  language_mature_total: 0,
  calibration_applied_total: 0,
  pattern_matched_total: 0,
  scenario_matched_total: 0,
  priority_uplifted_total: 0,
  noise_suppressed_total: 0,
  errors_total: 0,
  last_language_quality: 0,
  last_overall_quality: 0,
  last_noise_level: '',
  events: []
};

const MAX_EVENTS = 120;

function emit(evt) {
  if (!flags.isObservabilityEnabled()) return;
  const e = { ts: new Date().toISOString(), ...evt };
  _m.events.push(e);
  if (_m.events.length > MAX_EVENTS) _m.events.shift();
}

function record({
  language_quality = null,
  overall_quality = null,
  noise_level = null,
  pattern_matched = false,
  scenario_matched = false,
  priority_uplifted = false,
  noise_suppressed = false,
  error = false,
  language_mature = false,
  calibration_applied = false
} = {}) {
  _m.applied_total += 1;
  if (language_mature) _m.language_mature_total += 1;
  if (calibration_applied) _m.calibration_applied_total += 1;
  if (pattern_matched) _m.pattern_matched_total += 1;
  if (scenario_matched) _m.scenario_matched_total += 1;
  if (priority_uplifted) _m.priority_uplifted_total += 1;
  if (noise_suppressed) _m.noise_suppressed_total += 1;
  if (error) _m.errors_total += 1;
  if (language_quality != null) _m.last_language_quality = language_quality;
  if (overall_quality != null) _m.last_overall_quality = overall_quality;
  if (noise_level != null) _m.last_noise_level = noise_level;
}

function snapshot() {
  return JSON.parse(JSON.stringify(_m));
}

module.exports = { emit, record, snapshot };
