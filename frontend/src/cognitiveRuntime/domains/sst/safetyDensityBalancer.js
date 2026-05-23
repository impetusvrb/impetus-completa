/**
 * Z.25 — Prioriza centros operacionais SST no render
 */

export function balanceSafetyCenterWeights(centers = [], profileCode = '') {
  const isTechnician = /technician|tecnico/i.test(String(profileCode || ''));
  const opBoost = isTechnician ? 1.15 : 1;
  return [...centers]
    .map((c) => ({
      ...c,
      render_weight: (c.weight || 0.1) * (c.layer === 'operational' ? opBoost : 1)
    }))
    .sort((a, b) => b.render_weight - a.render_weight);
}

export default balanceSafetyCenterWeights;
