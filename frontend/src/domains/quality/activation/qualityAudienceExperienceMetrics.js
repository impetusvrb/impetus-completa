/**
 * Métricas de experiência por audiência (agregação client-side leve).
 */

let _samples = [];

export function recordAudienceExperienceSample(row) {
  _samples.push({ ts: Date.now(), ...row });
  if (_samples.length > 120) _samples.shift();
}

export function getAudienceExperienceSummary() {
  if (_samples.length === 0) return { n: 0 };
  const byBand = {};
  for (const s of _samples) {
    const b = s.band || 'unknown';
    byBand[b] = (byBand[b] || 0) + 1;
  }
  return { n: _samples.length, byBand };
}
