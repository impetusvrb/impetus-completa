/**
 * Resolução de conflitos offline (shadow-first, sem authority).
 * Estratégia default: servidor prevalece quando existir versão; caso contrário mantém local.
 */
export function resolveInspectionDraftConflict({ local, remote }) {
  if (!remote) return { winner: 'local', merged: local };
  const rTs = remote?.updated_at ? Date.parse(remote.updated_at) : 0;
  const lTs = local?.updated_at ? Date.parse(local.updated_at) : 0;
  if (rTs >= lTs) return { winner: 'remote', merged: { ...local, ...remote, conflict_resolved: true } };
  return { winner: 'local', merged: { ...remote, ...local, conflict_resolved: true } };
}
