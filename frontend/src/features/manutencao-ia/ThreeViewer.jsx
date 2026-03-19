/**
 * IMPETUS - ManuIA - Visualizador 3D de equipamentos
 * Renderiza o modelo procedural retornado pela pesquisa de IA
 */
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import DynamicMachineBuilder from './DynamicMachineBuilder';

function ViewerContent({ research, onComponentClick }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} />
      <Suspense fallback={null}>
        <Environment preset="warehouse" />
      </Suspense>
      <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={10} blur={2} far={4} />
      <DynamicMachineBuilder research={research} onComponentClick={onComponentClick} />
      <OrbitControls
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

export default function ThreeViewer({ research, onComponentClick, className = '' }) {
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
      <Canvas
        shadows
        camera={{ position: [4, 3, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'linear-gradient(180deg, #0d1a24 0%, #162a3a 100%)' }}
      >
        <ViewerContent research={research} onComponentClick={onComponentClick} />
      </Canvas>
    </div>
  );
}
