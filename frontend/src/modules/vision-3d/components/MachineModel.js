/**
 * IMPETUS - ManuIA 3D Vision - Gerador procedural do modelo 3D por tipo
 * Usa apenas BoxGeometry (compatível com Three.js r128+)
 * [name, code, [w,h,d], color_hex, [x,y,z], [rx,ry,rz], status]
 */
import * as THREE from 'three';
import { PART_COLORS } from '../constants/partColors';

export const MACHINE_CONFIGS = {
  motor: [
    { name: 'Carcaça Principal', code: 'CAR-001', geo: [2.4, 1.6, 3.2], col: 0x1a3a2a, pos: [0, 0, 0], rot: [0, 0, 0], status: 'ok' },
    { name: 'Motor Elétrico', code: 'MOT-001', geo: [0.9, 0.9, 1.4], col: 0x0d2b1d, pos: [-0.5, 0.4, 0], rot: [0, 0, 0], status: 'ok' },
    { name: 'Eixo Transmissão', code: 'EIX-003', geo: [0.15, 0.15, 2.8], col: 0x445533, pos: [0.6, 0.2, 0], rot: [0, 0, 1.5708], status: 'ok' },
    { name: 'Rolamento Dianteiro', code: 'ROL-6205', geo: [0.5, 0.5, 0.3], col: 0x334422, pos: [0.6, 0.2, 1.3], rot: [0, 0, 1.5708], status: 'warn' },
    { name: 'Correia Trapezoidal', code: 'COR-A52', geo: [0.08, 0.6, 2.2], col: 0x1a1a0a, pos: [-0.95, 0.35, 0], rot: [0, 0, 0], status: 'crit' },
    { name: 'Tampa de Inspeção', code: 'TAM-002', geo: [1.0, 0.08, 1.2], col: 0x1a3a2a, pos: [0, 0.84, 0.5], rot: [0, 0, 0], status: 'ok' },
    { name: 'Ventilador', code: 'VEN-001', geo: [0.7, 0.7, 0.15], col: 0x223322, pos: [-0.5, 0.4, -1.1], rot: [0, 0, 0], status: 'ok' },
    { name: 'Sensor de Vibração', code: 'SEN-V01', geo: [0.1, 0.1, 0.15], col: 0x002244, pos: [0.6, 0.6, 0.6], rot: [0, 0, 0], status: 'warn' }
  ],
  bomba: [
    { name: 'Carcaça Bomba', code: 'CAR-B01', geo: [1.8, 1.2, 1.4], col: 0x1a3a2a, pos: [0, 0, 0], rot: [0, 0, 0], status: 'ok' },
    { name: 'Impulsionador', code: 'IMP-001', geo: [0.5, 0.5, 0.4], col: 0x334422, pos: [0, 0, 0.3], rot: [0, 0, 0], status: 'ok' },
    { name: 'Selo Mecânico', code: 'SEL-M01', geo: [0.2, 0.2, 0.15], col: 0x445533, pos: [0.6, 0, 0.2], rot: [0, 0, 0], status: 'warn' },
    { name: 'Entrada', code: 'ENT-001', geo: [0.3, 0.3, 0.5], col: 0x223344, pos: [-0.5, 0, -0.4], rot: [0, 0, 0], status: 'ok' },
    { name: 'Saída', code: 'SAI-001', geo: [0.25, 0.25, 0.4], col: 0x223344, pos: [0.8, 0, 0.2], rot: [0, 0, 1.5708], status: 'ok' }
  ],
  compressor: [
    { name: 'Tanque', code: 'TAN-001', geo: [1.5, 1.5, 2.0], col: 0x1a3a2a, pos: [0, 0, 0], rot: [0, 0, 0], status: 'ok' },
    { name: 'Cabeçote', code: 'CAB-001', geo: [0.8, 0.8, 0.4], col: 0x334422, pos: [0, 0, 1.4], rot: [0, 0, 0], status: 'ok' },
    { name: 'Motor', code: 'MOT-C01', geo: [0.5, 0.5, 0.8], col: 0x0d2b1d, pos: [0, 0, -1.2], rot: [0, 0, 0], status: 'ok' },
    { name: 'Válvula de Alívio', code: 'VAL-001', geo: [0.15, 0.15, 0.25], col: 0x442211, pos: [0.4, 0.6, 1.6], rot: [0, 0, 0], status: 'warn' }
  ],
  painel: [
    { name: 'Gabinete', code: 'GAB-001', geo: [1.5, 1.2, 0.6], col: 0x1a3a2a, pos: [0, 0, 0], rot: [0, 0, 0], status: 'ok' },
    { name: 'Porta', code: 'POR-001', geo: [1.3, 1.0, 0.08], col: 0x2a4a3a, pos: [0, 0, 0.35], rot: [0, 0, 0], status: 'ok' },
    { name: 'Display', code: 'DIS-001', geo: [0.3, 0.1, 0.02], col: 0x111111, pos: [0, 0.3, 0.38], rot: [0, 0, 0], status: 'ok' }
  ],
  generico: [
    { name: 'Corpo Principal', code: 'CORP-01', geo: [2, 1.2, 1.5], col: 0x1a3a2a, pos: [0, 0, 0], rot: [0, 0, 0], status: 'ok' },
    { name: 'Componente A', code: 'COMP-A', geo: [0.6, 0.4, 0.5], col: 0x334422, pos: [0.5, 0.3, 0.3], rot: [0, 0, 0], status: 'ok' },
    { name: 'Componente B', code: 'COMP-B', geo: [0.4, 0.3, 0.4], col: 0x445533, pos: [-0.4, 0.2, -0.2], rot: [0, 0, 0], status: 'warn' }
  ]
};

