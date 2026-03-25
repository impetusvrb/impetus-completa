import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/utils/SkeletonUtils.js';
import { calcPcmChunkVolumeNorm } from './pcmVolume.js';
import { classifyFaceMorphs, pickAnimationClip } from './faceMorphs.js';

/** Mesmo nome que IMPETUS_VOICE_AVATAR3D_ANIMATION no React (ImpetusVoiceAvatar3D.jsx). */
const EVENT_NAME = 'impetus:avatar3d-animation';

export class HeadAvatarApp {
  /**
   * @param {HTMLElement} mountEl - elemento onde o canvas será inserido
   * @param {object} opts
   * @param {string} opts.glbUrl - URL do .glb (ex.: /futuristic-headset.glb)
   * @param {number} [opts.fitTarget=1.62]
   * @param {number} [opts.offsetY=-0.07]
   * @param {number} [opts.baseYawDeg=-90]
   * @param {string} [opts.animIdleHint] - substring ou índice do clip idle
   * @param {string} [opts.animSpeakHint] - clip opcional na “fala”
   */
  constructor(mountEl, opts = {}) {
    this.mountEl = mountEl;
    this.glbUrl = opts.glbUrl || '/futuristic-headset.glb';
    this.fitTarget = opts.fitTarget ?? 1.62;
    this.offsetY = opts.offsetY ?? -0.07;
    this.baseYawDeg = opts.baseYawDeg ?? -90;
    this.animIdleHint = opts.animIdleHint ?? '';
    this.animSpeakHint = opts.animSpeakHint ?? '';

    this._animationEnabled = true;
    this._drive = false;
    this._targetVolume = 0;
    this._smoothVol = 0;
    this._speakWeightSmooth = 0;
    this._clock = new THREE.Clock();
    this._blinkFsm = { phase: 0, startT: 0, nextAt: 0 };

    this._mixer = null;
    this._idleAction = null;
    this._speakAction = null;
    this._clone = null;
    this._faceMorphs = null;
    this._rootGroup = null;
    this._raf = null;

    this._onWindowEvent = (e) => {
      const v = e?.detail?.enabled;
      if (typeof v === 'boolean') this.setAnimationEnabled(v);
    };
  }

