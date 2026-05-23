'use strict';

const DENIED = /uptime|oee|ebitda|faturamento|margem|producao|apr\/pt|loto|incidente sst|heatmap seguranca|resumo executivo|centro de custos/i;

function validateHrSemanticPayload(payload = {}, centers = []) {
  const blob = JSON.stringify({ summary: payload.summary, centers, widgets: payload.widgets_promoted });
  const leaks = [];
  if (/uptime|oee|ebitda/i.test(blob)) leaks.push('industrial_executive');
  if (/apr|loto|incidente.*sst/i.test(blob)) leaks.push('safety');
  const industrialWidgets = (payload.widgets_promoted || []).filter((w) =>
    /resumo_executivo|grafico_producao|indicadores_executivos|diagrama_industrial/i.test(String(w.id || ''))
  );
  return {
    ok: leaks.length === 0 && industrialWidgets.length === 0,
    semantic_fidelity: leaks.length === 0 ? 0.91 : 0.42,
    leaks,
    industrial_generic_visible: industrialWidgets.length,
    safety_leak: leaks.includes('safety')
  };
}

module.exports = { validateHrSemanticPayload, DENIED };
