/**
 * IMPETUS - ManuIA 3D Vision - Componente principal
 * Orquestra: captura → análise Claude → modelo 3D → chat
 * Inclui: Histórico de diagnósticos (IndexedDB)
 */
import React, { useState, useRef, useCallback } from 'react';
import Vision3DViewer from './components/Vision3DViewer';
import ControlsHUD from './components/ControlsHUD';
import CapturePanel from './components/CapturePanel';
import CopilotChat from './chat/CopilotChat';
import DiagnosisHistory from './components/DiagnosisHistory';
import ComparePanel from './components/ComparePanel';
import ReportModal from './components/ReportModal';
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSession, setCompareSession] = useState(null);
  const [restoredSession, setRestoredSession] = useState(null);
  const [thermalMode, setThermalMode] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const viewerRef = useRef(null);
  const origPositionsRef = useRef({});

  const handleAction = useCallback((action) => {
    if (action.type === 'ANALYSIS_COMPLETE') {
      const p = action.payload;
      setRestoredSession(null);
      setCompareMode(false);
      setCompareSession(null);
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
      if (p.animationAction === 'remove' && p.animationTarget && !animatingStepRef.current) {
        setAnimatingStep(true);
        viewerRef.current?.animateDisassembly?.(p.animationTarget, null, () => {
          setAnimatingStep(false);
          setPartRemovedStep(0);
        });
      } else if (p.animationAction === 'return') {
        viewerRef.current?.returnPart?.();
        setPartRemovedStep(null);
      }
    }
  }, [onDiagnosisComplete]);

  const {
    messages,
    isLoading,
    result,
    analyzeImage,
    analyzeAudio,
    sendMessage
  } = useVisionChat({ onAction, machineId, machineName, machineType: machineType || 'generico' });

  const displayResult = restoredSession || result;
  const displayMachineType = restoredSession ? restoredSession.machineType : machineType;
  const displayFaultParts = restoredSession ? restoredSession.faultParts : faultParts;

  const handleRestoreSession = useCallback((session) => {
    setRestoredSession(session);
    setMachineType(session.machineType || 'generico');
    setFaultParts(session.faultParts || []);
    setViewMode('split');
  }, []);

  const handleCompareSession = useCallback((session) => {
    setCompareSession(session);
    setCompareMode(true);
  }, []);

  const exitCompareMode = useCallback(() => {
    setCompareMode(false);
    setCompareSession(null);
  }, []);

  const handleCapture = useCallback(
    async (base64) => {
      setAudioWaveform(null);
      setCapturedImage(base64);
      await analyzeImage(base64);
    },
    [analyzeImage]
  );

  const [audioWaveform, setAudioWaveform] = useState(null);

  const handleAudioAnalyze = useCallback(
    async (spectrum, peaks) => {
      setAudioWaveform(spectrum?.slice(0, 80) || []);
      const converted = await analyzeAudio(spectrum, peaks, machineType || 'generico');
      if (converted?._audioDiagnosis?.severity === 'critical' && onGenerateOS) {
        onGenerateOS({
          equipment: converted.equipment,
          manufacturer: converted.manufacturer,
          severity: 'CRITICO',
          steps: converted.steps,
          parts: converted.parts,
          faultParts: converted.faultParts,
          machineId,
          machineName
        });
      }
    },
    [analyzeAudio, machineType, machineId, machineName, onGenerateOS]
  );

  const [animatingStep, setAnimatingStep] = useState(false);
  const [partRemovedStep, setPartRemovedStep] = useState(null);
  const animatingStepRef = useRef(false);
  animatingStepRef.current = animatingStep;

  const handleStepClick = useCallback((index, partName) => {
    if (animatingStep || !displayResult?.steps?.[index]) return;
    const step = displayResult.steps[index];
    const name = partName || step.part || step.title;
    if (name) setHighlightPart(name);
    setAnimatingStep(true);
    viewerRef.current?.animateDisassembly?.(name, null, () => {
      setAnimatingStep(false);
      setPartRemovedStep(index);
    });
  }, [displayResult, animatingStep]);

  const handleReturnPart = useCallback(() => {
    viewerRef.current?.returnPart?.();
    setPartRemovedStep(null);
  }, []);

  const handleOpenReport = useCallback(() => {
    if (displayResult) setReportModalOpen(true);
  }, [displayResult]);

  const handleGenerateOS = useCallback(() => {
    if (displayResult && onGenerateOS) {
      onGenerateOS({
        equipment: displayResult.equipment,
        manufacturer: displayResult.manufacturer,
        severity: displayResult.severity,
        steps: displayResult.steps,
        parts: displayResult.parts,
        faultParts: displayFaultParts,
        machineId,
        machineName
      });
    }
  }, [displayResult, displayFaultParts, machineId, machineName, onGenerateOS]);

  const getModelScreenshot = useCallback(async () => {
    const was = autoRotate;
    setAutoRotate(false);
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => setTimeout(r, 80));
    const b64 = viewerRef.current?.captureScreenshot?.() ?? null;
    setAutoRotate(was);
    return b64;
  }, [autoRotate]);

  const handleResetCamera = () => viewerRef.current?.resetCamera?.();

  return (
    <div className={styles.module}>
      <div className={styles.layoutSplit}>
        <div className={styles.layoutSplitLeft} style={{ position: 'relative' }}>
          {viewMode === '3d' ? (
            <div style={{ position: 'relative', height: '100%' }}>
              <Vision3DViewer
                ref={viewerRef}
                machineType={displayMachineType}
                faultParts={displayFaultParts}
                mode={mode3d}
                thermalMode={thermalMode}
                thermalData={displayResult?.thermalData || []}
                autoRotate={autoRotate}
                explodeAmount={explode ? 1.2 : 0}
                origPositionsRef={origPositionsRef}
              />
              <ControlsHUD
                mode={mode3d}
                autoRotate={autoRotate}
                explode={explode}
                thermalMode={thermalMode}
                onModeChange={setMode3d}
                onAutoRotate={setAutoRotate}
                onExplode={setExplode}
                onReset={handleResetCamera}
                onHistory={() => setHistoryOpen(true)}
                onThermalMode={setThermalMode}
              />
            </div>
          ) : viewMode === 'photo' ? (
            <CapturePanel
              onCapture={handleCapture}
              onAudioAnalyze={handleAudioAnalyze}
              disabled={isLoading}
              machineType={displayMachineType}
              machineName={machineName}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%' }}>
              <div style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {capturedImage ? (
                  <img
                    src={`data:image/jpeg;base64,${capturedImage}`}
                    alt="Captura"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : audioWaveform?.length ? (
                  <div style={{ width: '100%', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Espectro de vibração</p>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, height: 80 }}>
                      {audioWaveform.slice(0, 60).map((s, i) => (
                        <div
                          key={i}
                          style={{
                            width: 4,
                            height: `${Math.max(4, Math.min(100, (s.amplitude || 0) * 0.5 + 20))}%`,
                            background: 'rgba(30, 144, 255, 0.7)',
                            borderRadius: 2
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-secondary)' }}>Nenhuma imagem</span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Vision3DViewer
                  ref={viewerRef}
                  machineType={displayMachineType}
                  faultParts={displayFaultParts}
                  mode={mode3d}
                  thermalMode={thermalMode}
                  thermalData={displayResult?.thermalData || []}
                  autoRotate={autoRotate}
                  explodeAmount={explode ? 1.2 : 0}
                />
                <ControlsHUD
                  mode={mode3d}
                  autoRotate={autoRotate}
                  explode={explode}
                  thermalMode={thermalMode}
                  onModeChange={setMode3d}
                  onAutoRotate={setAutoRotate}
                  onExplode={setExplode}
                  onReset={handleResetCamera}
                  onHistory={() => setHistoryOpen(true)}
                  onThermalMode={setThermalMode}
                />
              </div>
            </div>
          )}
          {historyOpen && (
            <DiagnosisHistory
              open={historyOpen}
              machineId={machineId ?? 'default'}
              currentResult={displayResult}
              onClose={() => setHistoryOpen(false)}
              onRestoreSession={handleRestoreSession}
              onCompareSession={handleCompareSession}
              onCompareMode={setCompareMode}
            />
          )}
        </div>
        <div className={styles.layoutSplitRight}>
          {compareMode && compareSession && (
            <ComparePanel
              previousSession={compareSession}
              currentResult={displayResult}
              onClose={exitCompareMode}
            />
          )}
          {!compareMode && (
          <CopilotChat
            messages={messages}
            isLoading={isLoading}
            result={displayResult}
            onSend={sendMessage}
            onStepClick={handleStepClick}
            onReturnPart={handleReturnPart}
            animatingStep={animatingStep}
            partRemovedStep={partRemovedStep}
            onOpenReport={handleOpenReport}
            onGenerateOS={handleGenerateOS}
            disabled={isLoading}
          />
          )}
        </div>
      </div>
      <ReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        data={
          displayResult
            ? {
                equipment: displayResult.equipment,
                manufacturer: displayResult.manufacturer,
                severity: displayResult.severity,
                confidence: displayResult.confidence,
                parts: displayResult.parts,
                steps: displayResult.steps,
                faultParts: displayFaultParts,
                webSources: displayResult.webSources,
                capturedImageBase64: capturedImage
              }
            : null
        }
        getModelScreenshot={getModelScreenshot}
        machineId={machineId}
      />
    </div>
  );
}
