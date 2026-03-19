/**
 * IMPETUS - ManuIA 3D Vision - Canvas Three.js + orbit controls manuais + raycaster
 * Renderer: WebGLRenderer, iluminação verde/azul, GridHelper, FogExp2
 * Orbit manual: drag (theta/phi), scroll (zoom), raycaster hover tooltip
 */
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { buildMachineModel, applyHeatmap } from './MachineModel';
import {
  findMeshByPartName,
  startDisassembly,
  startReturn,
  animateDisassemblyState
} from '../utils/disassemblyAnimation';
import PartTooltip from './PartTooltip';
import styles from '../styles/Vision3D.module.css';

const LERP_EXPLODE = 0.04;
const INIT_THETA = 0.6;
const INIT_PHI = 0.9;
const INIT_R = 8;

const Vision3DViewer = forwardRef(function Vision3DViewer({
  machineType = 'generico',
  faultParts = [],
  mode = 'normal',
  thermalMode = false,
  thermalData = [],
  autoRotate = false,
  opacity = 0.92,
  explodeAmount = 0,
  origPositionsRef,
  onPartClick
}, ref) {

  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const meshGroupRef = useRef({ meshes: [], origPositions: {} });
  const orbitRef = useRef({ theta: INIT_THETA, phi: INIT_PHI, r: INIT_R, isDown: false, prevX: 0, prevY: 0 });
  const frameRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const thermalModeRef = useRef(thermalMode);
  const thermalDataRef = useRef(thermalData);
  thermalModeRef.current = thermalMode;
  thermalDataRef.current = thermalData || [];
  const mouseRef = useRef(new THREE.Vector2());
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, name: '', code: '', status: 'ok' });
  const explodeLerpRef = useRef(0);
  const disassemblyStateRef = useRef(null);

  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      orbitRef.current.theta = INIT_THETA;
      orbitRef.current.phi = INIT_PHI;
      orbitRef.current.r = INIT_R;
    },
    animateDisassembly: (partName, direction, onComplete) => {
      const { meshes } = meshGroupRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      if (!meshes?.length || !scene || !camera) return;
      const mesh = findMeshByPartName(meshes, partName);
      if (!mesh) {
        onComplete?.();
        return;
      }
      let dir = direction;
      if (!dir || !(dir instanceof THREE.Vector3)) {
        dir = new THREE.Vector3().subVectors(camera.position, mesh.position).normalize();
        dir.y += 0.3;
        dir.normalize();
      }
      disassemblyStateRef.current = startDisassembly(mesh, scene, camera, dir, onComplete);
    },
    returnPart: () => {
      const s = disassemblyStateRef.current;
      if (s) disassemblyStateRef.current = startReturn(s);
    },
    captureScreenshot: () => {
      const renderer = rendererRef.current;
      if (!renderer?.domElement) return null;
      return renderer.domElement.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
    }
  }), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030806);
    scene.fog = new THREE.FogExp2(0x030806, 0.035);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.setFromSphericalCoords(INIT_R, INIT_PHI, INIT_THETA);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0x00e887, 0.25));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x1d6fe8, 0.4);
    rimLight.position.set(-4, 2, -4);
    scene.add(rimLight);

    const pointLight = new THREE.PointLight(0x00e887, 0.6, 15);
    pointLight.position.set(0, 3, 2);
    scene.add(pointLight);

    const gridHelper = new THREE.GridHelper(12, 20, 0x0a2a1a, 0x0a2a1a);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    const { meshes, origPositions } = buildMachineModel(scene, machineType, faultParts);
    meshGroupRef.current = { meshes, origPositions };
    if (origPositionsRef) origPositionsRef.current = origPositions;

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (orbitRef.current.isDown) {
        const dx = e.clientX - orbitRef.current.prevX;
        const dy = e.clientY - orbitRef.current.prevY;
        orbitRef.current.theta -= dx * 0.005;
        orbitRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, orbitRef.current.phi + dy * 0.005));
        orbitRef.current.prevX = e.clientX;
        orbitRef.current.prevY = e.clientY;
      }
    };

    const handleMouseDown = (e) => {
      if (e.button === 0) {
        orbitRef.current.isDown = true;
        orbitRef.current.prevX = e.clientX;
        orbitRef.current.prevY = e.clientY;
      }
    };

    const handleMouseUp = () => {
      orbitRef.current.isDown = false;
    };

    const handleWheel = (e) => {
      e.preventDefault();
      orbitRef.current.r = Math.max(2, Math.min(20, orbitRef.current.r + e.deltaY * 0.01));
    };

    const handleClick = () => {
      const { meshes } = meshGroupRef.current;
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const hits = raycasterRef.current.intersectObjects(
        meshes.filter((m) => !m.userData?.isCritRing)
      );
      if (hits.length > 0 && onPartClick) {
        const obj = hits[0].object;
        if (obj.userData?.name) onPartClick(obj.userData);
      }
    };

    window.addEventListener('resize', handleResize);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('click', handleClick);

    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.016;
      const orbit = orbitRef.current;
      const camera = cameraRef.current;
      const { meshes, origPositions } = meshGroupRef.current;

      if (autoRotate) {
        orbit.theta += 0.004;
      }
      camera.position.setFromSphericalCoords(orbit.r, orbit.phi, orbit.theta);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      pointLight.intensity = 0.6 + Math.sin(t * 2) * 0.15;

      explodeLerpRef.current += (explodeAmount > 0 ? 1 : -1) * LERP_EXPLODE;
      explodeLerpRef.current = Math.max(0, Math.min(1, explodeLerpRef.current));
      const exp = explodeAmount * explodeLerpRef.current;

      applyHeatmap(meshes.filter((m) => !m.userData?.isCritRing), thermalModeRef.current, Date.now());

      const ds = disassemblyStateRef.current;
      if (ds) {
        const next = animateDisassemblyState(ds, meshes, scene, camera, performance.now(), origPositions);
        disassemblyStateRef.current = next;
      }

      const animatingMesh = disassemblyStateRef.current?.mesh;
      if (animatingMesh) {
        meshes.forEach((m) => {
          if (m.userData?.isCritRing && m.userData.partIndex === animatingMesh.userData?.index) {
            m.position.copy(animatingMesh.position);
          }
        });
      }

      meshes.forEach((mesh, i) => {
        if (mesh === animatingMesh) return;
        if (mesh.userData?.isCritRing && animatingMesh && mesh.userData.partIndex === animatingMesh.userData?.index) return;
        if (mesh.userData?.isCritRing) {
          const partIdx = mesh.userData.partIndex;
          const orig = origPositions[partIdx];
          const dir = mesh.userData.explodeDir || [0, 0, 0];
          if (orig) {
            mesh.position.x = orig.x + dir[0] * exp;
            mesh.position.y = orig.y + dir[1] * exp;
            mesh.position.z = orig.z + dir[2] * exp;
          }
          mesh.material.opacity = 0.5 + Math.sin(t * 3) * 0.2;
          return;
        }
        const orig = origPositions[i];
        if (!orig) return;
        const dir = mesh.userData?.explodeDir || [0, 0, 0];
        mesh.position.x = orig.x + dir[0] * exp;
        mesh.position.y = orig.y + dir[1] * exp;
        mesh.position.z = orig.z + dir[2] * exp;

        if (thermalModeRef.current) {
          mesh.material.wireframe = false;
          mesh.material.opacity = opacity;
        } else if (mode === 'xray') {
          mesh.material.opacity = 0.28;
          mesh.material.wireframe = false;
          mesh.material.transparent = true;
        } else if (mode === 'wireframe') {
          mesh.material.wireframe = true;
          mesh.material.opacity = 1;
        } else {
          mesh.material.wireframe = false;
          mesh.material.opacity = opacity;
        }

        if (!thermalModeRef.current && mesh.userData?.status === 'warn') {
          mesh.material.emissiveIntensity = 0.1 + Math.sin(t * 2) * 0.05;
        }
      });

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const hits = raycasterRef.current.intersectObjects(
        meshes.filter((m) => !m.userData?.isCritRing)
      );
      if (hits.length > 0) {
        const obj = hits[0].object;
        const ud = obj.userData;
        const rect = container.getBoundingClientRect();
        const thermalEntry = thermalModeRef.current && thermalDataRef.current?.find(
          (td) => (td.part && ud.name?.toLowerCase().includes(td.part.toLowerCase())) ||
            (ud.code && td.part?.toLowerCase().includes(ud.code.toLowerCase()))
        );
        setTooltip({
          visible: true,
          x: (mouseRef.current.x * 0.5 + 0.5) * rect.width + rect.left,
          y: (-mouseRef.current.y * 0.5 + 0.5) * rect.height + rect.top,
          name: ud.name || '',
          code: ud.code || '',
          status: ud.status || 'ok',
          estimatedTemp: thermalEntry?.estimatedTemp,
          tempUnit: thermalEntry?.unit || '°C'
        });
      } else {
        setTooltip((prev) => ({ ...prev, visible: false }));
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('click', handleClick);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      meshes.forEach((m) => {
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      });
      scene.clear();
    };
  }, [machineType, faultParts.join(','), onPartClick]);

  useEffect(() => {
    const { meshes, origPositions } = meshGroupRef.current;
    if (!meshes?.length || !origPositions) return;
    meshes.forEach((mesh, i) => {
      if (mesh.userData?.isCritRing) return;
      const orig = origPositions[i];
      if (orig) mesh.position.copy(orig);
    });
  }, [machineType, faultParts.join(',')]);

  return (
    <>
      <div ref={containerRef} className={styles.canvasWrap} style={{ width: '100%', height: '100%' }} />
      {thermalMode && (
        <div className={styles.thermalLegend}>
          <div className={styles.thermalLegend__bar} />
          <span className={styles.thermalLegend__cold}>Frio</span>
          <span className={styles.thermalLegend__hot}>Quente</span>
        </div>
      )}
      <PartTooltip {...tooltip} />
    </>
  );
});

export default Vision3DViewer;
