/**
 * IMPETUS - ManuIA 3D Vision - Componente principal
 * Orquestra: captura → análise Claude → modelo 3D → chat
 */
import React, { useState, useRef, useCallback } from 'react';
import Vision3DViewer from './components/Vision3DViewer';
import ControlsHUD from './components/ControlsHUD';
import CapturePanel from './components/CapturePanel';
import CopilotChat from './chat/CopilotChat';
import { useVisionChat } from './hooks/useVisionChat';
import styles from './styles/Vision3D.module.css';

export default function Vision3DModule({
  machineId,
  machineName,
  onDiagnosisComplete,
  onGenerateOS,
  apiEndpoint
}) {
  const [viewMode, setViewMode] = useState('photo');
  const [mode3d, setMode3d] = useState('normal');
  const [autoRotate, setAutoRotate] = useState(false);
  const [explode, setExplode] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [machineType, setMachineType] = useState('generico');
  const [faultParts, setFaultParts] = useState([]);
  const [highlightPart, setHighlightPart] = useState(null);
  const viewerRef = useRef(null);
  const origPositionsRef = useRef({});

  const handleAction = useCallback((action) => {
    if (action.type === 'ANALYSIS_COMPLETE') {
      const p = action.payload;
      setMachineType(p.machineType || 'generico');
      setFaultParts(p.faultParts || []);
      setViewMode('split');
      setExplode(!!p.triggerExplode);
      if (p.highlightParts?.length) setHighlightPart(p.highlightParts[0]);
      onDiagnosisComplete?.(p);
    } else if (action.type === 'CHAT_RESPONSE') {
      const p = action.payload;
      if (p.highlight) setHighlightPart(p.highlight);
      if (p.explode !== null) setExplode(p.explode);
      if (p.markFault) setFaultParts((prev) => [...prev, p.markFault].filter(Boolean));
    }
  }, [onDiagnosisComplete]);

  const {
    messages,
    isLoading,
    result,
    analyzeImage,
    sendMessage
  } = useVisionChat({ onAction });

  const handleCapture = useCallback(
    async (base64) => {
      setCapturedImage(base64);
      await analyzeImage(base64);
    },
    [analyzeImage]
  );

  const handleStepClick = useCallback((index) => {
    if (result?.steps?.[index]) {
      const step = result.steps[index];
      const partName = step.part || step.title;
      if (partName) setHighlightPart(partName);
    }
  }, [result]);

  const handleGenerateOS = useCallback(() => {
    if (result && onGenerateOS) {
      onGenerateOS({
        equipment: result.equipment,
        manufacturer: result.manufacturer,
        severity: result.severity,
        steps: result.steps,
        parts: result.parts,
        faultParts,
        machineId,
        machineName
      });
    }
  }, [result, faultParts, machineId, machineName, onGenerateOS]);

  const handleResetCamera = () => viewerRef.current?.resetCamera?.();

  return (
    <div className={styles.module}>
      <div className={styles.layoutSplit}>
        <div className={styles.layoutSplitLeft}>
          {viewMode === '3d' ? (
            <div style={{ position: 'relative', height: '100%' }}>
              <Vision3DViewer
                ref={viewerRef}
                machineType={machineType}
                faultParts={faultParts}
                mode={mode3d}
                autoRotate={autoRotate}
                explodeAmount={explode ? 1.2 : 0}
                origPositionsRef={origPositionsRef}
              />
              <ControlsHUD
                mode={mode3d}
                autoRotate={autoRotate}
                explode={explode}
                onModeChange={setMode3d}
                onAutoRotate={setAutoRotate}
                onExplode={setExplode}
                onReset={handleResetCamera}
              />
            </div>
          ) : viewMode === 'photo' ? (
            <CapturePanel onCapture={handleCapture} disabled={isLoading} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%' }}>
              <div style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {capturedImage ? (
                  <img
                    src={`data:image/jpeg;base64,${capturedImage}`}
                    alt="Captura"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ color: 'var(--text-secondary)' }}>Nenhuma imagem</span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Vision3DViewer
                  ref={viewerRef}
                  machineType={machineType}
                  faultParts={faultParts}
                  mode={mode3d}
                  autoRotate={autoRotate}
                  explodeAmount={explode ? 1.2 : 0}
                />
                <ControlsHUD
                  mode={mode3d}
                  autoRotate={autoRotate}
                  explode={explode}
                  onModeChange={setMode3d}
                  onAutoRotate={setAutoRotate}
                  onExplode={setExplode}
                  onReset={handleResetCamera}
                />
              </div>
            </div>
          )}
        </div>
        <div className={styles.layoutSplitRight}>
          <CopilotChat
            messages={messages}
            isLoading={isLoading}
            result={result}
            onSend={sendMessage}
            onStepClick={handleStepClick}
            onGenerateOS={handleGenerateOS}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
