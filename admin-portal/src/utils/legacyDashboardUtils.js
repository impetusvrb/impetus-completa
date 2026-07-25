/** UX-SEC-CENTER-001 — utilitários puros (sem runtime produtivo artificial). */

export const LEGACY_LIMITS = {
  ATTACK_ORIGINS: 10,
  BLOCKED_IPS: 10,
  FAILED_LOGINS: 10,
  CRITICAL_EVENTS: 8,
  SEC01: 8,
  HARDENING: 4,
  PROMOTION: 4,
  CORRELATION: 6,
  ATTACK_GRAPH: 3,
  THREAT_INTEL: 10,
};

const SEV_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export function severityRank(sev) {
  return SEV_RANK[sev] ?? 9;
}

/** Ordenação críticos: severidade desc, depois mais recente. Sem campo resolved confiável. */
export function sortCriticalEvents(events) {
  return [...(events || [])].sort((a, b) => {
    const sr = severityRank(a.severity) - severityRank(b.severity);
    if (sr !== 0) return sr;
    return new Date(b.at || 0) - new Date(a.at || 0);
  });
}

/** SEC-02: OPEN primeiro (se status existir), depois severidade e risco. */
export function sortCorrelationIncidents(incidents) {
  return [...(incidents || [])].sort((a, b) => {
    const aOpen = a.status === 'OPEN' ? 0 : 1;
    const bOpen = b.status === 'OPEN' ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    const sr = severityRank(a.severity) - severityRank(b.severity);
    if (sr !== 0) return sr;
    return (b.riskScore ?? 0) - (a.riskScore ?? 0);
  });
}

export function takePreview(items, limit) {
  const list = items || [];
  return { preview: list.slice(0, limit), total: list.length };
}

/** Rótulo semanticamente correto — nunca implica conjunto completo fora do payload. */
export function exploreListLabel(totalInPayload) {
  const n = totalInPayload ?? 0;
  if (n <= 0) return null;
  return `Ver registros disponíveis (${n})`;
}

export function previewMeta(shown, total) {
  const t = total ?? 0;
  const s = shown ?? 0;
  if (t <= 0) return '';
  if (t <= s) return `${t} registro${t !== 1 ? 's' : ''} no payload`;
  return `${s} de ${t} no payload`;
}

/** Chave operacional granular: tipo:itemId:acao */
export function busyKey(type, itemId, action) {
  return `${type}:${itemId ?? ''}:${action}`;
}

export function isBusyOp(busyOp, type, itemId, action) {
  return busyOp === busyKey(type, itemId, action);
}

export function isItemBusy(busyOp, type, itemId) {
  if (!busyOp || !itemId) return false;
  const prefix = `${type}:${itemId}:`;
  return busyOp.startsWith(prefix);
}

export function filterPromotionQueue(queue, phaseFilter) {
  const list = queue || [];
  if (!phaseFilter) return list;
  return list.filter((item) => item.phase === phaseFilter);
}

export function canExploreList(total, previewCount) {
  return (total ?? 0) > (previewCount ?? 0);
}
