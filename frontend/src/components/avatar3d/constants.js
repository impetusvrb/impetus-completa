/** Env + pose defaults for the voice GLB avatar (Vite import.meta.env). */

export const USER_SCALE =
  Number(String(import.meta.env.VITE_VOICE_AVATAR_3D_SCALE ?? '1').trim()) || 1;

export const FIT_TARGET =
  Number(String(import.meta.env.VITE_VOICE_AVATAR_3D_FIT ?? '1.62').trim()) || 1.62;

export const STUDIO_BG =
  String(import.meta.env.VITE_VOICE_AVATAR_3D_BG ?? '#050a12').trim() || '#050a12';

export const OFFSET_Y =
  Number(String(import.meta.env.VITE_VOICE_AVATAR_3D_OFFSET_Y ?? '-0.07').trim()) || 0;

export const MORPH_ENABLED =
  String(import.meta.env.VITE_VOICE_AVATAR_3D_MORPH ?? '1').trim() !== '0';

export const MORPH_GAIN =
  Number(String(import.meta.env.VITE_VOICE_AVATAR_3D_MORPH_GAIN ?? '1.15').trim()) || 1.15;

export const LIFE_FACE =
  String(import.meta.env.VITE_VOICE_AVATAR_3D_LIFE ?? '1').trim() !== '0';

export const MORPH_ALL =
  String(import.meta.env.VITE_VOICE_AVATAR_3D_MORPH_ALL ?? '0').trim() === '1';

export function degToRad(d) {
  return (Number(d) * Math.PI) / 180;
}

const RAW_ROT_Y = String(import.meta.env.VITE_VOICE_AVATAR_3D_ROTATE_Y_DEG ?? '').trim();
export const BASE_YAW =
  RAW_ROT_Y !== '' && !Number.isNaN(Number(RAW_ROT_Y)) ? degToRad(Number(RAW_ROT_Y)) : degToRad(-90);

const RAW_ROT_X = String(import.meta.env.VITE_VOICE_AVATAR_3D_ROTATE_X_DEG ?? '').trim();
export const BASE_PITCH =
  RAW_ROT_X !== '' && !Number.isNaN(Number(RAW_ROT_X)) ? degToRad(Number(RAW_ROT_X)) : 0;
