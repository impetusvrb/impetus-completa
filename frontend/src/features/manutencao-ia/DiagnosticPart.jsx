/**
 * IMPETUS - ManuIA - Part com efeitos de diagnóstico
 * Pulsação, modo raio-x (wireframe), vista explodida (offset)
 */
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export function DiagnosticPart({
  name,
  position = [0, 0, 0],
  rotation,
  highlighted = false,
  viewMode = 'normal',
  explodeFactor = 0,
  geometry,
  materialProps = {},
  children
}) {
  const matRef = useRef();

  const [px, py, pz] = position;
  const len = Math.sqrt(px * px + py * py + pz * pz) || 1;
  const offset =
    viewMode === 'exploded' && explodeFactor > 0
      ? [(px / len) * explodeFactor, (py / len) * explodeFactor, (pz / len) * explodeFactor]
      : [0, 0, 0];
  const finalPos = [px + offset[0], py + offset[1], pz + offset[2]];

  useFrame(() => {
    const mat = matRef.current;
    if (!mat || !highlighted || viewMode === 'xray') return;
    const t = Date.now() * 0.003;
    mat.emissive.setHex(0x17b6ff);
    // Emissive mais forte para o usuário enxergar o componente destacado
    mat.emissiveIntensity = 0.35 + Math.max(0, Math.sin(t)) * 0.35;
  });

  const isXray = viewMode === 'xray';

  return (
    <group
      position={finalPos}
      rotation={rotation || [0, 0, 0]}
      scale={highlighted ? [1.08, 1.08, 1.08] : [1, 1, 1]}
    >
      <mesh name={name} castShadow receiveShadow>
        {geometry || children}
        {isXray ? (
          <meshBasicMaterial color={highlighted ? '#ffcc33' : '#1d6fe8'} wireframe />
        ) : (
          <meshStandardMaterial
            ref={matRef}
            {...materialProps}
            emissive={highlighted ? 0x17b6ff : (materialProps.emissive ?? 0)}
            emissiveIntensity={highlighted ? 0.7 : (materialProps.emissiveIntensity ?? 0)}
          />
        )}
      </mesh>
    </group>
  );
}
