'use strict';

function validateEnvironmentalSemanticPayload(payload = {}, centers = []) {
  const blob = JSON.stringify({ payload, centers, widgets: payload.widgets_promoted });
  const leaks = [];
  if (/oee|throughput|producao do turno|turnover|absenteismo|ebitda|boardroom executivo/i.test(blob)) leaks.push('non_environmental');
  if (/apr\/pt|loto|incidente sst/i.test(blob)) leaks.push('sst_visual');
  return { ok: leaks.length === 0, leaks, cross_domain_visual_leak: leaks.length > 0, semantic_fidelity: leaks.length === 0 ? 0.92 : 0.38 };
}

module.exports = { validateEnvironmentalSemanticPayload };
