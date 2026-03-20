export function detectProfile(user) {
  const role = String(user?.role || user?.cargo || '').toLowerCase();
  if (role.includes('gerente')) return 'gerente';
  if (role.includes('supervisor')) return 'supervisor';
  if (role.includes('analista')) return 'analista_pcm';
  return 'unauthorized';
}

