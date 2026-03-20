/**
 * IMPETUS - ManuIA 3D Vision - Tabs: Upload | Câmera | Gravar | Vibração
 * Upload: FileReader | Camera: getUserMedia | Gravar: MediaRecorder
 * Vibração: useAudioAnalysis + FFT para diagnóstico acústico
 */
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Video, Square, Mic } from 'lucide-react';
import { useAudioAnalysis } from '../hooks/useAudioAnalysis';
import styles from '../styles/Vision3D.module.css';

export default function CapturePanel({ onCapture, onAudioAnalyze, disabled, machineType, machineName }) {
  const [tab, setTab] = useState('upload');
  const [preview, setPreview] = useState(null);
  const {
    recordAndAnalyze,
    reset,
    status: audioStatus,
    spectrum,
    waveform,
    error: audioError,
    RECORD_DURATION_MS
  } = useAudioAnalysis({ machineType: machineType || 'generico', machineName });
  const [stream, setStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const stopStream = () => {
    streamRef.current?.getTracks?.().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  };

  useEffect(() => {
    return () => stopStream();
  }, []);

  const extractFrameFromVideo = (video, atTime = 0.5) => {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.crossOrigin = 'anonymous';
      v.preload = 'metadata';
      v.onloadeddata = () => {
        v.currentTime = Math.min(atTime, v.duration || 0.5);
      };
      v.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(v, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      v.src = URL.createObjectURL(video);
    });
  };

  const sendImage = async (blobOrDataUrl) => {
    let dataUrl = blobOrDataUrl;
    if (blobOrDataUrl instanceof Blob) {
      dataUrl = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.readAsDataURL(blobOrDataUrl);
      });
    }
    const base64 = dataUrl.split(',')[1];
    if (base64) onCapture?.(base64);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = /video\/(mp4|webm|mov|quicktime)/i.test(file.type);
    if (isVideo) {
      const base64 = await extractFrameFromVideo(file);
      setPreview(base64);
      const b64 = base64.split(',')[1];
      if (b64) onCapture?.(b64);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result);
        const b64 = (reader.result || '').split(',')[1];
        if (b64) onCapture?.(b64);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      streamRef.current = s;
      setStream(s);
      setTab('camera');
    } catch (err) {
      console.warn('[Vision3D] Camera:', err);
    }
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video || !stream) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPreview(dataUrl);
    const b64 = dataUrl.split(',')[1];
    if (b64) onCapture?.(b64);
  };

  const startRecording = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      streamRef.current = s;
      setStream(s);
      setTab('record');
      setRecording(false);
    } catch (err) {
      console.warn('[Vision3D] Record:', err);
    }
  };

  const toggleRecord = () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    const video = videoRef.current;
    if (!streamRef.current || !video) return;
    video.srcObject = streamRef.current;
    video.play();
    const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9' });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const base64 = await extractFrameFromVideo(blob);
      setPreview(base64);
      const b64 = base64.split(',')[1];
      if (b64) onCapture?.(b64);
      stopStream();
      setRecording(false);
      setTab('upload');
    };
    recorder.start(100);
    mediaRecorderRef.current = recorder;
    setRecording(true);
  };

  useEffect(() => {
    if (tab === 'camera' && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  }, [tab, stream]);

  const handleVibrationTab = () => {
    setTab('vibration');
    stopStream();
    reset();
  };

  const handleRecordVibration = async () => {
    try {
      const { spectrum: s, peaks } = await recordAndAnalyze();
      if (onAudioAnalyze && s?.length) {
        await onAudioAnalyze(s, peaks);
      }
    } catch (e) {
      console.warn('[Vision3D] Audio:', e?.message);
    }
  };

  return (
    <div className={styles.captureArea} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div className={styles.captureTabs}>
        <button
          type="button"
          className={`${styles.captureTab} ${tab === 'upload' ? styles['captureTab--active'] : ''}`}
          onClick={() => { setTab('upload'); stopStream(); }}
        >
          <Upload size={14} /> Upload
        </button>
        <button
          type="button"
          className={`${styles.captureTab} ${tab === 'camera' ? styles['captureTab--active'] : ''}`}
          onClick={() => { setTab('camera'); startCamera(); }}
        >
          <Camera size={14} /> Câmera
        </button>
        <button
          type="button"
          className={`${styles.captureTab} ${tab === 'record' ? styles['captureTab--active'] : ''}`}
          onClick={() => { setTab('record'); startRecording(); }}
        >
          <Video size={14} /> Gravar
        </button>
        <button
          type="button"
          className={`${styles.captureTab} ${tab === 'vibration' ? styles['captureTab--active'] : ''}`}
          onClick={handleVibrationTab}
        >
          <Mic size={14} /> Vibração
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240, padding: 16 }}>
        {tab === 'upload' && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {preview ? (
              <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 280, objectFit: 'contain' }} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Upload size={48} style={{ marginBottom: 8, opacity: 0.5 }} />
                <p>Arraste uma imagem ou vídeo, ou</p>
                <button
                  type="button"
                  className={styles.captureBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                >
                  Selecionar arquivo
                </button>
              </div>
            )}
          </>
        )}
        {tab === 'camera' && (
          <>
            {stream ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8 }}
                />
                <button type="button" className={styles.captureBtn} onClick={captureFromCamera} disabled={disabled} style={{ marginTop: 12 }}>
                  <Camera size={16} /> Capturar frame
                </button>
              </div>
            ) : (
              <p>Iniciando câmera...</p>
            )}
          </>
        )}
        {tab === 'record' && (
          <>
            {streamRef.current ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8 }}
                />
                <button
                  type="button"
                  className={styles.captureBtn}
                  onClick={toggleRecord}
                  disabled={disabled}
                  style={{ marginTop: 12, background: recording ? 'rgba(239,68,68,0.2)' : undefined }}
                >
                  <Square size={16} /> {recording ? 'Parar e analisar' : 'Iniciar gravação'}
                </button>
              </div>
            ) : (
              <p>Iniciando câmera para gravação...</p>
            )}
          </>
        )}
        {tab === 'vibration' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
              Aproxime o microfone do equipamento e grave {RECORD_DURATION_MS / 1000}s de áudio para análise de vibração.
            </p>
            {waveform.length > 0 && (
              <div
                style={{
                  width: '100%',
                  maxWidth: 280,
                  height: 60,
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  overflow: 'hidden'
                }}
              >
                {waveform.slice(0, 120).map((p, i) => {
                  const v = typeof p === 'object' && p !== null && 'v' in p ? p.v : p;
                  const h = Math.max(8, Math.min(100, 30 + (Number(v) || 0) * 0.5));
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${h}%`,
                        minWidth: 2,
                        background: 'rgba(30, 144, 255, 0.6)',
                        borderRadius: 1
                      }}
                    />
                  );
                })}
              </div>
            )}
            {audioError && <p style={{ color: '#f87171', fontSize: '0.8rem', margin: 0 }}>{audioError}</p>}
            <button
              type="button"
              className={styles.captureBtn}
              onClick={handleRecordVibration}
              disabled={disabled || audioStatus === 'recording' || audioStatus === 'analyzing'}
              style={{
                background: audioStatus === 'recording' ? 'rgba(239,68,68,0.2)' : undefined
              }}
            >
              <Mic size={16} />
              {audioStatus === 'recording' && ' Gravando...'}
              {audioStatus === 'analyzing' && ' Analisando...'}
              {audioStatus === 'idle' && ' Gravar e analisar vibração'}
              {audioStatus === 'done' && ' Gravar novamente'}
              {audioStatus === 'error' && ' Tentar novamente'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
