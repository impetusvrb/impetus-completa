export function applyUsefulnessHints(context = {}, adaptive = null) {
  if (!adaptive?.usefulness_score) return context;
  return {
    ...context,
    usefulness_score: adaptive.usefulness_score,
    low_usefulness: adaptive.usefulness_score < 0.65
  };
}

export default applyUsefulnessHints;
