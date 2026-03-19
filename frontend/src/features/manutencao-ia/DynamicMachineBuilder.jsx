/**
 * IMPETUS - ManuIA - Construtor 3D procedural de equipamentos
 * Suporta diagnóstico guiado: pulsação, raio-x, vista explodida
 */
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DiagnosticPart } from './DiagnosticPart';

function parseColor(hex) {
  if (!hex || typeof hex !== 'string') return 0x2a3a50;
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  return m ? parseInt(m[1], 16) : 0x2a3a50;
}

const hl = (name, h) => h === name;

export function Motor3D({ config, highlightedComponent, viewMode, explodeFactor }) {
  const cfg = config || {};
  const primary = parseColor(cfg.primary_color_hex);
  const accent = parseColor(cfg.accent_color_hex);
  const groupRef = useRef();

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.1;
  });

  return (
    <group ref={groupRef}>
      <DiagnosticPart name="body" position={[0, 0, 0]} highlighted={hl('body', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<cylinderGeometry args={[1.2, 1.2, 2.5, 24]} />} materialProps={{ color: primary, metalness: 0.6, roughness: 0.4 }} />
      <DiagnosticPart name="shaft" position={[0, 0, 1.5]} highlighted={hl('shaft', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />} materialProps={{ color: 0x555555, metalness: 0.9, roughness: 0.2 }} />
      <DiagnosticPart name="fan" position={[0, 0, -1.4]} highlighted={hl('fan', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<cylinderGeometry args={[0.7, 0.7, 0.15, 8]} />} materialProps={{ color: accent, metalness: 0.5, roughness: 0.5 }} />
      <DiagnosticPart name="terminal_box" position={[0, 1.3, 0]} highlighted={hl('terminal_box', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<boxGeometry args={[0.5, 0.3, 0.4]} />} materialProps={{ color: accent, metalness: 0.4, roughness: 0.6 }} />
    </group>
  );
}

export function Pump3D({ config, highlightedComponent, viewMode, explodeFactor }) {
  const cfg = config || {};
  const primary = parseColor(cfg.primary_color_hex);
  const accent = parseColor(cfg.accent_color_hex);
  const hasImpeller = cfg.has_impeller !== false;

  return (
    <group>
      <DiagnosticPart name="volute" position={[0, 0, 0]} highlighted={hl('volute', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<cylinderGeometry args={[0.9, 1.1, 0.8, 32]} />} materialProps={{ color: primary, metalness: 0.5, roughness: 0.5 }} />
      {hasImpeller && <DiagnosticPart name="impeller" position={[0, 0, 0.5]} highlighted={hl('impeller', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<cylinderGeometry args={[0.5, 0.5, 0.2, 12]} />} materialProps={{ color: accent, metalness: 0.7, roughness: 0.3 }} />}
      <DiagnosticPart name="inlet" position={[0, 0, -0.6]} highlighted={hl('inlet', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<cylinderGeometry args={[0.25, 0.25, 0.3, 16]} />} materialProps={{ color: 0x888888, metalness: 0.6, roughness: 0.4 }} />
      <DiagnosticPart name="outlet" position={[0.7, 0, 0]} rotation={[0, 0, -Math.PI / 2]} highlighted={hl('outlet', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<cylinderGeometry args={[0.2, 0.2, 0.4, 16]} />} materialProps={{ color: 0x888888, metalness: 0.6, roughness: 0.4 }} />
    </group>
  );
}

export function Panel3D({ config, highlightedComponent, viewMode, explodeFactor }) {
  const cfg = config || {};
  const primary = parseColor(cfg.primary_color_hex);
  const accent = parseColor(cfg.accent_color_hex);

  return (
    <group>
      <DiagnosticPart name="cabinet" position={[0, 0, 0]} highlighted={hl('cabinet', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<boxGeometry args={[1.5, 1.2, 0.6]} />} materialProps={{ color: primary, metalness: 0.4, roughness: 0.6 }} />
      <DiagnosticPart name="door" position={[0, 0, 0.35]} highlighted={hl('door', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<boxGeometry args={[1.3, 1.0, 0.08]} />} materialProps={{ color: accent, metalness: 0.3, roughness: 0.7 }} />
      <DiagnosticPart name="display" position={[0, 0.3, 0.38]} highlighted={hl('display', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<boxGeometry args={[0.3, 0.1, 0.02]} />} materialProps={{ color: 0x111111, metalness: 0.1, roughness: 0.9 }} />
    </group>
  );
}

export function Compressor3D({ config, highlightedComponent, viewMode, explodeFactor }) {
  const cfg = config || {};
  const primary = parseColor(cfg.primary_color_hex);

  return (
    <group>
      <DiagnosticPart name="tank" position={[0, 0, 0]} highlighted={hl('tank', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<cylinderGeometry args={[0.8, 0.8, 1.5, 24]} />} materialProps={{ color: primary, metalness: 0.6, roughness: 0.4 }} />
      <DiagnosticPart name="motor" position={[0, 0, -1.2]} highlighted={hl('motor', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<cylinderGeometry args={[0.4, 0.4, 0.5, 20]} />} materialProps={{ color: 0x2a3a50, metalness: 0.5, roughness: 0.5 }} />
      <DiagnosticPart name="head" position={[0, 0, 1.1]} highlighted={hl('head', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<cylinderGeometry args={[0.5, 0.8, 0.2, 20]} />} materialProps={{ color: 0x3a4a60, metalness: 0.5, roughness: 0.5 }} />
    </group>
  );
}

export function Inverter3D({ config, highlightedComponent, viewMode, explodeFactor }) {
  const cfg = config || {};
  const primary = parseColor(cfg.primary_color_hex);
  const accent = parseColor(cfg.accent_color_hex);

  return (
    <group>
      <DiagnosticPart name="case" position={[0, 0, 0]} highlighted={hl('case', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<boxGeometry args={[0.8, 0.5, 0.4]} />} materialProps={{ color: primary, metalness: 0.5, roughness: 0.5 }} />
      <DiagnosticPart name="display" position={[0, 0.15, 0.22]} highlighted={hl('display', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<boxGeometry args={[0.4, 0.08, 0.02]} />} materialProps={{ color: 0x222222, metalness: 0.1, roughness: 0.9 }} />
      <DiagnosticPart name="terminals" position={[0, -0.15, 0.22]} highlighted={hl('terminals', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<boxGeometry args={[0.5, 0.05, 0.08]} />} materialProps={{ color: accent, metalness: 0.6, roughness: 0.4 }} />
    </group>
  );
}

export function Generic3D({ config, highlightedComponent, viewMode, explodeFactor }) {
  const cfg = config || {};
  const primary = parseColor(cfg.primary_color_hex);
  const shape = cfg.main_body_shape || 'rectangular';

  if (shape === 'cylindrical') {
    return (
      <DiagnosticPart name="body" position={[0, 0, 0]} highlighted={hl('body', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<cylinderGeometry args={[0.8, 0.8, 1.2, 24]} />} materialProps={{ color: primary, metalness: 0.5, roughness: 0.5 }} />
    );
  }
  return (
    <DiagnosticPart name="body" position={[0, 0, 0]} highlighted={hl('body', highlightedComponent)} viewMode={viewMode} explodeFactor={explodeFactor} geometry={<boxGeometry args={[1, 0.8, 1.2]} />} materialProps={{ color: primary, metalness: 0.5, roughness: 0.5 }} />
  );
}

export default function DynamicMachineBuilder({ research, highlightedComponent, viewMode = 'normal', explodeFactor = 0 }) {
  const rc = research?.render_config || {};
  const type = (research?.model_3d_type || 'generic').toLowerCase();
  const components = research?.components || [];

  const modelProps = { config: rc, highlightedComponent, viewMode, explodeFactor };

  const Model = useMemo(() => {
    switch (type) {
      case 'motor': return <Motor3D {...modelProps} />;
      case 'pump': return <Pump3D {...modelProps} />;
      case 'panel': return <Panel3D {...modelProps} />;
      case 'compressor': return <Compressor3D {...modelProps} />;
      case 'inverter': return <Inverter3D {...modelProps} />;
      default: return <Generic3D {...modelProps} />;
    }
  }, [type, rc, components, research?.specs, highlightedComponent, viewMode, explodeFactor]);

  return <group scale={[1.5, 1.5, 1.5]}>{Model}</group>;
}
