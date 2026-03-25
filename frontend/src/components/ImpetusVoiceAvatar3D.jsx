/**
 * Ponto de entrada do avatar 3D no overlay de voz.
 * Implementação modular: ./avatar3d/
 *
 * Realtime: `videoLipSyncRef` (useVoiceEngine já alimenta com PCM).
 * Pausar: `animationEnabled={false}`, ref `setAvatarAnimationEnabled`, ou CustomEvent IMPETUS_VOICE_AVATAR3D_ANIMATION.
 */
export { default } from './avatar3d/VoiceAvatar3DView.jsx';
export {
  preloadVoiceAvatarGlb,
  IMPETUS_VOICE_AVATAR3D_ANIMATION
} from './avatar3d/VoiceAvatar3DView.jsx';
export {
  createAvatarVolumeRef,
  setVolumeDrive,
  pushPcmBase64ToVolumeRef
} from './avatar3d/avatarVolumeDrive.js';
