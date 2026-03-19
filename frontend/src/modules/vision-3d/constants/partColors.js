/**
 * IMPETUS - ManuIA 3D Vision - Paleta de cores por status das peças
 * OK: verde | ATENÇÃO: amarelo | CRÍTICO: vermelho
 */

export const PART_COLORS = {
  ok: {
    color: 0x1a4a2a,
    emissive: 0x001a08
  },
  warn: {
    color: 0x4a3a00,
    emissive: 0x221800
  },
  crit: {
    color: 0x4a0a10,
    emissive: 0x220005
  }
};

export const LIGHT_COLORS = {
  ambient: 0x00e887,
  ambientIntensity: 0.25,
  directional: 0xffffff,
  directionalIntensity: 1.2,
  rim: 0x1d6fe8,
  rimIntensity: 0.4,
  pointPulse: 0x00e887
};
