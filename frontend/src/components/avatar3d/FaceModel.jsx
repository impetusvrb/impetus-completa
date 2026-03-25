import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import {
  BASE_PITCH,
  BASE_YAW,
  FIT_TARGET,
  LIFE_FACE,
  MORPH_ALL,
  MORPH_ENABLED,
  MORPH_GAIN,
  OFFSET_Y,
  USER_SCALE
} from './constants.js';
import { enhanceMaterialsForQuality } from './materials.js';
import { classifyFaceMorphs } from './faceMorphClassify.js';
import { pickAnimationClip } from './pickAnimationClip.js';
import { applyBoneFaceFrame, collectBoneFaceDrivers } from './boneFaceDrive.js';

/**
 * @param {object} props
 * @param {string} props.url
 * @param {React.MutableRefObject<{ targetVolume?: number; drive?: boolean }|null|undefined>} props.videoLipSyncRef
 * @param {string} props.avatarState
 * @param {React.MutableRefObject<boolean>} props.animationEnabledRef
 */
export function FaceModel({ url, videoLipSyncRef, avatarState, animationEnabledRef }) {
  const { scene, animations } = useGLTF(url);
  const gl = useThree((s) => s.gl);
  const root = useRef();
  const chewRef = useRef();
  const mixerRef = useRef(null);
  const smooth = useRef(0);
  const speechEnergy = useRef(0);
  const speakWeightSmooth = useRef(0);
  const blinkFsm = useRef({ phase: 0, startT: 0, nextAt: 0 });
  const gazeFsm = useRef({ h: 0, v: 0, targetH: 0, targetV: 0, nextAt: 0 });
  const idleActionRef = useRef(null);
  const speakActionRef = useRef(null);

  const { clone, uniformScale } = useMemo(() => {
    const c = cloneSkinned(scene);
    c.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    c.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(c);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
    const sc = (FIT_TARGET / maxDim) * USER_SCALE;
    c.position.sub(center);
    return { clone: c, uniformScale: sc };
  }, [scene]);

  const { faceMorphs, hasMouthMorphs } = useMemo(() => {
    const fm = classifyFaceMorphs(clone);
    let n = 0;
    fm.mouth.forEach((idxs) => {
      n += idxs.length;
    });
    return { faceMorphs: fm, hasMouthMorphs: n > 0 };
  }, [clone]);

  const boneDrivers = useMemo(() => collectBoneFaceDrivers(clone), [clone]);

  const rigidDrivers = useMemo(() => {
    const eyeMeshes = [];
    const jawMeshes = [];
    const restRot = new Map();

    clone.traverse((o) => {
      if (!o?.isMesh) return;
      const n = String(o.name || '').toLowerCase();
      if (!n) return;

      const isEyeMesh =
        /eye|iris|pupil|ocular/.test(n) &&
        !/eyelid|lash|brow|socket|shadow|occlusion/.test(n);
      if (isEyeMesh) {
        eyeMeshes.push(o);
        restRot.set(o.uuid, { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z });
        return;
      }

      const isJawMesh =
        /jaw|mandible|mouth|teeth.*lower|lower.*teeth|tongue/.test(n) &&
        !/upper|helmet|head|hair/.test(n);
      if (isJawMesh) {
        jawMeshes.push(o);
        restRot.set(o.uuid, { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z });
      }
    });

    return { eyeMeshes, jawMeshes, restRot };
  }, [clone]);

  /** Malhas com morphs que não entraram na categoria “boca” (nomes exóticos no GLB). */
  const morphOrphanMeshes = useMemo(() => {
    const list = [];
    clone.traverse((o) => {
      if (!o.isMesh || !o.morphTargetInfluences?.length) return;
      const idxs = faceMorphs.mouth.get(o);
      if (idxs?.length) return;
      list.push(o);
    });
    list.sort((a, b) => b.morphTargetInfluences.length - a.morphTargetInfluences.length);
    return list;
  }, [clone, faceMorphs]);

  useLayoutEffect(() => {
    const cap = gl.capabilities.getMaxAnisotropy?.() ?? 8;
    const aniso = Math.min(Math.max(cap, 4), 16);
    enhanceMaterialsForQuality(clone, aniso);
  }, [clone, gl]);

  useLayoutEffect(() => {
    const mixer = new THREE.AnimationMixer(clone);
    mixerRef.current = mixer;
    idleActionRef.current = null;
    speakActionRef.current = null;

    const idleHint = import.meta.env.VITE_VOICE_AVATAR_3D_ANIM_IDLE;
    const speakHint = import.meta.env.VITE_VOICE_AVATAR_3D_ANIM_SPEAK;
    const idleClip = pickAnimationClip(animations, idleHint, true);
    const speakClip = pickAnimationClip(animations, speakHint, false);

    if (idleClip) {
      const a = mixer.clipAction(idleClip);
      a.setLoop(THREE.LoopRepeat, Infinity);
      a.clampWhenFinished = false;
      a.reset();
      a.setEffectiveWeight(1);
      a.fadeIn(0.25);
      a.play();
      idleActionRef.current = a;
    }
    if (speakClip) {
      const a = mixer.clipAction(speakClip);
      a.setLoop(THREE.LoopRepeat, Infinity);
      a.reset();
      a.setEffectiveWeight(0);
      a.play();
      speakActionRef.current = a;
    }

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(clone);
      mixerRef.current = null;
      idleActionRef.current = null;
      speakActionRef.current = null;
    };
  }, [clone, animations]);

  useFrame((st, delta) => {
    const enabled = animationEnabledRef?.current !== false;
    const sync = videoLipSyncRef?.current;
    const t = st.clock.elapsedTime;

    if (enabled) {
      /**
       * Entre dois `response.output_audio.delta` o `drive` pode estar false um instante —
       * antes a boca ia a zero a cada gap. Ataque rápido com PCM; em `speaking` deixa
       * o volume decair devagar (hold).
       */
      const raw = sync?.drive ? (sync?.targetVolume ?? 0) : 0;
      const attack = 0.26;
      const release = 0.12;
      if (raw > 0.002) {
        smooth.current += (raw - smooth.current) * attack;
      } else if (avatarState === 'speaking') {
        smooth.current *= 0.93;
      } else {
        smooth.current += (0 - smooth.current) * release;
      }

      // Garantir energia de fala no estado "speaking" mesmo quando o stream de volume oscila.
      if (avatarState === 'speaking') {
        const procedural =
          0.16 +
          Math.max(0, Math.sin(t * 10.5)) * 0.12 +
          Math.max(0, Math.sin(t * 16.7 + 0.9)) * 0.08;
        const targetEnergy = Math.max(smooth.current, procedural);
        speechEnergy.current += (targetEnergy - speechEnergy.current) * 0.22;
      } else {
        speechEnergy.current += (0 - speechEnergy.current) * 0.1;
      }

      const dt = Math.min(delta, 0.1);
      mixerRef.current?.update(dt);
    }

    if (!root.current) return;
    if (!enabled) return;

    const stateProfile =
      avatarState === 'speaking'
        ? {
            headAmp: 1.06,
            bobMul: 1.1,
            blinkMin: 3.1,
            blinkMax: 5.2,
            lookAmp: 0.085,
            jawMul: 1.18,
            moodMul: 1.08
          }
        : avatarState === 'listening'
          ? {
              headAmp: 1.0,
              bobMul: 0.96,
              blinkMin: 1.7,
              blinkMax: 3.1,
              lookAmp: 0.14,
              jawMul: 0.32,
              moodMul: 1.12
            }
          : avatarState === 'processing'
            ? {
                headAmp: 0.82,
                bobMul: 0.84,
                blinkMin: 2.2,
                blinkMax: 3.9,
                lookAmp: 0.075,
                jawMul: 0.22,
                moodMul: 0.88
              }
            : {
                headAmp: 0.92,
                bobMul: 0.9,
                blinkMin: 2.0,
                blinkMax: 3.6,
                lookAmp: 0.1,
                jawMul: 0.28,
                moodMul: 1
              };
    const speak =
      avatarState === 'speaking' ? 1 : avatarState === 'listening' ? 0.35 : 0.22;
    const hasBoneJaw = boneDrivers.hasJawBone;
    const bobAmp = hasBoneJaw ? 0.016 : 0.034;
    const bob = Math.sin(t * 1.15) * bobAmp * stateProfile.bobMul;
    const pulseAmp =
      hasBoneJaw ? 0.045 : hasMouthMorphs ? 0.09 : morphOrphanMeshes.length ? 0.11 : 0.2;
    const pulse = 1 + smooth.current * pulseAmp * speak + bob;
    root.current.scale.set(pulse, pulse, pulse);
    const headNx = LIFE_FACE ? Math.sin(t * 0.31) * 0.028 * stateProfile.headAmp : 0;
    const headNy = LIFE_FACE ? Math.sin(t * 0.47) * 0.04 * stateProfile.headAmp : 0;
    root.current.rotation.x = BASE_PITCH + headNx;
    root.current.rotation.y =
      BASE_YAW + Math.sin(t * 0.38) * 0.12 * stateProfile.headAmp + headNy;
    root.current.rotation.z = LIFE_FACE
      ? Math.sin(t * 0.21) * 0.022 * stateProfile.headAmp
      : 0;

    const idleA = idleActionRef.current;
    const speakA = speakActionRef.current;
    if (idleA && speakA) {
      const vocal =
        avatarState === 'speaking' &&
        (smooth.current > 0.04 ||
          (sync?.drive && (sync?.targetVolume ?? 0) > 0.028));
      const targetW = vocal ? Math.min(1, smooth.current * 1.2) : 0;
      speakWeightSmooth.current += (targetW - speakWeightSmooth.current) * 0.18;
      const w = speakWeightSmooth.current;
      speakA.setEffectiveWeight(w);
      idleA.setEffectiveWeight(Math.max(0.001, 1 - w * 0.98));
    } else if (idleA && !speakA) {
      idleA.setEffectiveWeight(1);
    }

    const jawBase = smooth.current * MORPH_GAIN * stateProfile.jawMul;
    const jawTalkNudge =
      avatarState === 'speaking'
        ? 0.025 + Math.max(0, Math.sin(t * 14)) * 0.045 + Math.max(0, Math.sin(t * 22 + 1.1)) * 0.03
        : 0;
    const jaw = THREE.MathUtils.clamp(
      Math.max(jawBase, speechEnergy.current * 0.95) + jawTalkNudge,
      0,
      1
    );

    if (MORPH_ENABLED) {
      const { mouth, blink, brow, exprHappy, exprSurprise, exprLow, look } = faceMorphs;

      if (MORPH_ALL) {
        clone.traverse((o) => {
          if (!o.isMesh || !o.morphTargetInfluences) return;
          for (let i = 0; i < o.morphTargetInfluences.length; i++) {
            o.morphTargetInfluences[i] = jaw;
          }
        });
      } else {
        mouth.forEach((idxs, mesh) => {
          if (!mesh.morphTargetInfluences) return;
          for (const i of idxs) mesh.morphTargetInfluences[i] = jaw;
        });
        if (!hasMouthMorphs && morphOrphanMeshes.length > 0) {
          const mesh = morphOrphanMeshes[0];
          const n = Math.min(6, mesh.morphTargetInfluences.length);
          for (let i = 0; i < n; i++) {
            mesh.morphTargetInfluences[i] = jaw * Math.max(0.15, 1 - i * 0.14);
          }
        }
      }

      if (!LIFE_FACE) {
        applyBoneFaceFrame(boneDrivers, {
          jaw01: jaw,
          blink01: 0,
          browWave: 0,
          lookH: 0,
          lookV: 0,
          t
        });
        return;
      }

    let blinkEnv = 0;
    const b = blinkFsm.current;
    if (b.nextAt === 0) {
      b.nextAt =
        t + stateProfile.blinkMin + Math.random() * (stateProfile.blinkMax - stateProfile.blinkMin);
    }
    if (b.phase === 0 && t >= b.nextAt) {
      b.phase = 1;
      b.startT = t;
      b.nextAt =
        t + stateProfile.blinkMin + Math.random() * (stateProfile.blinkMax - stateProfile.blinkMin);
    } else if (b.phase === 1) {
      const u = (t - b.startT) / 0.14;
      if (u >= 1) b.phase = 0;
      else blinkEnv = Math.sin(Math.PI * u);
    }
    const blinkVal = blinkEnv * 0.92;
    blink.forEach((idxs, mesh) => {
      if (!mesh.morphTargetInfluences) return;
      for (const i of idxs) mesh.morphTargetInfluences[i] = blinkVal;
    });

    const browWave =
      (0.04 * Math.sin(t * 0.71) + 0.035 * Math.sin(t * 0.23 + 0.7)) * stateProfile.moodMul;
    brow.forEach((idxs, mesh) => {
      if (!mesh.morphTargetInfluences) return;
      for (const i of idxs) {
        mesh.morphTargetInfluences[i] = THREE.MathUtils.clamp(browWave, 0, 0.12);
      }
    });

    const g = gazeFsm.current;
    if (g.nextAt === 0 || t >= g.nextAt) {
      g.targetH = (Math.random() * 2 - 1) * stateProfile.lookAmp;
      g.targetV = (Math.random() * 2 - 1) * (stateProfile.lookAmp * 0.72);
      g.nextAt = t + 0.9 + Math.random() * 2.4;
    }
    g.h += (g.targetH - g.h) * 0.06;
    g.v += (g.targetV - g.v) * 0.06;
    const lookH = g.h;
    const lookV = g.v;
    for (const { mesh, idx, mode } of look) {
      if (!mesh.morphTargetInfluences) continue;
      let w = 0;
      if (mode === 'up') w = Math.max(0, lookV);
      else if (mode === 'down') w = Math.max(0, -lookV);
      else if (mode === 'in') w = Math.max(0, lookH);
      else if (mode === 'out') w = Math.max(0, -lookH);
      else w = Math.min(1, Math.abs(lookH) * 0.45 + Math.abs(lookV) * 0.35);
      mesh.morphTargetInfluences[idx] = w;
    }


    const happy = 0.055 * stateProfile.moodMul * (0.5 + 0.5 * Math.sin(t * 0.17));
    exprHappy.forEach((idxs, mesh) => {
      if (!mesh.morphTargetInfluences) return;
      for (const i of idxs) mesh.morphTargetInfluences[i] = happy;
    });

    const surpr = 0.028 * stateProfile.moodMul * (0.5 + 0.5 * Math.sin(t * 0.41 + 1.1));
    exprSurprise.forEach((idxs, mesh) => {
      if (!mesh.morphTargetInfluences) return;
      for (const i of idxs) mesh.morphTargetInfluences[i] = surpr;
    });

    const lowMood = 0.018 * stateProfile.moodMul * (0.5 + 0.5 * Math.sin(t * 0.13 + 2.4));
    exprLow.forEach((idxs, mesh) => {
      if (!mesh.morphTargetInfluences) return;
      for (const i of idxs) mesh.morphTargetInfluences[i] = lowMood;
    });

      applyBoneFaceFrame(boneDrivers, {
        jaw01: jaw,
        blink01: blinkVal,
        browWave,
        lookH,
        lookV,
        t
      });

      // Fallback adicional para GLBs com olhos/mandíbula em malhas (sem morph/bone driver confiável).
      if (rigidDrivers.eyeMeshes.length > 0) {
        rigidDrivers.eyeMeshes.forEach((m) => {
          const r = rigidDrivers.restRot.get(m.uuid);
          if (!r) return;
          m.rotation.y = r.y + lookH * 0.42;
          m.rotation.x = r.x + lookV * 0.33;
        });
      }
      if (rigidDrivers.jawMeshes.length > 0 && !boneDrivers.hasJawBone && !hasMouthMorphs) {
        const jawMeshRot = jaw * 0.22;
        rigidDrivers.jawMeshes.forEach((m) => {
          const r = rigidDrivers.restRot.get(m.uuid);
          if (!r) return;
          m.rotation.x = r.x + jawMeshRot;
        });
      }
    } else {
      applyBoneFaceFrame(boneDrivers, {
        jaw01: jaw,
        blink01: 0,
        browWave: 0,
        lookH: 0,
        lookV: 0,
        t
      });

      if (rigidDrivers.eyeMeshes.length > 0) {
        rigidDrivers.eyeMeshes.forEach((m) => {
          const r = rigidDrivers.restRot.get(m.uuid);
          if (!r) return;
          m.rotation.y += (r.y - m.rotation.y) * 0.12;
          m.rotation.x += (r.x - m.rotation.x) * 0.12;
        });
      }
      if (rigidDrivers.jawMeshes.length > 0) {
        rigidDrivers.jawMeshes.forEach((m) => {
          const r = rigidDrivers.restRot.get(m.uuid);
          if (!r) return;
          m.rotation.x += (r.x - m.rotation.x) * 0.12;
        });
      }
    }

    const rigidFace =
      !boneDrivers.hasJawBone && !hasMouthMorphs && morphOrphanMeshes.length === 0;
    if (chewRef.current && rigidFace) {
      const talk = avatarState === 'speaking' ? 1 : 0.42;
      const rigidTalk = Math.max(smooth.current, speechEnergy.current);
      chewRef.current.rotation.x =
        rigidTalk * 0.28 * talk +
        Math.sin(t * 2.1) * 0.028 * talk +
        Math.max(0, Math.sin(t * 11.8)) * 0.03 * talk;
      chewRef.current.rotation.y =
        Math.sin(t * 0.52) * 0.035 * talk + Math.sin(t * 3.7) * 0.01 * talk;
    } else if (chewRef.current && !rigidFace) {
      chewRef.current.rotation.x = 0;
      chewRef.current.rotation.y = 0;
    }

  });

  return (
    <group ref={root} position={[0, OFFSET_Y, 0]}>
      <group ref={chewRef}>
        <primitive object={clone} scale={uniformScale} />
      </group>
    </group>
  );
}
