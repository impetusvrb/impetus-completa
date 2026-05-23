'use strict';

const HR = /turnover|absenteismo|headcount|pulse rh|treinamento rh/i;
const SST = /apr\/pt|loto|incidente sst|heatmap seguranca/i;
const EXEC = /ebitda|faturamento|margem|boardroom|resumo executivo|centro_custos/i;

function validateProductionSemanticIsolation(payload = {}, consolidated = {}) {
  const blob = JSON.stringify({ payload, consolidated });
  const leaks = [];
  if (HR.test(blob)) leaks.push('hr');
  if (SST.test(blob)) leaks.push('sst');
  if (EXEC.test(blob)) leaks.push('executive_finance');
  return {
    cross_domain_clean: leaks.length === 0,
    leaks,
    internal_correlation_allowed: true
  };
}

module.exports = { validateProductionSemanticIsolation };
