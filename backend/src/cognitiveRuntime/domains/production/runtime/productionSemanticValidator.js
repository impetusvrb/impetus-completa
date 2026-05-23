'use strict';

function validateProductionSemanticPayload(payload = {}, centers = []) {
  const blob = JSON.stringify({ centers, widgets: payload.widgets_promoted, summary: payload.summary });
  const leaks = [];
  if (/turnover|absenteismo|headcount|pulse rh|treinamento rh/i.test(blob)) leaks.push('hr');
  if (/apr\/pt|loto|incidente sst|heatmap seguranca/i.test(blob)) leaks.push('sst');
  if (/ebitda|faturamento|margem|lucro|boardroom|resumo executivo corporativo/i.test(blob)) leaks.push('executive_finance');
  if (/esg executivo|relatorio esg board/i.test(blob)) leaks.push('esg_executive');

  const hrWidgets = (payload.widgets_promoted || []).filter((w) =>
    /pulse_rh|rh_|turnover/i.test(String(w.id || ''))
  );

  return {
    ok: leaks.length === 0 && hrWidgets.length === 0,
    semantic_fidelity: leaks.length === 0 ? 0.93 : 0.4,
    leaks,
    cross_domain_visual_leak: leaks.length > 0
  };
}

module.exports = { validateProductionSemanticPayload };
