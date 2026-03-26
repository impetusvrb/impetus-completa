/**
 * IMPETUS - ManuIA - Visualizador 3D de equipamentos
 * Suporta: diagnóstico guiado, câmera focada, modos raio-x e explodida
 */
import React, { Suspense, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import DynamicMachineBuilder from './DynamicMachineBuilder';
import { COMPONENT_WORLD_POSITIONS } from './diagnosisMapping';

function CameraFocus({ targetComponent, enabled, targetRef }) {
  const targetPos = targetComponent ? COMPONENT_WORLD_POSITIONS[targetComponent] : null;
  const { camera } = useThree();

  useFrame(() => {
    if (!enabled || !targetPos || !targetRef?.current) return;
    const [tx, ty, tz] = targetPos;
    const scale = 1.5;
    const wx = tx * scale; const wy = ty * scale; const wz = tz * scale;
    targetRef.current.lerp(new THREE.Vector3(wx, wy, wz), 0.05);
    // Garante que a câmera aponte pro componente destacado (principalmente quando o usuário não interagiu com o OrbitControls).
    camera.lookAt(wx, wy, wz);
  });

  return null;
}

function ViewerContent({ research, highlightedComponent, viewMode, explodeFactor, targetRef }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} />
      <Suspense fallback={null}>
        <Environment preset="warehouse" />
      </Suspense>
      <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={10} blur={2} far={4} />
      <DynamicMachineBuilder research={research} highlightedComponent={highlightedComponent} viewMode={viewMode} explodeFactor={explodeFactor} />
      <CameraFocus targetComponent={highlightedComponent} enabled={!!highlightedComponent} targetRef={targetRef} />
      <OrbitControls
        target={targetRef?.current}
        enablePan
        enableZoom
        enableRotate
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2 + 0.2}
        minDistance={2}
        maxDistance={12}
      />
    </>
  );
}

export default function ThreeViewer({ research, highlightedComponent, viewMode = 'normal', explodeFactor = 0, onViewModeChange, className = '' }) {
  const orbitTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  if (!research) {
    return (
      <div className={`manuia-viewer manuia-viewer--empty ${className}`}>
        <div className="manuia-viewer__placeholder">
          <span>Pesquise um equipamento para visualizar o modelo 3D</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`manuia-viewer ${className}`}>
      {onViewModeChange && (
        <div className="manuia-viewer-modes">
          {[
            { id: 'normal', label: 'Normal' },
            { id: 'xray', label: 'Raio-X' },
            { id: 'exploded', label: 'Explodida' }
          ].map((m) => (
            <button key={m.id} type="button" className={`manuia-viewer-mode-btn ${viewMode === m.id ? 'manuia-viewer-mode-btn--active' : ''}`} onClick={() => onViewModeChange(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
      )}
      <Canvas
        shadows
        camera={{ position: [4, 3, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'linear-gradient(180deg, #0d1a24 0%, #162a3a 100%)' }}
      >
        <ViewerContent research={research} highlightedComponent={highlightedComponent} viewMode={viewMode} explodeFactor={explodeFactor} targetRef={orbitTargetRef} />
      </Canvas>
    </div>
  );
}
