'use strict';

const flags = require('../config/sz2FeatureFlags');

function pruneByRetention(entries = []) {
  const ttlMin = flags.memoryRetentionMinutes();
  const cutoff = Date.now() - ttlMin * 60 * 1000;
  return entries.filter((e) => (e?.ts || 0) >= cutoff);
}

function pruneByCap(entries = []) {
  const cap = flags.memoryMaxEntriesPerTenant();
  if (entries.length <= cap) return entries;
  return entries.slice(entries.length - cap);
}

function applyRetention(entries = []) {
  return pruneByCap(pruneByRetention(entries));
}

module.exports = { applyRetention, pruneByRetention, pruneByCap };
