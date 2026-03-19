/**
 * IMPETUS - ManuIA 3D Vision - Utilitários para animação de desmontagem
 */
import * as THREE from 'three';
const { ArrowHelper } = THREE;

function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function findMeshByPartName(meshes, partName) {
  if (!partName || !meshes?.length) return null;
  const lower = String(partName).toLowerCase();
  return meshes.find((m) => {
    if (m.userData?.isCritRing) return false;
    const name = (m.userData?.name || '').toLowerCase();
    const code = (m.userData?.code || '').toLowerCase();
    return name.includes(lower) || code.includes(lower) || lower.includes(name) || lower.includes(code);
  }) || null;
}

export function createOutlineClone(mesh, color = 0x00e887) {
  const outline = mesh.clone();
  outline.material = new THREE.MeshBasicMaterial({
    color,
    side: THREE.BackSide
  });
  outline.scale.multiplyScalar(1.08);
  outline.userData.isOutline = true;
  return outline;
}

export function animateDisassemblyState(
  state,
  meshes,
  scene,
  camera,
  time,
  origPositions
) {
  const { phase, mesh, outlineClone, arrowHelper, startTime, direction, originPos } = state;
  if (!mesh || !mesh.parent) return state;

  const elapsed = time - startTime;

  if (phase === 'out') {
    const duration = 400;
    const progress = Math.min(1, elapsed / duration);
    const eased = easeOut(progress);
    const dist = 2.5;
    mesh.position.x = originPos.x + direction.x * dist * eased;
    mesh.position.y = originPos.y + direction.y * dist * eased;
    mesh.position.z = originPos.z + direction.z * dist * eased;
    const rotY = 0.3 * eased;
    mesh.rotation.y = rotY;
    if (outlineClone && outlineClone.parent) {
      outlineClone.position.copy(mesh.position);
      outlineClone.rotation.copy(mesh.rotation);
    }
    if (arrowHelper && arrowHelper.parent) {
      const op = 1 - progress;
      [arrowHelper.line?.material, arrowHelper.cone?.material].filter(Boolean).forEach((mat) => { mat.opacity = op; });
    }
    if (progress >= 1) {
      state.phase = 'pause';
      state.startTime = time;
      if (state.onComplete) state.onComplete();
    }
  } else if (phase === 'pause') {
    if (outlineClone && outlineClone.parent) {
      outlineClone.position.copy(mesh.position);
      outlineClone.rotation.copy(mesh.rotation);
    }
  } else if (phase === 'return') {
    const duration = 500;
    const progress = Math.min(1, elapsed / duration);
    const eased = easeInOut(progress);
    mesh.position.x = originPos.x + (mesh.position.x - originPos.x) * (1 - eased);
    mesh.position.y = originPos.y + (mesh.position.y - originPos.y) * (1 - eased);
    mesh.position.z = originPos.z + (mesh.position.z - originPos.z) * (1 - eased);
    mesh.rotation.y = 0.3 * (1 - eased);
    if (outlineClone && outlineClone.parent) {
      outlineClone.position.copy(mesh.position);
      outlineClone.rotation.copy(mesh.rotation);
    }
    if (progress >= 1) {
      mesh.position.copy(originPos);
      mesh.rotation.y = 0;
      if (outlineClone && outlineClone.parent) {
        scene.remove(outlineClone);
        outlineClone.material?.dispose();
      }
      if (arrowHelper && arrowHelper.parent) scene.remove(arrowHelper);
      return null;
    }
  }
  return state;
}

export function startDisassembly(mesh, scene, camera, direction, onComplete) {
  const dir = direction || new THREE.Vector3(0, 1, 0.5).normalize();
  const originPos = mesh.position.clone();
  const outlineClone = createOutlineClone(mesh);
  scene.add(outlineClone);
  outlineClone.position.copy(originPos);

  const arrowDir = dir.clone();
  const arrowOrigin = originPos.clone().add(arrowDir.clone().multiplyScalar(0.5));
  const arrow = new ArrowHelper(arrowDir, arrowOrigin, 1.5, 0x00e887);
  [arrow.line?.material, arrow.cone?.material].filter(Boolean).forEach((mat) => {
    mat.transparent = true;
    mat.opacity = 1;
  });
  scene.add(arrow);

  return {
    phase: 'out',
    mesh,
    outlineClone,
    arrowHelper: arrow,
    startTime: performance.now(),
    direction: dir,
    originPos,
    onComplete
  };
}

export function startReturn(state) {
  if (!state || state.phase === 'return') return state;
  state.phase = 'return';
  state.startTime = performance.now();
  return state;
}
