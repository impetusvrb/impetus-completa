export function balanceHrCenterWeights(centers = [], profileCode = '') {
  const exec = /manager_hr|director_hr/i.test(String(profileCode || ''));
  const opBoost = exec ? 0.9 : 1.1;
  return [...centers]
    .map((c) => ({
      ...c,
      render_weight: (c.weight || 0.1) * (c.layer === 'operational' ? opBoost : 1)
    }))
    .sort((a, b) => b.render_weight - a.render_weight);
}

export default balanceHrCenterWeights;
