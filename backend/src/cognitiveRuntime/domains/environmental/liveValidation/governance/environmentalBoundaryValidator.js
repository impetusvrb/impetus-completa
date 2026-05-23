'use strict';

function validateEnvironmentalBoundary(payload = {}) {
  const blob = JSON.stringify(payload);
  const leaks = [];
  if (/oee|production_shift|throughput turno/i.test(blob)) leaks.push('production');
  if (/turnover|absenteismo|pulse rh/i.test(blob)) leaks.push('hr');
  if (/apr\/pt|loto|incidente sst/i.test(blob)) leaks.push('sst');
  if (/ebitda|boardroom executivo|resumo executivo/i.test(blob)) leaks.push('executive');
  return { cross_domain_clean: leaks.length === 0, leaks, internal_correlation_allowed: true };
}

module.exports = { validateEnvironmentalBoundary };
