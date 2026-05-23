/**
 * Z.25 — Isolamento semântico SST (sem bleed industrial/executivo)
 */

const DENIED = /produ[cç][aã]o|uptime|oee|ebitda|resumo executivo|centro de custos/i;

export function validateSafetySemanticContext(context = {}) {
  const text = JSON.stringify({
    titulo: context.perfil?.titulo,
    widgets: (context.widgets || []).map((w) => w.id)
  });
  const contaminated = DENIED.test(text);
  return { ok: !contaminated, semantic_axis: 'safety', contaminated };
}

export default validateSafetySemanticContext;
