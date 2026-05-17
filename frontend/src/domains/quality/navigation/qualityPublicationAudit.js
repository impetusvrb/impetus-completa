/**
 * Auditoria client-side da publicação QUALITY (append-only, bounded).
 * Não substitui audit industrial no backend; prepara correlacionamento.
 */

const KEY = 'impetus_quality_publication_audit_v1';
const MAX = 80;

function readBuf() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const x = JSON.parse(raw);
    return Array.isArray(x) ? x : [];
  } catch {
    return [];
  }
}

function writeBuf(entries) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX)));
  } catch {
    /* ignore */
  }
}

/**
 * @param {object} entry
 */
export function recordQualityPublicationAudit(entry) {
  const row = {
    ts: new Date().toISOString(),
    ...entry
  };
  const b = readBuf();
  b.push(row);
  writeBuf(b);
  return row;
}

export function listQualityPublicationAudit(limit = 40) {
  return readBuf().slice(-limit);
}

export function clearQualityPublicationAudit() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
