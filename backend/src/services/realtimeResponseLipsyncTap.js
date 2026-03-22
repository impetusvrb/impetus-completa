const path = require('path');
const { pcm16ToWavBuffer } = require('./pcm16ToWav');
const { postLipsyncMultipart } = require('./lipsyncWav2LipClient');

const REPO_ROOT = path.resolve(__dirname, '../../..');

function isLipsyncEnabled() {
  const v = String(process.env.IMPETUS_REALTIME_LIPSYNC_ENABLED || '').toLowerCase().trim();
  return v === 'true' || v === '1' || v === 'yes';
}

function lipsyncUrl() {
  return String(process.env.IMPETUS_LIPSYNC_URL || 'http://127.0.0.1:5001/lipsync').trim();
}

function outputSampleRate() {
  const n = parseInt(process.env.IMPETUS_REALTIME_OUTPUT_AUDIO_HZ || '24000', 10);
  return Number.isFinite(n) && n > 0 ? n : 24000;
}

function faceVideoPath() {
  const env = String(process.env.IMPETUS_LIPSYNC_FACE_VIDEO || '').trim();
  if (env) return path.resolve(env);
  return path.join(REPO_ROOT, 'frontend/public/impetus-speaking.mp4');
}

function minPcmBytes() {
  const n = parseInt(process.env.IMPETUS_LIPSYNC_MIN_PCM_BYTES || '24000', 10);
  return Number.isFinite(n) && n >= 0 ? n : 24000;
}

/**
 * Acumula PCM16 (base64) das respostas Realtime e, em response.done, chama Wav2Lip.
 * @param {import('socket.io').Namespace | null} avatarNsp
 */
function createRealtimeResponseLipsyncTap(avatarNsp) {
  if (!isLipsyncEnabled() || !avatarNsp) {
    return { feedFromUpstreamMessage: () => {}, reset: () => {} };
  }

  const buffers = new Map();
  let chain = Promise.resolve();

  function emitRoundDone(payload) {
    try {
      avatarNsp.to('avatar_clients').emit('lipsync_round_done', payload);
    } catch (_) {}
  }

  function emitMp4(buf) {
    try {
      avatarNsp.to('avatar_clients').emit('lipsync_mp4', buf);
    } catch (_) {}
  }

  function enqueue(task) {
    chain = chain.then(task).catch((err) => {
      console.error('[realtime-lipsync]', err.message || err);
      emitRoundDone({ ok: false, error: String(err.message || err) });
    });
  }

  function feedFromUpstreamMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    const t = msg.type;

    if (t === 'response.output_audio.delta' || t === 'response.audio.delta') {
      const delta = msg.delta;
      if (!delta || typeof delta !== 'string') return;
      const id = msg.response_id || 'unknown';
      if (!buffers.has(id)) buffers.set(id, []);
      try {
        buffers.get(id).push(Buffer.from(delta, 'base64'));
      } catch (_) {}
      return;
    }

    if (t === 'response.done' || t === 'response.completed') {
      const id = msg.response?.id || msg.response_id;
      let parts = null;
      if (id && buffers.has(id)) {
        parts = buffers.get(id);
        buffers.delete(id);
      } else if (buffers.size === 1) {
        const first = buffers.entries().next().value;
        if (first) {
          buffers.delete(first[0]);
          parts = first[1];
        }
      }
      if (!parts || parts.length === 0) return;
      const pcm = Buffer.concat(parts);
      enqueue(() => runForPcm(pcm));
    }
  }

  async function runForPcm(pcm) {
    if (pcm.length < minPcmBytes()) {
      emitRoundDone({ ok: true, skipped: true, reason: 'short_audio' });
      return;
    }
    const sr = outputSampleRate();
    const wav = pcm16ToWavBuffer(pcm, sr);
    const mp4 = await postLipsyncMultipart({
      lipsyncUrl: lipsyncUrl(),
      wavBuffer: wav,
      faceVideoPath: faceVideoPath()
    });
    emitMp4(mp4);
    emitRoundDone({ ok: true, skipped: false });
  }

  function reset() {
    buffers.clear();
  }

  return { feedFromUpstreamMessage, reset };
}

module.exports = {
  createRealtimeResponseLipsyncTap,
  isLipsyncEnabled,
  lipsyncUrl,
  faceVideoPath
};
