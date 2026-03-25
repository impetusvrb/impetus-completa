/**
 * Avatar 3D (cabeça GLB) para overlay de voz — React Three Fiber.
 *
 * Integração Realtime: passar `videoLipSyncRef` igual ao dos vídeos; useVoiceEngine
 * preenche targetVolume + drive a partir do PCM (response.output_audio.delta).
 *
 * Pausar animação (mixer + sway + morphs procedimentais):
 * - prop `animationEnabled={false}`
 * - ref imperativo: `ref.current.setAvatarAnimationEnabled(false)`
 * - evento: `window.dispatchEvent(new CustomEvent(IMPETUS_VOICE_AVATAR3D_ANIMATION, { detail: { enabled: false } }))`
 */
import React, {
  forwardRef,
  Suspense,
  useEffect,
  useImperativeHandle,
  useRef
} from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Environment, useGLTF } from '@react-three/drei';
import { FaceModel } from './FaceModel.jsx';
import { STUDIO_BG } from './constants.js';

export const IMPETUS_VOICE_AVATAR3D_ANIMATION = 'impetus:avatar3d-animation';

export function preloadVoiceAvatarGlb(url) {
  if (url) useGLTF.preload(url);
}

function SceneContent({ glbUrl, videoLipSyncRef, state, animationEnabledRef }) {
  return (
    <>
      <Environment preset="studio" environmentIntensity={1.45} background={false} />
      <FaceModel
        url={glbUrl}
        videoLipSyncRef={videoLipSyncRef}
        avatarState={state}
        animationEnabledRef={animationEnabledRef}
      />
    </>
  );
}

const VoiceAvatar3DView = forwardRef(function VoiceAvatar3DView(
  {
    glbUrl,
    videoLipSyncRef = null,
    state = 'standby',
    className = '',
    animationEnabled = true
  },
  ref
) {
  const dprMax =
    typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 2, 2.25) : 2;

  const animationEnabledRef = useRef(animationEnabled);
  useEffect(() => {
    animationEnabledRef.current = animationEnabled;
  }, [animationEnabled]);

  useImperativeHandle(
    ref,
    () => ({
      setAvatarAnimationEnabled: (v) => {
        animationEnabledRef.current = !!v;
      },
      getAvatarAnimationEnabled: () => animationEnabledRef.current !== false
    }),
    []
  );

  useEffect(() => {
    const onCustom = (e) => {
      const v = e?.detail?.enabled;
      if (typeof v === 'boolean') animationEnabledRef.current = v;
    };
    window.addEventListener(IMPETUS_VOICE_AVATAR3D_ANIMATION, onCustom);
    return () => window.removeEventListener(IMPETUS_VOICE_AVATAR3D_ANIMATION, onCustom);
  }, []);

  return (
    <div className={`impetus-avatar__3d-wrap ${className}`.trim()}>
      <Canvas
        frameloop="always"
        camera={{ position: [0, 0.04, 2.82], fov: 30.5 }}
        gl={{
          alpha: false,
          antialias: true,
          powerPreference: 'default',
          stencil: false
        }}
        dpr={[1, dprMax]}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.5;
        }}
      >
        <color attach="background" args={[STUDIO_BG]} />
        <hemisphereLight args={['#d6e7ff', '#11182a', 0.95]} />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[3.2, 5, 4.5]}
          intensity={1.55}
          color="#e8f2ff"
          castShadow={false}
        />
        <directionalLight position={[-2.8, 2.2, 2.8]} intensity={0.9} color="#a7d1ff" />
        <pointLight
          position={[1.4, 2.2, 2.6]}
          intensity={1.12}
          color="#b8dcff"
          distance={12}
          decay={2}
        />
        <pointLight
          position={[0, 1.2, -2.4]}
          intensity={0.48}
          color="#9ecbff"
          distance={10}
          decay={2}
        />
        <Suspense fallback={null}>
          <SceneContent
            glbUrl={glbUrl}
            videoLipSyncRef={videoLipSyncRef}
            state={state}
            animationEnabledRef={animationEnabledRef}
          />
        </Suspense>
      </Canvas>
    </div>
  );
});

export default VoiceAvatar3DView;
