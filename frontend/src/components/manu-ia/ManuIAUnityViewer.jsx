/**
 * ManuIA — viewer 3D oficial (Unity WebGL).
 * Substitui o antigo renderizador Three.js; comunicação via unityBridge (SendMessage).
 * Sem build na pasta public/unity/manu-ia-viewer/Build: mostra fallback e mantém comandos preparados.
 */
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
  useCallback
} from 'react';
import { RotateCcw, Box, Scan, Crosshair, Layers } from 'lucide-react';
import {
  UNITY_VIEWER_BASE,
  UNITY_BUILD_NAME
} from '../../config/viewerAssetsConfig';
import { resolveCatalogEntryFromResearch } from '../../config/machineCatalog';
import * as bridge from '../../services/unity/unityBridge';
import './ManuIAUnityViewer.css';

function normalizeBasePath() {
  const b = UNITY_VIEWER_BASE.replace(/\/$/, '');
  return b.startsWith('http') ? b : `${window.location.origin}${b.startsWith('/') ? '' : '/'}${b}`;
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.head.appendChild(s);
  });
}

const ManuIAUnityViewer = forwardRef(function ManuIAUnityViewer(props, ref) {
  const {
    variant = 'search',
    research = null,
    highlightedComponent,
    viewMode = 'normal',
    explodeFactor = 0,
    onViewModeChange,
    className = '',
    machineType = 'generico',
    faultParts = [],
    mode = 'normal',
    explodeAmount = 0,
    machineName
  } = props;

  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [buildMissing, setBuildMissing] = useState(false);
  const [unityError, setUnityError] = useState(null);
  const [viewerStatus, setViewerStatus] = useState('inicializando');
  const lastLoadRef = useRef('');

  const mountUnity = useCallback(async () => {
    const base = normalizeBasePath();
    const loaderUrl = `${base}/Build/${UNITY_BUILD_NAME}.loader.js`;
    try {
      const head = await fetch(loaderUrl, { method: 'HEAD', cache: 'no-store' });
      if (!head.ok) {
        setBuildMissing(true);
        setLoading(false);
        setViewerStatus('build não encontrado — copie a pasta Build do Unity');
        bridge.clearCommandQueue();
        return;
      }
      await loadScriptOnce(loaderUrl);
      const createUnityInstance = window.createUnityInstance;
      if (typeof createUnityInstance !== 'function') {
        throw new Error('createUnityInstance indisponível após carregar o loader');
      }
      const buildUrl = `${base}/Build`;
      const config = {
        dataUrl: `${buildUrl}/${UNITY_BUILD_NAME}.data`,
        frameworkUrl: `${buildUrl}/${UNITY_BUILD_NAME}.framework.js`,
        codeUrl: `${buildUrl}/${UNITY_BUILD_NAME}.wasm`,
        streamingAssetsUrl: `${base}/StreamingAssets`,
        companyName: 'Impetus',
        productName: 'ManuIA',
        productVersion: '1.0'
      };
      const canvas = canvasRef.current;
      if (!canvas) return;
      const instance = await createUnityInstance(canvas, config, (p) => {
        setProgress(Math.round(p * 100));
      });
      bridge.setUnityInstance(instance);
      setLoading(false);
      setViewerStatus('Unity pronto');
    } catch (e) {
      console.warn('[ManuIAUnityViewer]', e?.message);
      setUnityError(e?.message || 'Erro ao iniciar Unity');
      setBuildMissing(true);
      setLoading(false);
      setViewerStatus('erro');
      bridge.setUnityInstance(null);
      bridge.clearCommandQueue();
    }
  }, []);

  useEffect(() => {
    mountUnity();
    return () => {
      bridge.setUnityInstance(null);
      bridge.clearCommandQueue();
    };
  }, [mountUnity]);

  /* --- Modo pesquisa: sincroniza pesquisa IA + diagnóstico --- */
  useEffect(() => {
    if (variant !== 'search' || !research) return;
    const entry = resolveCatalogEntryFromResearch(research);
    const key = entry.unityModelId;
    if (key === lastLoadRef.current) return;
    lastLoadRef.current = key;
    bridge.loadMachine(key);
    setViewerStatus(`Modelo: ${entry.id}`);
  }, [variant, research]);

  useEffect(() => {
    if (variant !== 'search' || !highlightedComponent) return;
    bridge.highlightPart(String(highlightedComponent));
  }, [variant, highlightedComponent]);

  useEffect(() => {
    if (variant !== 'search') return;
    bridge.setXRayMode(viewMode === 'xray', '');
    if (viewMode === 'exploded' || explodeFactor > 0) {
      bridge.explodeView('assembly');
    }
  }, [variant, viewMode, explodeFactor]);

  /* --- Modo vision: faultParts + modo HUD --- */
  useEffect(() => {
    if (variant !== 'vision') return;
    bridge.loadMachine(machineType || 'generico');
  }, [variant, machineType]);

  useEffect(() => {
    if (variant !== 'vision') return;
    (faultParts || []).slice(0, 8).forEach((p) => bridge.showFailure(String(p)));
  }, [variant, faultParts]);

  useEffect(() => {
    if (variant !== 'vision') return;
    bridge.setXRayMode(mode === 'xray', '');
    if (explodeAmount > 0.1) bridge.explodeView('assembly');
  }, [variant, mode, explodeAmount]);

  useImperativeHandle(ref, () => ({
    resetCamera: () => bridge.resetView(),
    animateDisassembly: (partName, _direction, onComplete) => {
      bridge.focusPart(String(partName || ''));
      bridge.explodeView(String(partName || 'assembly'));
      setTimeout(() => onComplete?.(), 900);
    },
    returnPart: () => bridge.resetView(),
    captureScreenshot: () => {
      const canvas = canvasRef.current;
      if (!canvas || buildMissing) return null;
      try {
        return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
      } catch {
        return null;
      }
    }
  }));

  const handleToolbarReset = () => bridge.resetView();
  const handleToolbarExplode = () => bridge.explodeView('assembly');
  const handleToolbarXray = () => bridge.setXRayMode(true, '');
  const handleToolbarFocus = () => bridge.focusPart('motor');

  const showSearchModes = variant === 'search' && research && typeof onViewModeChange === 'function';

  if (variant === 'search' && !research) {
    return (
      <div className={`manuia-viewer manuia-viewer--empty ${className}`}>
        <div className="manuia-viewer__placeholder">
          <span>Pesquise um equipamento para visualizar o modelo 3D (Unity)</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`manuia-unity ${className}`}>
      <div className="manuia-unity__toolbar">
        <span className="manuia-unity__toolbar-label">Viewer</span>
        <button type="button" className="manuia-unity__btn" onClick={handleToolbarReset} title="Repor vista">
          <RotateCcw size={14} /> Reset
        </button>
        <button type="button" className="manuia-unity__btn" onClick={handleToolbarExplode} title="Vista explodida">
          <Box size={14} /> Explodir
        </button>
        <button type="button" className="manuia-unity__btn" onClick={handleToolbarXray} title="Raio-X">
          <Scan size={14} /> Raio-X
        </button>
        <button type="button" className="manuia-unity__btn" onClick={handleToolbarFocus} title="Focar (ex.: motor)">
          <Crosshair size={14} /> Focar
        </button>
        {showSearchModes && (
          <div className="manuia-unity__modes">
            {[
              { id: 'normal', label: 'Normal' },
              { id: 'xray', label: 'Raio-X' },
              { id: 'exploded', label: 'Explodida' }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                className={`manuia-unity__btn ${viewMode === m.id ? 'manuia-unity__btn--active' : ''}`}
                onClick={() => onViewModeChange(m.id)}
              >
                <Layers size={12} /> {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="manuia-unity__canvas-wrap">
        <canvas
          id="unity-canvas-manuia"
          ref={canvasRef}
          tabIndex={-1}
          style={{ width: '100%', height: '100%', outline: 'none' }}
        />
        {loading && !buildMissing && (
          <div className="manuia-unity__loading">
            <div className="manuia-unity__loading-inner">
              <span className="manuia-spinner-sm" />
              <p>A carregar motor Unity… {progress}%</p>
            </div>
          </div>
        )}
        {(buildMissing || unityError) && (
          <div className="manuia-unity__fallback">
            <p>
              <strong>Build WebGL não encontrado ou incompleto.</strong>
            </p>
            <p>
              Exporte o projeto Unity para WebGL e copie o conteúdo para{' '}
              <code>public/unity/manu-ia-viewer/</code> (pasta Build e ficheiros indicados no README).
            </p>
            {unityError && <p className="manuia-error-text">{unityError}</p>}
            <p style={{ fontSize: '0.8rem', opacity: 0.85 }}>
              Os botões acima registem comandos na ponte; serão aplicados quando o build estiver disponível.
            </p>
          </div>
        )}
      </div>

      <div className="manuia-unity__status">
        <span>
          <Layers size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {viewerStatus}
          {machineName ? ` · ${machineName}` : ''}
        </span>
        <code>{buildMissing ? 'sem build' : 'unity'}</code>
      </div>
    </div>
  );
});

export default ManuIAUnityViewer;
