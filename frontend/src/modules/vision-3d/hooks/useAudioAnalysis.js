/**
 * IMPETUS - ManuIA 3D Vision - Análise de vibração por áudio
 * Captura áudio via microfone, extrai FFT e identifica padrões de falha
 * Compatível: iOS Safari (getUserMedia) + Android Chrome
 */
import { useState, useCallback, useRef } from 'react';

const RECORD_DURATION_MS = 4000;
const FFT_SIZE = 2048;
const SAMPLE_INTERVAL_MS = 80;
const PEAK_THRESHOLD_STD = 2;

/**
 * Converte bins FFT para array { hz, amplitude }
 * @param {Float32Array} frequencyData - dados do AnalyserNode
 * @param {number} sampleRate
 * @returns {{ hz: number, amplitude: number }[]}
 */
function fftBinsToSpectrum(frequencyData, sampleRate) {
  const binCount = frequencyData.length;
  const spectrum = [];
  for (let i = 0; i < binCount; i++) {
    const hz = (i * sampleRate) / FFT_SIZE;
    const amplitude = frequencyData[i];
    spectrum.push({ hz: Math.round(hz * 10) / 10, amplitude });
  }
  return spectrum;
}

/**
 * Identifica picos acima da média + N desvios padrão
 * @param {{ hz: number, amplitude: number }[]} spectrum
 * @returns {{ hz: number, amplitude: number }[]}
 */
function findPeaks(spectrum) {
  if (!spectrum?.length) return [];
  const values = spectrum.map((s) => s.amplitude);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance) || 0.001;
  const threshold = mean + PEAK_THRESHOLD_STD * std;
  return spectrum.filter((s) => s.amplitude > threshold);
}

/**
 * Hook de análise de vibração por áudio
 * @param {Object} opts
 * @param {string} [opts.machineType] - tipo de máquina para o prompt
 * @param {string} [opts.machineName] - nome da máquina
 */
export function useAudioAnalysis({ machineType = 'generico', machineName } = {}) {
  const [status, setStatus] = useState('idle'); // idle | recording | analyzing | done | error
  const [spectrum, setSpectrum] = useState([]);
  const [peaks, setPeaks] = useState([]);
  const [waveform, setWaveform] = useState([]);
  const [error, setError] = useState(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const waveformAccumRef = useRef([]);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    streamRef.current?.getTracks?.().forEach((t) => t.stop());
    streamRef.current = null;
    audioContextRef.current?.close?.().catch(() => {});
    audioContextRef.current = null;
  }, []);

  /**
   * Grava áudio por RECORD_DURATION_MS e extrai espectro FFT
   * @returns {Promise<{ spectrum: { hz: number, amplitude: number }[], peaks: { hz: number, amplitude: number }[] }>}
   */
  const recordAndAnalyze = useCallback(async () => {
    setError(null);
    setStatus('recording');
    setWaveform([]);
    waveformAccumRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      analyserRef.current = analyser;
      const sampleRate = audioContext.sampleRate;

      const frequencyData = new Float32Array(analyser.frequencyBinCount);
      const accumulated = new Float32Array(analyser.frequencyBinCount);
      let sampleCount = 0;

      intervalRef.current = setInterval(() => {
        analyser.getFloatFrequencyData(frequencyData);
        for (let i = 0; i < frequencyData.length; i++) {
          const v = frequencyData[i];
          if (!isNaN(v) && isFinite(v)) {
            accumulated[i] = (accumulated[i] || 0) + v;
          }
        }
        sampleCount++;
        waveformAccumRef.current.push(Array.from(frequencyData).slice(0, 64));
      }, SAMPLE_INTERVAL_MS);

      await new Promise((r) => setTimeout(r, RECORD_DURATION_MS));

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      for (let i = 0; i < accumulated.length; i++) {
        accumulated[i] = sampleCount > 0 ? accumulated[i] / sampleCount : 0;
      }

      const spectrumData = fftBinsToSpectrum(accumulated, sampleRate);
      const peakData = findPeaks(spectrumData);

      const wf = waveformAccumRef.current.flatMap((chunk) =>
        chunk.map((v, i) => ({ i, v: isFinite(v) ? v : 0 }))
      );
      setWaveform(wf.slice(0, 200));
      setSpectrum(spectrumData);
      setPeaks(peakData);
      setStatus('done');
      cleanup();

      return { spectrum: spectrumData, peaks: peakData };
    } catch (err) {
      setError(err?.message || 'Erro ao capturar áudio');
      setStatus('error');
      cleanup();
      throw err;
    }
  }, [cleanup]);

  const reset = useCallback(() => {
    setStatus('idle');
    setSpectrum([]);
    setPeaks([]);
    setWaveform([]);
    setError(null);
  }, []);

  return {
    recordAndAnalyze,
    reset,
    status,
    spectrum,
    peaks,
    waveform,
    error,
    RECORD_DURATION_MS
  };
}
