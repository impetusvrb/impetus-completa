export function formatScore(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return Number(v).toFixed(2);
}

export function scoreClass(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return '';
  if (n >= 0.75) return 'z-ons-value--high';
  if (n >= 0.45) return 'z-ons-value--mid';
  return 'z-ons-value--low';
}

export function badgeClassForPriority(p) {
  const k = String(p || '').toLowerCase();
  if (k === 'critica' || k === 'high') return 'z-ons-badge--critical';
  if (k === 'alta' || k === 'medium') return 'z-ons-badge--warn';
  return 'z-ons-badge--normal';
}
