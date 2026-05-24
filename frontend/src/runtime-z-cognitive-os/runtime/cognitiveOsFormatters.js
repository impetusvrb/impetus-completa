export function formatScore(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return `${Math.round(Number(v) * 100)}%`;
}

export function scoreClass(v) {
  const n = Number(v) || 0;
  if (n >= 0.75) return 'z-cog-value--green';
  if (n >= 0.5) return 'z-cog-value--accent';
  if (n >= 0.25) return 'z-cog-value--amber';
  return 'z-cog-value--red';
}

export function shortenText(text, max = 100) {
  if (!text) return '';
  const s = String(text);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function badgeClassForLevel(level) {
  switch (String(level || '').toLowerCase()) {
    case 'critical':
    case 'high':
      return 'z-cog-badge--red';
    case 'medium':
      return 'z-cog-badge--amber';
    case 'low':
    case 'normal':
      return 'z-cog-badge--green';
    default:
      return '';
  }
}
