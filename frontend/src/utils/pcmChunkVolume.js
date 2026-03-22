/**
 * Amplitude média normalizada (0–1) de um chunk PCM16 base64 (Realtime).
 * Alinhado a avatar-impetus.html (amostragem a cada 4 samples int16 LE).
 */
export function calcPcmChunkVolumeNorm(b64) {
  if (!b64 || typeof b64 !== 'string') return 0;
  try {
    const bytes = atob(b64);
    let sum = 0;
    const step = 4;
    let samples = 0;
    for (let i = 0; i + 1 < bytes.length; i += step * 2) {
      const lo = bytes.charCodeAt(i);
      const hi = bytes.charCodeAt(i + 1);
      const s = (hi << 8) | lo;
      const signed = s > 32767 ? s - 65536 : s;
      sum += Math.abs(signed);
      samples++;
    }
    return samples > 0 ? sum / samples / 32768 : 0;
  } catch {
    return 0;
  }
}