const EXPLODE_DIRS = [
  [0, 0, 0], [-2.2, 1.5, 0], [2, 0, 0], [2.5, 0, 2.2], [-2.8, 1.5, 0],
  [0, 2.4, 0.8], [-1.5, 1.5, -2], [2.8, 0, 0.8], [1.5, 2.2, 1.2], [0, 0, 0]
];

export function buildMachineModel(scene, machineType, faultParts = []) {
  const config = MACHINE_CONFIGS[machineType] || MACHINE_CONFIGS.generico;
  const meshes = [];
  const origPositions = {};

  config.forEach((p, i) => {
    const isFault = (faultParts || []).some(
      (f) =>
        p.name.toLowerCase().includes((f || '').toLowerCase()) ||
        p.code.toLowerCase().includes((f || '').toLowerCase())
    );
    const status = isFault ? 'crit' : p.status;
    const colorMap = PART_COLORS;

    const geo = new THREE.BoxGeometry(...p.geo);
    const mat = new THREE.MeshPhongMaterial({
      color: colorMap[status]?.color ?? 0x1a4a2a,
      emissive: colorMap[status]?.emissive ?? 0x001a08,
      specular: 0x00e887,
      shininess: 40,
      transparent: true,
      opacity: 0.92
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...p.pos);
    mesh.rotation.set(...p.rot);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      ...p,
      status,
      explodeDir: EXPLODE_DIRS[i] || [0, 0, 0],
      index: i
    };
    origPositions[i] = mesh.position.clone();
    scene.add(mesh);
    meshes.push(mesh);

    if (status === 'crit') {
      const maxGeo = Math.max(...p.geo);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(maxGeo * 0.55, 0.02, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0xff3d57, transparent: true })
      );
      ring.position.set(...p.pos);
      ring.rotation.x = Math.PI / 2;
      ring.userData = { isCritRing: true, partIndex: i, explodeDir: EXPLODE_DIRS[i] || [0, 0, 0] };
      scene.add(ring);
      meshes.push(ring);
    }
  });

  return { meshes, origPositions };
}
