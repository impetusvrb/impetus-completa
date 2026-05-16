/**
 * Parser/normalização de leituras QR/barcode (Code128, EAN, DataMatrix hints).
 */

export function normalizeScanText(raw) {
  return String(raw || '')
    .replace(/\u0000/g, '')
    .trim();
}

export function inferSymbology(text) {
  const t = normalizeScanText(text);
  if (!t) return 'empty';
  if (t.startsWith('http://') || t.startsWith('https://')) return 'qrcode_url';
  if (/^\d{13}$/.test(t)) return 'ean13';
  if (/^\d{8}$/.test(t)) return 'ean8';
  if (/^[\x21-\x7E]+$/.test(t) && t.length < 60) return 'code128_guess';
  return 'datamatrix_or_mixed';
}

export function parseIndustrialLabel(text, meta = {}) {
  const norm = normalizeScanText(text);
  const sep = meta.separator || ';';
  const parts = norm.split(sep).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 1) return { fields: { raw: norm } };
  const fields = {};
  for (const p of parts) {
    const [k, ...rest] = p.split(':');
    if (rest.length) fields[k.trim().toLowerCase()] = rest.join(':').trim();
  }
  return { fields, tokens: parts };
}
