import * as THREE from 'three';

const TEX_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'];

export function enhanceMaterialsForQuality(root, maxAnisotropy) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) {
      for (const key of TEX_KEYS) {
        const t = m[key];
        if (t && t.isTexture) {
          t.anisotropy = maxAnisotropy;
          t.minFilter = THREE.LinearMipmapLinearFilter;
          t.magFilter = THREE.LinearFilter;
          t.needsUpdate = true;
        }
      }
      if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
        m.envMapIntensity = Math.max(m.envMapIntensity ?? 1, 1.2);
        m.needsUpdate = true;
      }
    }
  });
}
