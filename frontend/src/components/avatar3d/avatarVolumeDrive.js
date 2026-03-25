/**
 * Drive de volume para o avatar 3D (boca / pulso) — integração OpenAI Realtime
 *
 * No Impetus, o WebSocket Realtime já está em useVoiceEngine: nos eventos
 * response.output_audio.delta / response.audio.delta usa-se calcPcmChunkVolumeNorm
 * e atualiza-se videoLipSyncRef.current = { targetVolume, drive }.
 * Passa esse mesmo ref a <ImpetusVoiceAvatar3D videoLipSyncRef={...} /> — não precisas
 * chamar este ficheiro na app principal.
 *
 * Para páginas de teste ou código isolado: createAvatarVolumeRef() + pushPcmBase64ToVolumeRef.
 */
import { calcPcmChunkVolumeNorm } from '../../utils/pcmChunkVolume.js';

export function createAvatarVolumeRef() {
  return { current: { targetVolume: 0, drive: false } };
}

export function setVolumeDrive(ref, volume01, drive) {
  if (!ref?.current) return;
  ref.current.targetVolume = Math.max(0, Math.min(1, volume01));
  ref.current.drive = !!drive;
}

export function pushPcmBase64ToVolumeRef(ref, base64Delta) {
  if (!ref?.current) return;
  ref.current.targetVolume = calcPcmChunkVolumeNorm(base64Delta);
  ref.current.drive = true;
}