  async init() {
    const w = this.mountEl.clientWidth || 400;
    const h = this.mountEl.clientHeight || 400;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 2, 2.25));
    this.renderer.setSize(w, h);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.mountEl.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050a12);

    this.camera = new THREE.PerspectiveCamera(30.5, w / h, 0.1, 100);
    this.camera.position.set(0, 0.04, 2.82);

    this.scene.add(new THREE.HemisphereLight(0xaac8ee, 0x050810, 0.45));
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.22));
    const d1 = new THREE.DirectionalLight(0xe8f2ff, 0.88);
    d1.position.set(3.2, 5, 4.5);
    this.scene.add(d1);
    const d2 = new THREE.DirectionalLight(0x7eb8ff, 0.4);
    d2.position.set(-2.8, 2.2, 2.8);
    this.scene.add(d2);
    const p1 = new THREE.PointLight(0xb8dcff, 0.55, 12, 2);
    p1.position.set(1.4, 2.2, 2.6);
    this.scene.add(p1);

    const loader = new GLTFLoader();
    const gltf = await new Promise((resolve, reject) => {
      loader.load(this.glbUrl, resolve, undefined, reject);
    });

    const clone = cloneSkinned(gltf.scene);
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 1e-4);
    const uniformScale = this.fitTarget / maxDim;
    clone.position.sub(center);

    this._clone = clone;
    this._faceMorphs = classifyFaceMorphs(clone);

    this._rootGroup = new THREE.Group();
    this._rootGroup.position.y = this.offsetY;
    this._rootGroup.add(clone);
    clone.scale.setScalar(uniformScale);
    this.scene.add(this._rootGroup);

    const anims = gltf.animations || [];
    this._mixer = new THREE.AnimationMixer(clone);
    const idleClip = pickAnimationClip(anims, this.animIdleHint, true);
    const speakClip = pickAnimationClip(anims, this.animSpeakHint, false);
    if (idleClip) {
      this._idleAction = this._mixer.clipAction(idleClip);
      this._idleAction.setLoop(THREE.LoopRepeat, Infinity);
      this._idleAction.reset().setEffectiveWeight(1).fadeIn(0.25).play();
    }
    if (speakClip) {
      this._speakAction = this._mixer.clipAction(speakClip);
      this._speakAction.setLoop(THREE.LoopRepeat, Infinity);
      this._speakAction.reset().setEffectiveWeight(0).play();
    }

    window.addEventListener(EVENT_NAME, this._onWindowEvent);
    window.addEventListener('resize', this._onResize);

    this._animate();
    return this;
  }

  _onResize = () => {
    if (!this.mountEl || !this.camera || !this.renderer) return;
    const w = this.mountEl.clientWidth;
    const h = this.mountEl.clientHeight;
    if (w < 1 || h < 1) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  setAnimationEnabled(on) {
    this._animationEnabled = !!on;
  }

  /** Chamar com cada delta base64 do Realtime (ou usar setManualVolume para teste). */
  feedPcmBase64(b64) {
    const v = calcPcmChunkVolumeNorm(b64);
    this._targetVolume = v;
    this._drive = true;
  }

  /** 0..1 — simula nível de voz sem WebSocket. */
  setManualVolume(v) {
    this._targetVolume = Math.max(0, Math.min(1, Number(v) || 0));
    this._drive = this._targetVolume > 0.002;
  }

  endSpeechDrive() {
    this._drive = false;
  }

  dispose() {
    window.removeEventListener(EVENT_NAME, this._onWindowEvent);
    window.removeEventListener('resize', this._onResize);
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    if (this._mixer && this._clone) {
      this._mixer.stopAllAction();
      this._mixer.uncacheRoot(this._clone);
    }
    if (this.renderer?.domElement?.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer?.dispose?.();
  }

  _animate = () => {
    this._raf = requestAnimationFrame(this._animate);
    const delta = Math.min(this._clock.getDelta(), 0.1);
    const t = this._clock.elapsedTime;
    const enabled = this._animationEnabled;

    if (enabled) {
      const goal = this._drive ? this._targetVolume : 0;
      this._smoothVol += (goal - this._smoothVol) * 0.14;
      this._mixer?.update(delta);
    }

    if (!this._rootGroup) return;
    if (!enabled) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const BASE_YAW = (this.baseYawDeg * Math.PI) / 180;
    const speak = this._drive && this._smoothVol > 0.02 ? 1 : 0.35;
    const bob = Math.sin(t * 1.15) * 0.028;
    const pulse = 1 + this._smoothVol * 0.09 * speak + bob;
    this._rootGroup.scale.setScalar(pulse);

    const headNx = Math.sin(t * 0.31) * 0.028;
    const headNy = Math.sin(t * 0.47) * 0.04;
    this._rootGroup.rotation.x = headNx;
    this._rootGroup.rotation.y = BASE_YAW + Math.sin(t * 0.38) * 0.12 + headNy;
    this._rootGroup.rotation.z = Math.sin(t * 0.21) * 0.022;

    if (this._idleAction && this._speakAction) {
      const vocal = this._drive && this._targetVolume > 0.035;
      const targetW = vocal ? Math.min(1, this._smoothVol * 1.2) : 0;
      this._speakWeightSmooth += (targetW - this._speakWeightSmooth) * 0.18;
      this._speakAction.setEffectiveWeight(this._speakWeightSmooth);
      this._idleAction.setEffectiveWeight(Math.max(0.001, 1 - this._speakWeightSmooth * 0.98));
    } else if (this._idleAction && !this._speakAction) {
      this._idleAction.setEffectiveWeight(1);
    }

    const morph = this._faceMorphs;
    const jaw = THREE.MathUtils.clamp(this._smoothVol * 1.15, 0, 1);
    morph.mouth.forEach((idxs, mesh) => {
      if (!mesh.morphTargetInfluences) return;
      for (const i of idxs) mesh.morphTargetInfluences[i] = jaw;
    });

    const b = this._blinkFsm;
    if (b.nextAt === 0) b.nextAt = t + 1.2 + Math.random() * 2;
    let blinkEnv = 0;
    if (b.phase === 0 && t >= b.nextAt) {
      b.phase = 1;
      b.startT = t;
      b.nextAt = t + 2.4 + Math.random() * 3.6;
    } else if (b.phase === 1) {
      const u = (t - b.startT) / 0.14;
      if (u >= 1) b.phase = 0;
      else blinkEnv = Math.sin(Math.PI * u);
    }
    const blinkVal = blinkEnv * 0.92;
    morph.blink.forEach((idxs, mesh) => {
      if (!mesh.morphTargetInfluences) return;
      for (const i of idxs) mesh.morphTargetInfluences[i] = blinkVal;
    });

    const browWave =
      0.04 * Math.sin(t * 0.71) + 0.035 * Math.sin(t * 0.23 + 0.7);
    morph.brow.forEach((idxs, mesh) => {
      if (!mesh.morphTargetInfluences) return;
      for (const i of idxs) {
        mesh.morphTargetInfluences[i] = THREE.MathUtils.clamp(browWave, 0, 0.12);
      }
    });

    const lookH = Math.sin(t * 0.37) * 0.11;
    const lookV = Math.cos(t * 0.29) * 0.09;
    for (const { mesh, idx, mode } of morph.look) {
      if (!mesh.morphTargetInfluences) continue;
      let w = 0;
      if (mode === 'up') w = Math.max(0, lookV);
      else if (mode === 'down') w = Math.max(0, -lookV);
      else if (mode === 'in') w = Math.max(0, lookH);
      else if (mode === 'out') w = Math.max(0, -lookH);
      else w = Math.min(1, Math.abs(lookH) * 0.45 + Math.abs(lookV) * 0.35);
      mesh.morphTargetInfluences[idx] = w;
    }

    const happy = 0.055 * (0.5 + 0.5 * Math.sin(t * 0.17));
    morph.exprHappy.forEach((idxs, mesh) => {
      if (!mesh.morphTargetInfluences) return;
      for (const i of idxs) mesh.morphTargetInfluences[i] = happy;
    });
    const surpr = 0.028 * (0.5 + 0.5 * Math.sin(t * 0.41 + 1.1));
    morph.exprSurprise.forEach((idxs, mesh) => {
      if (!mesh.morphTargetInfluences) return;
      for (const i of idxs) mesh.morphTargetInfluences[i] = surpr;
    });
    const lowMood = 0.018 * (0.5 + 0.5 * Math.sin(t * 0.13 + 2.4));
    morph.exprLow.forEach((idxs, mesh) => {
      if (!mesh.morphTargetInfluences) return;
      for (const i of idxs) mesh.morphTargetInfluences[i] = lowMood;
    });

    this.renderer.render(this.scene, this.camera);
  };
}

export { EVENT_NAME as VOICE_AVATAR_ANIMATION_EVENT };
