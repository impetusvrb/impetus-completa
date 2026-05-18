/**
 * UUID v4 seguro — usa Web Crypto API quando disponível, fallback manual caso contrário.
 * Suporta: Chrome 92+, Firefox 95+, Safari 15.4+, iOS 15.4+, e qualquer Node ≥ 14.
 * NÃO usa Math.random (inseguro) sem antes tentar a API nativa.
 */
export function safeUUID() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fallthrough
  }
  // Fallback RFC4122 v4 via getRandomValues (disponível desde Chrome 11 / Safari 3.1 / FF 21)
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      buf[6] = (buf[6] & 0x0f) | 0x40;
      buf[8] = (buf[8] & 0x3f) | 0x80;
      const h = [...buf].map((b) => b.toString(16).padStart(2, '0'));
      return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10).join('')}`;
    }
  } catch {
    // fallthrough
  }
  // Último recurso — timestamp + random (para ambientes muito antigos)
  const t = Date.now().toString(16).padStart(12, '0');
  const r = Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, '0');
  return `${t.slice(0, 8)}-${t.slice(8, 12)}-4${r.slice(1, 4)}-${((parseInt(r.slice(4, 5), 16) & 3) | 8).toString(16)}${r.slice(5, 8)}-${r.slice(8)}`;
}

export default safeUUID;
