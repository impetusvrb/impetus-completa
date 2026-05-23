const DENIED = /uptime|oee|ebitda|producao|apr|loto|incidente.*sst|resumo executivo/i;

export function validateHrSemanticContext(context = {}) {
  const text = JSON.stringify({ titulo: context.perfil?.titulo, widgets: (context.widgets || []).map((w) => w.id) });
  return { ok: !DENIED.test(text), semantic_axis: 'hr', contaminated: DENIED.test(text) };
}

export default validateHrSemanticContext;
