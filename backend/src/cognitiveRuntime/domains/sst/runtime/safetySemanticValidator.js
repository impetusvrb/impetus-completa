'use strict';

const DENIED_TERMS = /produ[cç][aã]o|uptime|oee|ebitda|efici[eê]ncia industrial|centro de custos|esg executivo|resumo executivo/i;

function validateSafetySemanticPayload(payload = {}, centers = []) {
  const leaks = [];
  const text = JSON.stringify({ summary: payload.summary, centers });
  for (const term of ['producao', 'uptime', 'oee', 'ebitda']) {
    if (DENIED_TERMS.test(text)) leaks.push(term);
  }
  const industrialGeneric = (payload.widgets_promoted || []).filter((w) =>
    /resumo_executivo|indicadores_executivos|grafico_producao|centro_custos/i.test(String(w.id || ''))
  );
  return {
    ok: leaks.length === 0 && industrialGeneric.length === 0,
    semantic_fidelity: leaks.length === 0 ? 0.92 : 0.45,
    leaks,
    industrial_generic_visible: industrialGeneric.length
  };
}

module.exports = { validateSafetySemanticPayload };
