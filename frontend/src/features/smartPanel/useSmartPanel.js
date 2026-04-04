import { useState, useCallback, useEffect, useRef } from 'react';
import { analyzeUserContext } from './analyzeUserContext';
import { processPanelCommand } from './panelCommandProcessor';
import { getQuickSuggestions } from './quickSuggestions';
import { inferVoiceVisualIntent, buildVoicePanelVisual } from '../../voice/voiceVisualPanelService';
import { SMART_PANEL_VOICE_EVENT } from './smartPanelEvents';

const HISTORY_MAX = 5;

export function useSmartPanel({ enabled = true, voiceMode = false } = {}) {
  const [userContext, setUserContext] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentOutput, setCurrentOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contextLoading, setContextLoading] = useState(true);
  const busyRef = useRef(false);
  const pendingRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      setContextLoading(true);
      const ctx = await analyzeUserContext();
      if (!cancelled) {
        setUserContext(ctx);
        setContextLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const clearPanel = useCallback(() => {
    setCurrentOutput(null);
    setError(null);
    pendingRef.current = null;
  }, []);

  const runOneCommand = useCallback(async (raw) => {
    const text = String(raw || '').trim();
    if (!text) return;

    if (inferVoiceVisualIntent(text) === 'clear') {
      clearPanel();
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const out = await processPanelCommand(text);
      setCurrentOutput(out);
      setHistory((h) => {
        const next = [{ input: text, output: out, at: Date.now() }, ...h];
        return next.slice(0, HISTORY_MAX);
      });
    } catch (e) {
      const status = e?.response?.status;
      const isRouteMissing = status === 404 || status === 405 || status === 501;
      if (isRouteMissing) {
        try {
          const vis = await buildVoicePanelVisual(text);
          if (vis?.kind === 'clear') {
            clearPanel();
            return;
          }
          if (vis && vis.kind !== 'empty' && vis.kind !== 'error') {
            const legacyOut = {
              permissionGranted: true,
              type: 'legacy_voice_visual',
              title: vis.title || 'Painel por voz',
              legacyVisual: vis,
              exportOptions: ['excel', 'pdf', 'print']
            };
            setCurrentOutput(legacyOut);
            setHistory((h) => {
              const next = [{ input: text, output: legacyOut, at: Date.now() }, ...h];
              return next.slice(0, HISTORY_MAX);
            });
            setError(null);
            return;
          }
        } catch (_) {}
      }
      const msg =
        e?.response?.data?.error || e?.message || 'Erro ao processar';
      setError(msg);
      setCurrentOutput({
        permissionGranted: false,
        type: 'report',
        title: 'Erro',
        reportContent: msg,
        exportOptions: []
      });
    } finally {
      setLoading(false);
    }
  }, [clearPanel]);

  const sendCommand = useCallback(
    async (raw) => {
      const text = String(raw || '').trim();
      if (!text) return;
      if (busyRef.current) {
        pendingRef.current = text;
        return;
      }
      busyRef.current = true;
      try {
        let toRun = text;
        while (toRun) {
          await runOneCommand(toRun);
          toRun = pendingRef.current;
          pendingRef.current = null;
        }
      } finally {
        busyRef.current = false;
      }
    },
    [runOneCommand]
  );

  useEffect(() => {
    if (!voiceMode) return;
    const onVoice = (ev) => {
      const text = String(ev.detail?.text || '').trim();
      if (!text) return;
      void sendCommand(text);
    };
    window.addEventListener(SMART_PANEL_VOICE_EVENT, onVoice);
    return () => window.removeEventListener(SMART_PANEL_VOICE_EVENT, onVoice);
  }, [voiceMode, sendCommand]);

  const restoreHistoryItem = useCallback((item) => {
    if (item?.output) setCurrentOutput(item.output);
  }, []);

  const suggestions = userContext ? getQuickSuggestions(userContext) : [];

  return {
    userContext,
    contextLoading,
    history,
    currentOutput,
    loading,
    error,
    sendCommand,
    clearPanel,
    restoreHistoryItem,
    suggestions
  };
}
