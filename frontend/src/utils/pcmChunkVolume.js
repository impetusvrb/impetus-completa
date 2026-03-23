/**
 * Volume normalizado [0..~1] a partir de um chunk PCM16 mono little-endian em base64
 * (eventos response.output_audio.delta / response.audio.delta do Realtime).
 */
export function calcPcmChunkVolumeNorm(b64) {
  if (!b64 || typeof b64 !== 'string') return 0;
  try {
    const binary = atob(b64);
    const n = binary.length;
    if (n < 2) return 0;
    const buf = new ArrayBuffer(n);
    const view = new DataView(buf);
    for (let i = 0; i < n; i++) view.setUint8(i, binary.charCodeAt(i));
    const samples = Math.floor(n / 2);
    if (samples < 1) return 0;
    let sum = 0;
    for (let i = 0; i < samples; i++) {
      const s = view.getInt16(i * 2, true) / 32768;
      sum += s * s;
    }
    const rms = Math.sqrt(sum / samples);
    return Math.min(1, rms * 2.8);
  } catch {
    return 0;
  }
}
