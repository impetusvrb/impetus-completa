import React, { Suspense, useLayoutEffect, useMemo, useState } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { Center, OrbitControls, useGLTF } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { isUploadsAssetUrl, fetchUploadAsBlobUrl } from '../../utils/protectedUploadMedia';

function resolveUrl(p) {
  if (!p) return '';
  if (p.startsWith('http')) return p;
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}${p.startsWith('/') ? '' : '/'}${p}`;
}

function useResolvedModelUrl(url) {
  const [resolved, setResolved] = useState(null);

  useLayoutEffect(() => {
    let blobRef;
    if (!url) {
      setResolved(null);
      return undefined;
    }
    const abs = resolveUrl(url);
    const needsBearer = isUploadsAssetUrl(url) || isUploadsAssetUrl(abs);
    if (!needsBearer) {
      setResolved(abs);
      return undefined;
    }
    setResolved(null);
    fetchUploadAsBlobUrl(url)
      .then((b) => {
        blobRef = b;
        setResolved(b);
      })
      .catch(() => setResolved(null));
    return () => {
      if (blobRef) URL.revokeObjectURL(blobRef);
    };
  }, [url]);

  return resolved;
}

function GltfSubject({ url }) {
  const u = resolveUrl(url);
  const { scene } = useGLTF(u);
  const clone = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={clone} />;
}

function ObjSubject({ url }) {
  const u = resolveUrl(url);
  const obj = useLoader(OBJLoader, u);
  const clone = useMemo(() => obj.clone(true), [obj]);
  return <primitive object={clone} />;
}

function StlSubject({ url }) {
  const u = resolveUrl(url);
  const geom = useLoader(STLLoader, u);
  useLayoutEffect(() => {
    geom.computeVertexNormals();
  }, [geom]);
  return (
    <mesh geometry={geom}>
      <meshStandardMaterial color="#9ca3c2" metalness={0.15} roughness={0.5} />
    </mesh>
  );
}

function FbxSubject({ url }) {
  const u = resolveUrl(url);
  const fbx = useLoader(FBXLoader, u);
  const clone = useMemo(() => fbx.clone(true), [fbx]);
  return <primitive object={clone} />;
}

function Subject({ url }) {
  const ext = (url || '').split('.').pop().toLowerCase().split('?')[0];
  if (ext === 'glb' || ext === 'gltf') return <GltfSubject url={url} />;
  if (ext === 'obj') return <ObjSubject url={url} />;
  if (ext === 'stl') return <StlSubject url={url} />;
  if (ext === 'fbx') return <FbxSubject url={url} />;
  return null;
}

function Scene({ url }) {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[6, 8, 4]} intensity={0.95} />
      <directionalLight position={[-4, 2, -6]} intensity={0.35} />
      <Suspense fallback={null}>
        <Center>
          <Subject url={url} />
        </Center>
      </Suspense>
      <OrbitControls makeDefault minPolarAngle={0.15} maxPolarAngle={Math.PI / 1.85} />
    </>
  );
}

export default function EquipmentLibraryModel3DPreview({ url }) {
  const ext = url ? url.split('.').pop().toLowerCase().split('?')[0] : '';
  const canPreview = url && ['glb', 'gltf', 'obj', 'stl', 'fbx'].includes(ext);
  const resolvedUrl = useResolvedModelUrl(canPreview ? url : null);

  if (!url) {
    return <div className="eq-lib-3d-preview-empty">Selecione um modelo na tabela para pré-visualizar.</div>;
  }
  if (!canPreview) {
    return (
      <div className="eq-lib-3d-preview-empty">
        Formato <strong>.{ext}</strong> sem viewer embutido. Faça download do ficheiro para abrir externamente.
      </div>
    );
  }
  if (!resolvedUrl) {
    return <div className="eq-lib-3d-preview-empty">Carregando modelo…</div>;
  }
  return (
    <div className="eq-lib-3d-preview-wrap">
      <Canvas camera={{ position: [2.2, 1.6, 2.8], fov: 42 }} gl={{ alpha: false, antialias: true }}>
        <color attach="background" args={['#12141c']} />
        <Scene url={resolvedUrl} />
      </Canvas>
      <p className="eq-lib-3d-preview-hint">Arraste para rodar · scroll para aproximar</p>
    </div>
  );
}
