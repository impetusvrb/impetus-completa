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
    mat.emissive.setHex(0xcc2222);
    mat.emissiveIntensity = 0.12 + Math.sin(t) * 0.08;
  });

  const isXray = viewMode === 'xray';

  return (
    <group position={finalPos} rotation={rotation || [0, 0, 0]}>
      <mesh name={name} castShadow receiveShadow>
        {geometry || children}
        {isXray ? (
          <meshBasicMaterial color="#1d6fe8" wireframe />
        ) : (
          <meshStandardMaterial
            ref={matRef}
            {...materialProps}
            emissive={highlighted ? 0x440000 : (materialProps.emissive ?? 0)}
          />
        )}
      </mesh>
    </group>
  );
}
