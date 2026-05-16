/**
 * Integridade de evidências — hash + preparação para resumo de upload (sem object storage).
 */

export async function sha256HexFromArrayBuffer(buf) {
  if (!buf || !buf.byteLength) return null;
  try {
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

/** @param {string} hex */
export function isPlausibleSha256Hex(hex) {
  return typeof hex === 'string' && /^[a-f0-9]{64}$/i.test(hex);
}
