/**
 * Monta um WAV PCM 16-bit little-endian mono (para enviar ao Wav2Lip).
 * @param {Buffer} pcm16le — amostras s16le (2 bytes por amostra)
 * @param {number} sampleRate — ex.: 24000 (saída padrão Realtime pcm16)
 */
function pcm16ToWavBuffer(pcm16le, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm16le.length;
  const headerSize = 44;
  const out = Buffer.alloc(headerSize + dataSize);

  out.write('RIFF', 0);
  out.writeUInt32LE(36 + dataSize, 4);
  out.write('WAVE', 8);
  out.write('fmt ', 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(numChannels, 22);
  out.writeUInt32LE(sampleRate, 24);
  out.writeUInt32LE(byteRate, 28);
  out.writeUInt16LE(blockAlign, 32);
  out.writeUInt16LE(bitsPerSample, 34);
  out.write('data', 36);
  out.writeUInt32LE(dataSize, 40);
  pcm16le.copy(out, headerSize);
  return out;
}

module.exports = { pcm16ToWavBuffer };
