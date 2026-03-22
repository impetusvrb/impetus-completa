const fs = require('fs').promises;
const path = require('path');

/**
 * POST multipart para lipsync_api.py (audio WAV + face MP4).
 * @param {{ lipsyncUrl: string, wavBuffer: Buffer, faceVideoPath: string }} opts
 * @returns {Promise<Buffer>} corpo MP4
 */
async function postLipsyncMultipart({ lipsyncUrl, wavBuffer, faceVideoPath }) {
  const resolved = path.resolve(faceVideoPath);
  const faceBuf = await fs.readFile(resolved);
  const form = new FormData();
  form.append('audio', new Blob([wavBuffer], { type: 'audio/wav' }), 'speech.wav');
  form.append('face', new Blob([faceBuf], { type: 'video/mp4' }), path.basename(resolved));

  const res = await fetch(lipsyncUrl, { method: 'POST', body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Wav2Lip HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

module.exports = { postLipsyncMultipart };
