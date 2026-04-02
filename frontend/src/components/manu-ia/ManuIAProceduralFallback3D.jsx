import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

function ProceduralMachine({ type = 'generic' }) {
  const tint = useMemo(() => {
    const t = String(type || '').toLowerCase();
    if (t.includes('pump') || t.includes('bomba')) return '#3f83f8';
    if (t.includes('motor')) return '#4b5563';
    if (t.includes('panel') || t.includes('quadro')) return '#1f2937';
    return '#334155';
  }, [type]);

  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 1.4, 48]} />
        <meshStandardMaterial color={tint} metalness={0.35} roughness={0.4} />
      </mesh>
      <mesh position={[0.9, 0, 0]}>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.55} />
      </mesh>
      <mesh position={[-0.85, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.8, 24]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.55} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.95, 0]}>
        <boxGeometry args={[2.2, 0.22, 1.2]} />
        <meshStandardMaterial color="#0f172a" metalness={0.15} roughness={0.7} />
      </mesh>
    </group>
  );
}

export default function ManuIAProceduralFallback3D({ modelType }) {
  return (
    <div className="eq-lib-3d-preview-wrap">
      <Canvas camera={{ position: [2.4, 1.6, 2.6], fov: 42 }} gl={{ alpha: false, antialias: true }}>
        <color attach="background" args={['#12141c']} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[5, 7, 4]} intensity={1.05} />
        <directionalLight position={[-4, 1, -5]} intensity={0.35} />
        <ProceduralMachine type={modelType} />
        <OrbitControls makeDefault />
      </Canvas>
      <p className="eq-lib-3d-preview-hint">Fallback procedural ativo (build Unity incompatível)</p>
    </div>
  );
}
