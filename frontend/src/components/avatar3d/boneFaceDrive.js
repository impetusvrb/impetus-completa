import * as THREE from 'three';

/**
 * Ossos comuns em GLB (Mixamo, CC, Blender) para boca / olhos sem morph targets.
 */
export function collectBoneFaceDrivers(root) {
  const jawBones = [];
  const eyeLBones = [];
  const eyeRBones = [];
  const eyeMonoBones = [];
  const browBones = [];
  const lidBones = [];
  const used = new Set();

  function classify(bone) {
    if (!bone?.name || used.has(bone.uuid)) return;
    const n = bone.name.toLowerCase();
    const raw = bone.name;

    if (
      /jaw|mandible|chin|lowerjaw|bottomjaw|cc_base_jaw|mixamorigjaw|bn_jaw|def_c_jaw|teeth\.?lower|lower.*teeth/.test(
        n
      ) &&
      !/upper|topjaw|hair|eye|brow|tongue/.test(n)
    ) {
      used.add(bone.uuid);
      jawBones.push(bone);
      return;
    }
    if (/eyelid|eyelower|eye_lower|lid|blink|eyes_close|eye_close|squint/.test(n) && !/brow/.test(n)) {
      used.add(bone.uuid);
      lidBones.push(bone);
      return;
    }
    if ((/brow|eyebrow|forehead/.test(n) || /superc/i.test(raw)) && !/eyeball|lash|socket|lid/.test(n)) {
      used.add(bone.uuid);
      browBones.push(bone);
      return;
    }
    if (
      /eye|iris|pupil|ocular|ball|orb/.test(n) &&
      !/lid|lash|brow|socket|eyebrow|camera|light|target/.test(n)
    ) {
      used.add(bone.uuid);
      const left =
        /left|\.l\b|_l\b|_left|\[l\]|eye_l|leye|^l_|_l$| l$/i.test(raw) ||
        /mixamorig:lefteye|mixamorig_leye/i.test(raw);
      const right =
        /right|\.r\b|_r\b|_right|\[r\]|eye_r|reye|^r_|_r$| r$/i.test(raw) ||
        /mixamorig:righteye|mixamorig_reye/i.test(raw);
      if (left && !right) eyeLBones.push(bone);
      else if (right && !left) eyeRBones.push(bone);
      else eyeMonoBones.push(bone);
    }
  }

  root.traverse((o) => {
    if (o.isBone) classify(o);
    if (o.isSkinnedMesh && o.skeleton?.bones) {
      o.skeleton.bones.forEach((b) => classify(b));
    }
  });

  const restRot = new Map();
  const all = [
    ...jawBones,
    ...eyeLBones,
    ...eyeRBones,
    ...eyeMonoBones,
    ...browBones,
    ...lidBones
  ];
  all.forEach((b) => {
    restRot.set(b.uuid, { x: b.rotation.x, y: b.rotation.y, z: b.rotation.z });
  });

  return {
    jawBones,
    eyeLBones,
    eyeRBones,
    eyeMonoBones,
    browBones,
    lidBones,
    restRot,
    hasJawBone: jawBones.length > 0
  };
}

/**
 * @param {object} o
 * @param {number} o.jaw01
 * @param {number} o.blink01
 * @param {number} o.browWave
 * @param {number} o.lookH
 * @param {number} o.lookV
 * @param {number} o.t
 */
export function applyBoneFaceFrame(drivers, o) {
  const { jaw01, blink01, browWave, lookH, lookV, t } = o;
  const { jawBones, eyeLBones, eyeRBones, eyeMonoBones, browBones, lidBones, restRot } = drivers;
  const jawRad = THREE.MathUtils.clamp(jaw01, 0, 1) * 0.52;
  const blinkRad = THREE.MathUtils.clamp(blink01, 0, 1) * 0.55;
  const browRz = THREE.MathUtils.clamp(browWave, 0, 0.15) * 2.2;
  const eyeSwingY = lookH * 0.07 + Math.sin(t * 0.33) * 0.018;
  const eyeSwingX = lookV * 0.05 + Math.cos(t * 0.27) * 0.012;

  jawBones.forEach((b) => {
    const r = restRot.get(b.uuid);
    if (!r) return;
    b.rotation.x = r.x + jawRad;
  });

  lidBones.forEach((b) => {
    const r = restRot.get(b.uuid);
    if (!r) return;
    b.rotation.x = r.x + blinkRad;
  });

  browBones.forEach((b) => {
    const r = restRot.get(b.uuid);
    if (!r) return;
    b.rotation.z = r.z + browRz;
    b.rotation.y = r.y + browWave * 0.35;
  });

  eyeLBones.forEach((b) => {
    const r = restRot.get(b.uuid);
    if (!r) return;
    b.rotation.y = r.y + eyeSwingY;
    b.rotation.x = r.x + eyeSwingX;
  });
  eyeRBones.forEach((b) => {
    const r = restRot.get(b.uuid);
    if (!r) return;
    b.rotation.y = r.y - eyeSwingY * 0.92;
    b.rotation.x = r.x + eyeSwingX;
  });
  eyeMonoBones.forEach((b) => {
    const r = restRot.get(b.uuid);
    if (!r) return;
    b.rotation.y = r.y + eyeSwingY * 0.55;
    b.rotation.x = r.x + eyeSwingX;
  });
}
