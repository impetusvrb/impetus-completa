/**
 * IMPETUS - ManuIA - Construtor 3D procedural de equipamentos
 * Gera geometria baseada em render_config retornado pela IA
 */
import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function parseColor(hex) {
  if (!hex || typeof hex !== 'string') return 0x2a3a50;
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  return m ? parseInt(m[1], 16) : 0x2a3a50;
}

export function Motor3D({ config, components = [], onComponentClick }) {
  const cfg = config || {};
  const primary = parseColor(cfg.primary_color_hex);
  const accent = parseColor(cfg.accent_color_hex);
  const hasShaft = cfg.has_shaft !== false;
  const hasFan = cfg.has_fan !== false;

  const groupRef = React.useRef();

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.1;
  });

  return (
    <group ref={groupRef}>
      <mesh name="body" castShadow receiveShadow>
        <cylinderGeometry args={[1.2, 1.2, 2.5, 24]} />
        <meshStandardMaterial color={primary} metalness={0.6} roughness={0.4} />
      </mesh>
      {hasShaft && (
        <mesh name="shaft" position={[0, 0, 1.5]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />
          <meshStandardMaterial color={0x555555} metalness={0.9} roughness={0.2} />
        </mesh>
      )}
      {hasFan && (
        <mesh name="fan" position={[0, 0, -1.4]} castShadow>
          <cylinderGeometry args={[0.7, 0.7, 0.15, 8]} />
          <meshStandardMaterial color={accent} metalness={0.5} roughness={0.5} />
        </mesh>
      )}
      <mesh name="terminal_box" position={[0, 1.3, 0]} castShadow>
        <boxGeometry args={[0.5, 0.3, 0.4]} />
        <meshStandardMaterial color={accent} metalness={0.4} roughness={0.6} />
      </mesh>
    </group>
  );
}

export function Pump3D({ config, components = [] }) {
  const cfg = config || {};
  const primary = parseColor(cfg.primary_color_hex);
  const accent = parseColor(cfg.accent_color_hex);
  const hasImpeller = cfg.has_impeller !== false;

  return (
    <group>
      <mesh name="volute" castShadow receiveShadow>
        <cylinderGeometry args={[0.9, 1.1, 0.8, 32]} />
        <meshStandardMaterial color={primary} metalness={0.5} roughness={0.5} />
      </mesh>
      {hasImpeller && (
        <mesh name="impeller" position={[0, 0, 0.5]} castShadow>
          <cylinderGeometry args={[0.5, 0.5, 0.2, 12]} />
          <meshStandardMaterial color={accent} metalness={0.7} roughness={0.3} />
        </mesh>
      )}
      <mesh name="inlet" position={[0, 0, -0.6]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.3, 16]} />
        <meshStandardMaterial color={0x888888} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh name="outlet" position={[0.7, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.4, 16]} />
        <meshStandardMaterial color={0x888888} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function Panel3D({ config }) {
  const cfg = config || {};
  const primary = parseColor(cfg.primary_color_hex);
  const accent = parseColor(cfg.accent_color_hex);

  return (
    <group>
      <mesh name="cabinet" castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.2, 0.6]} />
        <meshStandardMaterial color={primary} metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh name="door" position={[0, 0, 0.35]} castShadow>
        <boxGeometry args={[1.3, 1.0, 0.08]} />
        <meshStandardMaterial color={accent} metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh name="display" position={[0, 0.3, 0.38]} castShadow>
        <boxGeometry args={[0.3, 0.1, 0.02]} />
        <meshStandardMaterial color={0x111111} metalness={0.1} roughness={0.9} />
      </mesh>
    </group>
  );
}

export function Compressor3D({ config }) {
  const cfg = config || {};
  const primary = parseColor(cfg.primary_color_hex);

  return (
    <group>
      <mesh name="tank" castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 1.5, 24]} />
        <meshStandardMaterial color={primary} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh name="motor" position={[0, 0, -1.2]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.5, 20]} />
        <meshStandardMaterial color={0x2a3a50} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh name="head" position={[0, 0, 1.1]} castShadow>
        <cylinderGeometry args={[0.5, 0.8, 0.2, 20]} />
        <meshStandardMaterial color={0x3a4a60} metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}

export function Inverter3D({ config }) {
  const cfg = config || {};
  const primary = parseColor(cfg.primary_color_hex);
  const accent = parseColor(cfg.accent_color_hex);

  return (
    <group>
      <mesh name="case" castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.5, 0.4]} />
        <meshStandardMaterial color={primary} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh name="display" position={[0, 0.15, 0.22]} castShadow>
        <boxGeometry args={[0.4, 0.08, 0.02]} />
        <meshStandardMaterial color={0x222222} metalness={0.1} roughness={0.9} />
      </mesh>
      <mesh name="terminals" position={[0, -0.15, 0.22]} castShadow>
        <boxGeometry args={[0.5, 0.05, 0.08]} />
        <meshStandardMaterial color={accent} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function Generic3D({ config, specs = {} }) {
  const cfg = config || {};
  const primary = parseColor(cfg.primary_color_hex);
  const shape = cfg.main_body_shape || 'rectangular';

  if (shape === 'cylindrical') {
    return (
      <mesh name="body" castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 1.2, 24]} />
        <meshStandardMaterial color={primary} metalness={0.5} roughness={0.5} />
      </mesh>
    );
  }

  return (
    <mesh name="body" castShadow receiveShadow>
      <boxGeometry args={[1, 0.8, 1.2]} />
      <meshStandardMaterial color={primary} metalness={0.5} roughness={0.5} />
    </mesh>
  );
}

export default function DynamicMachineBuilder({ research, onComponentClick }) {
  const rc = research?.render_config || {};
  const type = (research?.model_3d_type || 'generic').toLowerCase();
  const components = research?.components || [];

  const Model = useMemo(() => {
    switch (type) {
      case 'motor':
        return <Motor3D config={rc} components={components} onComponentClick={onComponentClick} />;
      case 'pump':
        return <Pump3D config={rc} components={components} />;
      case 'panel':
        return <Panel3D config={rc} />;
      case 'compressor':
        return <Compressor3D config={rc} />;
      case 'inverter':
        return <Inverter3D config={rc} />;
      default:
        return <Generic3D config={rc} specs={research?.specs || {}} />;
    }
  }, [type, rc, components, research?.specs, onComponentClick]);

  return <group scale={[1.5, 1.5, 1.5]}>{Model}</group>;
}
