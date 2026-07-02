/**
 * IMPETUS — ManuIA — Assistência Técnica ao Vivo
 * Substitui o antigo módulo "Diagnóstico 3D": câmera + loop + dossiê backend + copiloto + Unity opcional
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Pause,
  Play,
  Snowflake,
  Camera,
  RefreshCw,
  Volume2,
  VolumeX,
  Box,
  BookOpen,
  History,
  ClipboardList,
  Wrench,
  Save,
  ChevronRight,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import ManuIAUnityViewer from '../../components/manu-ia/ManuIAUnityViewer';
import { manutencaoIa } from '../../services/api';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';
import LiveSessionStatus from './LiveSessionStatus';
import {
  attachStreamToVideo,
  enumerateVideoDevices,
  isGetUserMediaSupported,
  isSecureMediaContext,
  mapMediaError,
  requestCameraStream,
  stopMediaStream
} from '../../utils/cameraMediaUtils';
import styles from './LiveTechnicalAssistance.module.css';

const UI_STATUS = {
  idle: 'idle',
  starting: 'starting',
  live: 'live',
  analyzing: 'analyzing',
  part_detected: 'part_detected',
  fetching_manual: 'fetching_manual',
  fetching_3d: 'fetching_3d',
  fetching_history: 'fetching_history',
  inconclusive: 'inconclusive',
  ready: 'ready',
  error: 'error'
};

function statusLabel(s) {
  const map = {
    [UI_STATUS.idle]: 'Pronto para iniciar',
    [UI_STATUS.starting]: 'Iniciando câmera…',
    [UI_STATUS.live]: 'Ao vivo',
    [UI_STATUS.analyzing]: 'Analisando imagem…',
    [UI_STATUS.part_detected]: 'Peça detectada',
    [UI_STATUS.fetching_manual]: 'Buscando manuais…',
    [UI_STATUS.fetching_3d]: 'Buscando modelo 3D…',
    [UI_STATUS.fetching_history]: 'Buscando histórico/OS…',
    [UI_STATUS.inconclusive]: 'Identificação inconclusiva',
    [UI_STATUS.ready]: 'Pronto para orientar',
    [UI_STATUS.error]: 'Erro — verifique conexão ou API'
  };
  return map[s] || s;
}

export default function LiveTechnicalAssistanceModule({
  machineId,
  machineName,
  uploadTrigger = 0,
  onDiagnosisComplete,
  onGenerateOS
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const loopRef = useRef(null);
  const sessionIdRef = useRef(null);
  const streamRef = useRef(null);
  const uploadFileRef = useRef(null);

  const [assistanceOn, setAssistanceOn] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [paused, setPaused] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [frozenDataUrl, setFrozenDataUrl] = useState(null);
  const [intervalSec, setIntervalSec] = useState(2.5);
  const [devices, setDevices] = useState([]);
  const [deviceIndex, setDeviceIndex] = useState(0);
  const [facingMode, setFacingMode] = useState('environment');
  const [cameraCanRetry, setCameraCanRetry] = useState(false);

  const [uiStatus, setUiStatus] = useState(UI_STATUS.idle);
  const [dossier, setDossier] = useState(null);
  const [detection, setDetection] = useState(null);
  const [error, setError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [unityOpen, setUnityOpen] = useState(false);
  const [muteAiVoice, setMuteAiVoice] = useState(false);
  const [guidanceStep, setGuidanceStep] = useState(0);

  const onSpeechResult = useCallback((text) => {
    if (text?.trim()) setChatInput((q) => (q ? `${q} ${text.trim()}` : text.trim()));
  }, []);
  const {
    isListening,
    error: speechError,
    supported: speechSupported,
    start: startMic,
    stop: stopMic
  } = useSpeechRecognition({ lang: 'pt-BR', onResult: onSpeechResult });

  const showNotice = useCallback((text, tone = 'info') => {
    setActionNotice({ text, tone });
    window.setTimeout(() => setActionNotice(null), 5000);
  }, []);

  const speak = useCallback(
    (text) => {
      if (muteAiVoice || !text || typeof window === 'undefined' || !window.speechSynthesis) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.slice(0, 1200));
        u.lang = 'pt-BR';
        window.speechSynthesis.speak(u);
      } catch {
        /* ignore */
      }
    },
    [muteAiVoice]
  );

  const refreshCameraList = useCallback(async () => {
    try {
      const vids = await enumerateVideoDevices();
      setDevices(vids);
      return vids;
    } catch (e) {
      console.warn('[MANUIA_LIVE_CAMERA_ENUM]', e?.message);
      setDevices([]);
      return [];
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setAssistanceOn(false);
    setUiStatus(UI_STATUS.idle);
  }, []);

  const applyCameraStream = useCallback(
    async (s) => {
      stopMediaStream(streamRef.current);
      streamRef.current = s;
      if (videoRef.current) await attachStreamToVideo(videoRef.current, s);
      setAssistanceOn(true);
      setUiStatus(UI_STATUS.live);
      setCameraCanRetry(false);
      await refreshCameraList();
    },
    [refreshCameraList]
  );

  const ensureLiveSession = useCallback(async () => {
    if (sessionIdRef.current) return;
    try {
      const cr = await manutencaoIa.createSession({
        machine_id: machineId || null,
        session_type: 'guidance'
      });
      const sid = cr.data?.session?.id;
      if (sid) sessionIdRef.current = sid;
    } catch (e) {
      console.warn('[MANUIA_LIVE_SESSION]', e?.response?.data?.error || e?.message);
      showNotice('Sessão ManuIA não criada — análise segue sem histórico persistido.', 'warn');
    }
  }, [machineId, showNotice]);

  const startCamera = useCallback(async () => {
    setError(null);
    setActionNotice(null);
    setUiStatus(UI_STATUS.starting);

    if (!isGetUserMediaSupported()) {
      const mapped = mapMediaError({ name: 'NotSupportedError' });
      setError(mapped.message);
      setCameraCanRetry(false);
      setUiStatus(UI_STATUS.error);
      return;
    }
    if (!isSecureMediaContext()) {
      const mapped = mapMediaError({ name: 'SecurityError' });
      setError(mapped.message);
      setCameraCanRetry(false);
      setUiStatus(UI_STATUS.error);
      return;
    }

    stopMediaStream(streamRef.current);
    streamRef.current = null;

    const preferredId = devices[deviceIndex]?.deviceId;
    try {
      const s = await requestCameraStream({
        deviceId: preferredId,
        facingMode,
        audio: false
      });
      await applyCameraStream(s);
      await ensureLiveSession();
    } catch (e) {
      const mapped = mapMediaError(e);
      console.warn(`[MANUIA_LIVE_CAMERA] ${mapped.logLabel}`, e?.name, e?.message);
      if (mapped.code === 'constraint' || mapped.code === 'unknown') {
        try {
          const altFacing = facingMode === 'environment' ? 'user' : 'environment';
          const s2 = await requestCameraStream({ facingMode: altFacing, audio: false });
          setFacingMode(altFacing);
          await applyCameraStream(s2);
          await ensureLiveSession();
          showNotice('Câmera iniciada com lente alternativa.', 'info');
          return;
        } catch (e2) {
          const mapped2 = mapMediaError(e2);
          setError(mapped2.message);
          setCameraCanRetry(mapped2.canRetry);
          setUiStatus(UI_STATUS.error);
          return;
        }
      }
      setError(mapped.message);
      setCameraCanRetry(mapped.canRetry);
      setUiStatus(UI_STATUS.error);
    }
  }, [devices, deviceIndex, facingMode, applyCameraStream, ensureLiveSession, showNotice]);

  useEffect(() => {
    return () => {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (uploadTrigger > 0) uploadFileRef.current?.click();
  }, [uploadTrigger]);

  const captureFrameBase64 = useCallback(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || !v.videoWidth) return null;
    c.width = Math.min(v.videoWidth, 1280);
    c.height = Math.min(v.videoHeight, 960);
    const ctx = c.getContext('2d');
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL('image/jpeg', 0.82);
    return dataUrl.replace(/^data:image\/jpeg;base64,/, '');
  }, []);

  const processUploadFile = useCallback(
    async (f) => {
      if (!f) return;
      if (f.type.startsWith('video/')) {
        showNotice('Vídeo recebido: extraia um frame (captura de tela) ou envie foto JPEG/PNG.', 'warn');
        return;
      }
      if (!f.type.startsWith('image/')) {
        showNotice('Formato não suportado. Use JPEG, PNG ou WebP.', 'warn');
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result;
        const b64 = String(dataUrl).split(',')[1] || '';
        setFrozen(true);
        setFrozenDataUrl(dataUrl);
        setUiStatus(UI_STATUS.analyzing);
        setError(null);
        try {
          if (!sessionIdRef.current) await ensureLiveSession();
          const r = await manutencaoIa.liveAnalyzeFrame({
            imageBase64: b64,
            machineId: machineId || null,
            sessionId: sessionIdRef.current || null
          });
          if (r.data?.ok) {
            setDetection(r.data.detection);
            setDossier(r.data.dossier);
            setUiStatus(UI_STATUS.ready);
            showNotice('Imagem enviada e analisada.', 'success');
          } else {
            throw new Error(r.data?.error || 'Falha na análise');
          }
        } catch (err) {
          const msg = err?.response?.data?.error || err?.message || 'Erro no upload';
          console.warn('[MANUIA_LIVE_UPLOAD]', msg);
          setError(msg);
          setUiStatus(UI_STATUS.error);
        }
      };
      reader.onerror = () => {
        setError('Não foi possível ler o arquivo selecionado.');
        showNotice('Falha ao ler o arquivo.', 'warn');
      };
      reader.readAsDataURL(f);
    },
    [machineId, ensureLiveSession, showNotice]
  );

  const handleUploadFile = useCallback(
    (e) => {
      const f = e.target.files?.[0];
      e.target.value = '';
      processUploadFile(f);
    },
    [processUploadFile]
  );

  const runAnalyze = useCallback(async () => {
    if (paused) {
      showNotice('Análise pausada — retome para capturar frames.', 'warn');
      return;
    }
    let b64 = frozen ? (frozenDataUrl || '').replace(/^data:image\/[a-z]+;base64,/, '') : captureFrameBase64();
    if (!b64 || b64.length < 80) {
      const msg = assistanceOn
        ? 'Aguarde o preview da câmera carregar ou congele um frame antes de analisar.'
        : 'Inicie a câmera ou envie uma imagem por Upload.';
      setError(msg);
      showNotice(msg, 'warn');
      return;
    }

    setError(null);
    setUiStatus(UI_STATUS.analyzing);
    try {
      const r = await manutencaoIa.liveAnalyzeFrame({
        imageBase64: b64,
        machineId: machineId || null,
        sessionId: sessionIdRef.current || null
      });
      const data = r.data;
      if (!data?.ok) throw new Error(data?.error || 'Falha na análise');

      setDetection(data.detection);
      setDossier(data.dossier);
      onDiagnosisComplete?.({ liveAssistance: true, detection: data.detection, dossier: data.dossier });

      const d = data.detection || {};
      const cl = (d.confidence_level || '').toLowerCase();
      setUiStatus(UI_STATUS.fetching_manual);
      await new Promise((res) => setTimeout(res, 120));
      setUiStatus(UI_STATUS.fetching_3d);
      await new Promise((res) => setTimeout(res, 120));
      setUiStatus(UI_STATUS.fetching_history);
      await new Promise((res) => setTimeout(res, 120));

      if (data.dossier?.matched_internal_3d) setUiStatus(UI_STATUS.ready);
      else if (cl === 'inconclusivo') setUiStatus(UI_STATUS.inconclusive);
      else setUiStatus(UI_STATUS.ready);

      const summary = data.dossier?.technical_summary || d.technical_summary;
      if (summary) speak(summary);
    } catch (e) {
      const errMsg = e?.response?.data?.error || e?.message || 'Erro na análise';
      console.warn('[MANUIA_LIVE_ANALYZE]', errMsg);
      setError(errMsg);
      setUiStatus(UI_STATUS.error);
    }
  }, [paused, frozen, frozenDataUrl, captureFrameBase64, machineId, onDiagnosisComplete, speak, assistanceOn, showNotice]);

  useEffect(() => {
    if (!assistanceOn || paused || frozen) {
      if (loopRef.current) {
        clearInterval(loopRef.current);
        loopRef.current = null;
      }
      return undefined;
    }
    const ms = Math.max(1.2, Number(intervalSec) || 2.5) * 1000;
    loopRef.current = setInterval(() => {
      runAnalyze();
    }, ms);
    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, [assistanceOn, paused, frozen, intervalSec, runAnalyze]);

  const startLiveAssistance = async () => {
    setError(null);
    setFrozen(false);
    setFrozenDataUrl(null);
    await startCamera();
  };

  const toggleFreeze = () => {
    if (!frozen) {
      const b64 = captureFrameBase64();
      if (!b64) {
        showNotice('Não há frame da câmera para congelar. Aguarde o preview ou use Upload.', 'warn');
        return;
      }
      setFrozenDataUrl(`data:image/jpeg;base64,${b64}`);
      setFrozen(true);
      showNotice('Frame congelado — análise usa esta imagem.', 'info');
    } else {
      setFrozen(false);
      setFrozenDataUrl(null);
      showNotice('Frame liberado — voltando ao fluxo ao vivo.', 'info');
    }
  };

  const switchCamera = async () => {
    if (!assistanceOn) return;
    setError(null);
    const vids = await refreshCameraList();
    if (vids.length >= 2) {
      const next = (deviceIndex + 1) % vids.length;
      const devId = vids[next]?.deviceId;
      setDeviceIndex(next);
      try {
        stopMediaStream(streamRef.current);
        const s = await requestCameraStream({ deviceId: devId, facingMode, audio: false });
        await applyCameraStream(s);
        showNotice(`Câmera: ${vids[next]?.label || `dispositivo ${next + 1}`}`, 'info');
        return;
      } catch (e) {
        const mapped = mapMediaError(e);
        console.warn('[MANUIA_LIVE_SWITCH]', mapped.logLabel, e?.message);
        setError(mapped.message);
      }
    }
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    try {
      stopMediaStream(streamRef.current);
      const s = await requestCameraStream({ facingMode: nextFacing, audio: false });
      setFacingMode(nextFacing);
      await applyCameraStream(s);
      showNotice(nextFacing === 'user' ? 'Câmera frontal ativa' : 'Câmera traseira ativa', 'info');
    } catch (e) {
      const mapped = mapMediaError(e);
      console.warn('[MANUIA_LIVE_SWITCH_FACING]', mapped.logLabel, e?.message);
      setError(mapped.message);
    }
  };

  const sendChat = async (text) => {
    const t = (text || chatInput).trim();
    if (!t) return;
    setChatInput('');
    setMessages((m) => [...m, { role: 'user', content: t }]);
    setChatLoading(true);
    try {
      const hist = [...messages, { role: 'user', content: t }];
      const r = await manutencaoIa.liveChat({
        messages: hist.map((x) => ({ role: x.role, content: x.content })),
        dossier: dossier || {}
      });
      const reply = r.data?.reply || '';
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      speak(reply);
    } catch (e) {
      const err = e?.response?.data?.error || e?.message || 'Erro';
      setMessages((m) => [...m, { role: 'assistant', content: `(${err})` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const saveSession = async () => {
    if (!dossier) {
      showNotice('Execute uma análise antes de salvar a sessão.', 'warn');
      return;
    }
    if (!sessionIdRef.current) {
      await ensureLiveSession();
    }
    if (!sessionIdRef.current) {
      showNotice('Sessão indisponível — não foi possível salvar no histórico.', 'warn');
      return;
    }
    try {
      const r = await manutencaoIa.liveSaveSession({
        sessionId: sessionIdRef.current,
        dossier,
        summaryText: dossier?.technical_summary || null
      });
      if (!r.data?.ok) throw new Error(r.data?.error || 'Falha ao salvar');
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Sessão salva no histórico ManuIA.' }
      ]);
      showNotice('Análise salva no histórico ManuIA.', 'success');
    } catch (e) {
      const err = e?.response?.data?.error || e?.message || 'Erro ao salvar sessão';
      console.warn('[MANUIA_LIVE_SAVE]', err);
      setError(err);
      showNotice(err, 'warn');
    }
  };

  const openOs = () => {
    if (!dossier && !detection) {
      showNotice('Execute uma análise com peça detectada antes de gerar OS.', 'warn');
      return;
    }
    onGenerateOS?.({
      equipment: dossier?.probable_machine || dossier?.research?.equipment?.name || machineName || 'Peça em campo',
      manufacturer: dossier?.probable_brand || dossier?.research?.equipment?.manufacturer || '',
      severity: dossier?.operational_risk === 'alto' ? 'CRITICO' : 'ALERTA',
      steps: (dossier?.next_actions || []).map((a, i) => ({ title: `Passo ${i + 1}`, desc: a })),
      faultParts: dossier?.probable_failures || [],
      machineId,
      machineName
    });
    if (!onGenerateOS) {
      showNotice('Modal de OS indisponível neste contexto.', 'warn');
    }
  };

  const research = dossier?.research || null;
  const has3d = !!(dossier?.matched_internal_3d && research);

  const nextActions = dossier?.next_actions || [];
  const currentGuidance = nextActions[guidanceStep];
  const nextGuidance = nextActions[guidanceStep + 1];

  const errorIsCamera =
    !!error &&
    (uiStatus === UI_STATUS.error || cameraCanRetry || /câmera|camera|permissão/i.test(String(error)));

  return (
    <div className={styles.root}>
      <input
        ref={uploadFileRef}
        type="file"
        accept="image/*"
        className={styles.hiddenFile}
        aria-hidden
        tabIndex={-1}
        onChange={handleUploadFile}
      />

      <div className={styles.primaryAction}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnHero}`}
          onClick={assistanceOn ? stopCamera : startLiveAssistance}
        >
          {assistanceOn ? (
            <>
              <VideoOff size={20} /> Encerrar assistência
            </>
          ) : (
            <>
              <Video size={20} /> Iniciar assistência ao vivo
            </>
          )}
        </button>
        {!assistanceOn && (
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => uploadFileRef.current?.click()}>
            <Camera size={18} /> Enviar foto sem câmera
          </button>
        )}
      </div>

      <LiveSessionStatus
        uiStatus={uiStatus}
        statusLabel={statusLabel(uiStatus)}
        machineName={machineName}
        error={error}
        errorType={errorIsCamera ? 'camera' : 'generic'}
        cameraCanRetry={cameraCanRetry}
        assistanceOn={assistanceOn}
        speechError={speechError}
        onRetry={startLiveAssistance}
        onSwitchCamera={switchCamera}
      />

      {actionNotice && (
        <p className={`${styles.noticeBanner} ${styles[`noticeBanner--${actionNotice.tone}`]}`}>
          {actionNotice.text}
        </p>
      )}

      {assistanceOn && (
        <div className={styles.toolbar}>
          <div className={styles.toolbarRow}>
            <button
              type="button"
              className={`${styles.btn} ${assistanceOn && !paused ? styles.btnActive : ''}`}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? <Play size={18} /> : <Pause size={18} />}
              {paused ? 'Retomar' : 'Pausar'}
            </button>
            <button type="button" className={styles.btn} onClick={toggleFreeze}>
              <Snowflake size={18} />
              {frozen ? 'Descongelar' : 'Congelar'}
            </button>
            <button type="button" className={styles.btn} onClick={switchCamera}>
              <RefreshCw size={18} /> Câmera
            </button>
            {speechSupported && (
              <button
                type="button"
                className={`${styles.btn} ${isListening ? styles.micListening : ''}`}
                onClick={() => (isListening ? stopMic() : startMic())}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                Mic
              </button>
            )}
            <button type="button" className={styles.btn} onClick={() => setShowAdvanced((v) => !v)}>
              {showAdvanced ? 'Menos' : 'Mais'}
            </button>
          </div>
          {showAdvanced && (
            <div className={styles.toolbarAdvanced}>
              <label className={styles.btn} style={{ cursor: 'pointer' }}>
                <Camera size={18} /> Upload
                <input type="file" accept="image/*" className={styles.hiddenFile} onChange={handleUploadFile} />
              </label>
              <span className={styles.toolbarLabel}>Intervalo (s)</span>
              <input
                type="number"
                className={styles.inputInterval}
                min={1.2}
                max={15}
                step={0.5}
                value={intervalSec}
                onChange={(e) => setIntervalSec(parseFloat(e.target.value) || 2.5)}
              />
              <button type="button" className={styles.btn} onClick={() => setMuteAiVoice((m) => !m)}>
                {muteAiVoice ? <VolumeX size={18} /> : <Volume2 size={18} />}
                {muteAiVoice ? 'Voz off' : 'Voz IA'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.cameraCol}>
          <div
            className={`${styles.videoWrap} ${
              assistanceOn || frozenDataUrl ? styles.videoWrapActive : styles.videoWrapCompact
            }`}
          >
            {!assistanceOn && !frozenDataUrl && (
              <div className={styles.videoPlaceholder}>
                <div className={styles.videoPlaceholderIcon}>
                  <Camera size={32} strokeWidth={1.5} />
                </div>
                <strong>Câmera pronta</strong>
                <span>Toque em «Iniciar assistência ao vivo» ou envie uma foto.</span>
              </div>
            )}
            <video
              ref={videoRef}
              className={frozen ? styles.videoHidden : styles.video}
              playsInline
              muted
              autoPlay
            />
            {frozen && frozenDataUrl && (
              <img src={frozenDataUrl} alt="Frame congelado" className={styles.video} />
            )}
            <div className={`${styles.overlayBox} ${detection?.confidence_level ? styles.visible : ''}`} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
          {assistanceOn && !paused && !frozen && (
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => runAnalyze()}>
              {uiStatus === UI_STATUS.analyzing ? <Loader2 className="manuia-spinner-sm" size={18} /> : <Camera size={18} />}
              Capturar e analisar agora
            </button>
          )}
        </div>

        <div className={styles.sideCol}>
          <div className={`${styles.panel} ${styles.panelCopilot}`}>
            <h3>
              <Wrench size={18} /> Copiloto técnico
            </h3>
            <div className={styles.chatScroll}>
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`${styles.msg} ${m.role === 'user' ? styles.msgUser : styles.msgAi}`}
                >
                  {m.content}
                </div>
              ))}
              {chatLoading && (
                <div className={styles.msgAi}>
                  <Loader2 size={14} className="manuia-spinner-sm" /> Pensando…
                </div>
              )}
            </div>
            <div className={styles.chatInputRow}>
              <input
                className={styles.chatInput}
                placeholder="Pergunta técnica (ex.: qual o risco? tem manual?)"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              />
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => sendChat()}>
                Enviar
              </button>
            </div>
          </div>

          <div className={`${styles.panel} ${styles.panelResult}`}>
            <h3>Resultado técnico</h3>
            <dl className={styles.kv}>
              <dt>Nome técnico</dt>
              <dd>{dossier?.detected_part_name || '—'}</dd>
              <dt>Nome popular</dt>
              <dd>{dossier?.detected_part_common_name || '—'}</dd>
              <dt>Categoria</dt>
              <dd>{dossier?.detected_part_category || '—'}</dd>
              <dt>Equipamento provável</dt>
              <dd>{dossier?.probable_machine || '—'}</dd>
              <dt>Marca / modelo</dt>
              <dd>
                {[dossier?.probable_brand, dossier?.probable_model].filter(Boolean).join(' · ') || '—'}
              </dd>
              <dt>Confiança</dt>
              <dd>
                {dossier?.confidence != null ? `${dossier.confidence}%` : '—'} ({dossier?.confidence_level || '—'})
              </dd>
              <dt>Risco operacional</dt>
              <dd>{dossier?.operational_risk || '—'}</dd>
            </dl>
            {dossier?.visual_findings?.length > 0 && (
              <>
                <strong style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Achados visuais</strong>
                <ul className={styles.listMuted}>
                  {dossier.visual_findings.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </>
            )}
            {dossier?.probable_failures?.length > 0 && (
              <>
                <strong style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Falhas possíveis</strong>
                <ul className={styles.listMuted}>
                  {dossier.probable_failures.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </>
            )}
            <p style={{ marginTop: 10, fontSize: '0.82rem' }}>{dossier?.technical_summary || detection?.technical_summary || ''}</p>
          </div>

          <div className={`${styles.panel} ${styles.panelSources}`}>
            <h3>
              <BookOpen size={18} /> Fontes encontradas
            </h3>
            <div className={styles.panelScroll}>
              {dossier?.matched_internal_manual?.length > 0 && (
                <div>
                  <strong>Manuais (pesquisa)</strong>
                  <ul className={styles.listMuted}>
                    {dossier.matched_internal_manual.map((m, i) => (
                      <li key={i}>{m.title || m.name || JSON.stringify(m)}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <strong>3D interno</strong>
                <p className={styles.listMuted}>{has3d ? 'Modelo disponível na biblioteca' : 'Sem modelo exato na biblioteca'}</p>
              </div>
              <div>
                <strong>OS / histórico</strong>
                <ul className={styles.listMuted}>
                  {(dossier?.matched_history?.work_orders || []).slice(0, 5).map((w) => (
                    <li key={w.id}>{w.title || w.id}</li>
                  ))}
                  {(dossier?.matched_history?.work_orders || []).length === 0 && <li>Nenhuma OS filtrada</li>}
                </ul>
              </div>
              <div className={styles.tagList}>
                {(dossier?.matched_external_sources || []).map((s, i) => (
                  <span key={i} className={styles.tag}>
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className={`${styles.panel} ${styles.panelActions}`}>
            <h3>Ações rápidas</h3>
            <div className={styles.actionsGrid}>
              <button type="button" className={styles.btn} disabled={!has3d} onClick={() => setUnityOpen(true)}>
                <Box size={16} /> Abrir 3D
              </button>
              <button
                type="button"
                className={styles.btn}
                onClick={() => research?.manuals?.[0]?.url && window.open(research.manuals[0].url, '_blank')}
                disabled={!research?.manuals?.[0]?.url}
              >
                <BookOpen size={16} /> Abrir manual
              </button>
              <button type="button" className={styles.btn} onClick={() => sendChat('Liste o histórico de ordens de serviço relacionadas a este equipamento.')} title="Consultar histórico de OS via IA">
                <History size={16} /> Histórico OS
              </button>
              <button type="button" className={styles.btn} onClick={() => sendChat('Quais são as falhas comuns desta peça?')}>
                Falhas comuns
              </button>
              <button type="button" className={styles.btn} onClick={() => sendChat('Liste peças equivalentes com base no dossiê.')}>
                Equivalentes
              </button>
              <button
                type="button"
                className={styles.btn}
                onClick={() => {
                  setGuidanceStep(0);
                  sendChat('Inicie o guia passo a passo de manutenção com base no dossiê.');
                }}
              >
                <ChevronRight size={16} /> Guia passo a passo
              </button>
              <button type="button" className={styles.btn} onClick={saveSession}>
                <Save size={16} /> Salvar análise
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={openOs}>
                <ClipboardList size={16} /> Gerar OS
              </button>
            </div>
          </div>

          <div className={`${styles.panel} ${styles.panelGuidance}`}>
            <h3>Orientação</h3>
            <div className={styles.guidanceStep}>
              <strong>Etapa atual</strong>
              <p>{currentGuidance || dossier?.maintenance_guidance || 'Inicie a assistência ou faça uma pergunta ao copiloto.'}</p>
            </div>
            {nextGuidance && (
              <div className={styles.guidanceStep} style={{ borderLeftColor: '#38bdf8' }}>
                <strong>Próxima etapa</strong>
                <p>{nextGuidance}</p>
              </div>
            )}
            <div className={styles.actionsGrid} style={{ marginTop: 8 }}>
              <button
                type="button"
                className={styles.btn}
                disabled={guidanceStep >= nextActions.length - 1}
                onClick={() => setGuidanceStep((s) => Math.min(s + 1, Math.max(0, nextActions.length - 1)))}
              >
                Confirmar etapa
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>
              <AlertTriangle size={12} style={{ verticalAlign: 'middle' }} /> Siga LOTO e EPI. Não prossiga sem desenergizar quando aplicável.
            </p>
          </div>
        </div>
      </div>

      {unityOpen && research && (
        <div className={styles.panel} style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Visualização 3D</h3>
            <button type="button" className={styles.btn} onClick={() => setUnityOpen(false)}>
              Fechar
            </button>
          </div>
          <div className={styles.unityPanel}>
            <ManuIAUnityViewer variant="search" research={research} />
          </div>
        </div>
      )}
    </div>
  );
}
