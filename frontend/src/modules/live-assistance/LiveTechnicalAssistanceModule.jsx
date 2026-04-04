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
  onDiagnosisComplete,
  onGenerateOS
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const loopRef = useRef(null);
  const sessionIdRef = useRef(null);

  const [assistanceOn, setAssistanceOn] = useState(false);
  const [paused, setPaused] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [frozenDataUrl, setFrozenDataUrl] = useState(null);
  const [intervalSec, setIntervalSec] = useState(2.5);
  const [devices, setDevices] = useState([]);
  const [deviceIndex, setDeviceIndex] = useState(0);
  const [stream, setStream] = useState(null);

  const [uiStatus, setUiStatus] = useState(UI_STATUS.idle);
  const [dossier, setDossier] = useState(null);
  const [detection, setDetection] = useState(null);
  const [error, setError] = useState(null);

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
    supported: speechSupported,
    start: startMic,
    stop: stopMic
  } = useSpeechRecognition({ lang: 'pt-BR', onResult: onSpeechResult });

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

  const stopCamera = useCallback(() => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setAssistanceOn(false);
    setUiStatus(UI_STATUS.idle);
  }, [stream]);

  const enumerateCameras = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const vids = list.filter((d) => d.kind === 'videoinput');
      setDevices(vids);
    } catch {
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    enumerateCameras();
  }, [enumerateCameras]);

  const startCamera = useCallback(async () => {
    setError(null);
    setUiStatus(UI_STATUS.starting);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    const constraints = {
      video: devices.length
        ? { deviceId: { exact: devices[deviceIndex]?.deviceId } }
        : { facingMode: 'environment' },
      audio: false
    };
    try {
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setAssistanceOn(true);
      setUiStatus(UI_STATUS.live);
      if (!sessionIdRef.current) {
        try {
          const cr = await manutencaoIa.createSession({
            machine_id: machineId || null,
            session_type: 'guidance'
          });
          const sid = cr.data?.session?.id;
          if (sid) sessionIdRef.current = sid;
        } catch {
          /* sessão opcional */
        }
      }
    } catch (e) {
      setError(e?.message || 'Não foi possível acessar a câmera');
      setUiStatus(UI_STATUS.error);
    }
  }, [stream, devices, deviceIndex, machineId]);

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

  const runAnalyze = useCallback(async () => {
    if (paused) return;
    let b64 = frozen ? (frozenDataUrl || '').replace(/^data:image\/[a-z]+;base64,/, '') : captureFrameBase64();
    if (!b64 || b64.length < 80) return;

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
      setError(e?.response?.data?.error || e?.message || 'Erro na análise');
      setUiStatus(UI_STATUS.error);
    }
  }, [paused, frozen, frozenDataUrl, captureFrameBase64, machineId, onDiagnosisComplete, speak]);

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
      if (b64) {
        setFrozenDataUrl(`data:image/jpeg;base64,${b64}`);
      }
      setFrozen(true);
    } else {
      setFrozen(false);
      setFrozenDataUrl(null);
    }
  };

  const switchCamera = () => {
    if (devices.length < 2) return;
    const next = (deviceIndex + 1) % devices.length;
    const devId = devices[next]?.deviceId;
    if (!devId) return;
    setDeviceIndex(next);
    setTimeout(() => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      navigator.mediaDevices
        .getUserMedia({
          video: { deviceId: { exact: devId } },
          audio: false
        })
        .then((s) => {
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }
        })
        .catch((err) => setError(err?.message));
    }, 50);
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
    if (!sessionIdRef.current || !dossier) return;
    try {
      await manutencaoIa.liveSaveSession({
        sessionId: sessionIdRef.current,
        dossier,
        summaryText: dossier?.technical_summary || null
      });
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Sessão salva no histórico ManuIA.' }
      ]);
    } catch {
      /* ignore */
    }
  };

  const openOs = () => {
    if (!dossier && !detection) return;
    onGenerateOS?.({
      equipment: dossier?.probable_machine || dossier?.research?.equipment?.name || machineName || 'Peça em campo',
      manufacturer: dossier?.probable_brand || dossier?.research?.equipment?.manufacturer || '',
      severity: dossier?.operational_risk === 'alto' ? 'CRITICO' : 'ALERTA',
      steps: (dossier?.next_actions || []).map((a, i) => ({ title: `Passo ${i + 1}`, desc: a })),
      faultParts: dossier?.probable_failures || [],
      machineId,
      machineName
    });
  };

  const research = dossier?.research || null;
  const has3d = !!(dossier?.matched_internal_3d && research);

  const nextActions = dossier?.next_actions || [];
  const currentGuidance = nextActions[guidanceStep];
  const nextGuidance = nextActions[guidanceStep + 1];

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={assistanceOn ? stopCamera : startLiveAssistance}
        >
          {assistanceOn ? (
            <>
              <VideoOff size={18} /> Encerrar assistência
            </>
          ) : (
            <>
              <Video size={18} /> Iniciar assistência ao vivo
            </>
          )}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${assistanceOn && !paused ? styles.btnActive : ''}`}
          disabled={!assistanceOn}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? <Play size={18} /> : <Pause size={18} />}
          {paused ? 'Retomar análise' : 'Pausar análise'}
        </button>
        <button type="button" className={styles.btn} disabled={!assistanceOn} onClick={toggleFreeze}>
          <Snowflake size={18} />
          {frozen ? 'Descongelar' : 'Congelar frame'}
        </button>
        <button type="button" className={styles.btn} disabled={!assistanceOn || devices.length < 2} onClick={switchCamera}>
          <RefreshCw size={18} /> Trocar câmera
        </button>
        <label className={styles.btn} style={{ cursor: 'pointer' }}>
          <Camera size={18} /> Upload
          <input
            type="file"
            accept="image/*,video/*"
            className={styles.hiddenFile}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = async () => {
                  const dataUrl = reader.result;
                  const b64 = String(dataUrl).split(',')[1] || '';
                  setFrozen(true);
                  setFrozenDataUrl(dataUrl);
                  setUiStatus(UI_STATUS.analyzing);
                  try {
                    const r = await manutencaoIa.liveAnalyzeFrame({
                      imageBase64: b64,
                      machineId: machineId || null,
                      sessionId: sessionIdRef.current || null
                    });
                    if (r.data?.ok) {
                      setDetection(r.data.detection);
                      setDossier(r.data.dossier);
                      setUiStatus(UI_STATUS.ready);
                    }
                  } catch (err) {
                    setError(err?.message);
                    setUiStatus(UI_STATUS.error);
                  }
                };
                reader.readAsDataURL(f);
              }
            }}
          />
        </label>
        <span style={{ fontSize: '0.8rem', color: '#8b9aab' }}>Intervalo (s)</span>
        <input
          type="number"
          className={styles.inputInterval}
          min={1.2}
          max={15}
          step={0.5}
          value={intervalSec}
          onChange={(e) => setIntervalSec(parseFloat(e.target.value) || 2.5)}
        />
        <button
          type="button"
          className={`${styles.btn} ${isListening ? styles.micListening : ''}`}
          disabled={!speechSupported}
          onClick={() => (isListening ? stopMic() : startMic())}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          Microfone
        </button>
        <button type="button" className={styles.btn} onClick={() => setMuteAiVoice((m) => !m)}>
          {muteAiVoice ? <VolumeX size={18} /> : <Volume2 size={18} />}
          {muteAiVoice ? 'Voz IA off' : 'Voz IA on'}
        </button>
      </div>

      <div
        className={`${styles.statusBar} ${
          uiStatus === UI_STATUS.analyzing ? styles.statusAnalyzing : ''
        } ${uiStatus === UI_STATUS.ready || uiStatus === UI_STATUS.part_detected ? styles.statusReady : ''} ${
          uiStatus === UI_STATUS.error ? styles.statusError : ''
        }`}
      >
        <span className={styles.statusDot} />
        <strong>{statusLabel(uiStatus)}</strong>
        {machineName && (
          <span style={{ opacity: 0.85 }}>
            · Ativo: <em>{machineName}</em>
          </span>
        )}
      </div>

      {error && (
        <p style={{ color: '#f87171', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} /> {error}
        </p>
      )}

      <div className={styles.grid}>
        <div className={styles.cameraCol}>
          <div className={styles.videoWrap}>
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
          <div className={styles.panel}>
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

          <div className={styles.panel}>
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

          <div className={styles.panel}>
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

          <div className={styles.panel}>
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
              <button type="button" className={styles.btn} onClick={() => {}} title="Use o painel de fontes">
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

          <div className={styles.panel}>
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
