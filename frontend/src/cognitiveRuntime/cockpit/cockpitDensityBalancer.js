/**
 * Z.23 — Evita overload visual no cliente (cap de hints)
 */

export function balanceCockpitDensity(context = {}, maxHints = 6) {
  const questions = context?.decisionSupport?.questions || [];
  return {
    questions: questions.slice(0, maxHints),
    capped: questions.length > maxHints
  };
}

export default balanceCockpitDensity;
