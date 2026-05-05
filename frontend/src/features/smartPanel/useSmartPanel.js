import { useState, useCallback, useEffect, useRef } from 'react';
import { analyzeUserContext } from './analyzeUserContext';
import { processPanelCommand } from './panelCommandProcessor';
import { getQuickSuggestions } from './quickSuggestions';
import { inferVoiceVisualIntent, buildVoicePanelVisual } from '../../voice/voiceVisualPanelService';
import {
  SMART_PANEL_VOICE_EVENT,
  CLAUDE_PANEL_BRIDGE_EVENT,
  dispatchSmartPanelContextUpdated,
  registerVoicePanelMetaHandler
} from './smartPanelEvents';
import { dashboard } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { parsePanelVoiceMetaCommand } from './panelVoiceMetaCommands';
import { sendPanelTextToImpetusChatTargets } from './panelShareToImpetusChat';
import { downloadPanelXlsx, downloadPanelPdf, printPanel, panelOutputToPlainText } from './panelExport';

const HISTORY_MAX = 5;
const VOICE_PANEL_CONTEXT_KEY = 'impetus_voice_last_panel_context';

function buildPanelVoiceContextSummary(output) {
  if (!output || output.permissionGranted === false) return '';

  const title =
    output.schema === 'impetus_claude_v1'
      ? output.claudePayload?.title || 'Painel visual'
      : output.title || 'Painel visual';
  const type =
    output.schema === 'impetus_claude_v1'
      ? output.claudePayload?.type || 'visual'
      : output.type || 'visual';

  const lines = [`Painel atual: ${String(title).slice(0, 120)} (${String(type).slice(0, 32)}).`];

  const reportText = output.reportContent ? String(output.reportContent).slice(0, 600) : '';
  if (reportText) lines.push(`Resumo: ${reportText}`);

  const table = output.table;
  if (table?.columns?.length || table?.rows?.length) {
    lines.push(`Tabela: colunas=${(table.columns || []).join(', ').slice(0, 200)}; linhas=${table.rows?.length || 0}.`);
  }
  if (Array.isArray(output?.kpiCards) && output.kpiCards.length) {
    const sample = output.kpiCards
      .slice(0, 5)
      .map((k) => `${k.title || k.label}: ${k.value}`)
      .join(' | ');
    lines.push(`KPIs: ${sample.slice(0, 300)}`);
  }
  if (Array.isArray(output?.chartData) && output.chartData.length) {
    const sample = output.chartData
      .slice(0, 6)
      .map((p) => `${p.name}: ${p.valor}`)
      .join(' | ');
    lines.push(`Gráfico: ${sample.slice(0, 300)}`);
  }

  if (output.schema === 'impetus_claude_v1' && output.claudePayload?.output) {
    const p = output.claudePayload;
    if (p.type === 'chart') {
      const labels = (p.output.labels || []).slice(0, 8).join(', ');
      lines.push(`Gráfico renderizado: tipo=${p.output.chartType || 'bar'}, eixos=${String(labels).slice(0, 260)}.`);
    } else if (p.type === 'table') {
      lines.push(`Tabela renderizada: colunas=${(p.output.columns || []).join(', ').slice(0, 200)}, linhas=${(p.output.rows || []).length}.`);
    } else if (p.type === 'kpi') {
      const cards = (p.output.cards || [])
        .slice(0, 6)
        .map((c) => `${c.label}: ${c.value}`)
        .join(' | ');
      lines.push(`Cards renderizados: ${cards.slice(0, 320)}`);
    }
    if (p.description) lines.push(`Descrição do painel: ${String(p.description).slice(0, 360)}`);
  }

  return lines.join('\n').slice(0, 1800);
}

/**
 * Texto para o painel legado quando a transcrição do utilizador vem vazia no Realtime
 * mas a resposta do assistente existe (caso frequente com eco / ordem de eventos).
 */
function voiceBridgeLegacyPrompt(userTranscript, assistantResponse) {
  const u = String(userTranscript || '').trim();
  const a = String(assistantResponse || '').trim();
  if (u.length >= 4) return u;
  if (a.length >= 28) {
    return `Mostrar painel operacional alinhado a esta resposta: ${a.slice(0, 3800)}`;
  }
  if (a.length >= 4) return a;
  return '';
}

/** Claude pós-voz falhou → tenta painel legado (/panel-command). */
function shouldFallbackVoiceClaudeToLegacy(userTranscript, assistantResponse, errMsg, httpStatus) {
  const leg = voiceBridgeLegacyPrompt(userTranscript, assistantResponse);
  if (leg.length < 4) return false;
  const m = String(errMsg || '');
  if (/^Comando vazio|^Texto demasiado longo|demasiado longo\.$/i.test(m)) return false;
  const st = Number(httpStatus);
  if (st === 400 || st === 401 || st === 403) return false;
  if (/transcri[çc][aã]o vazia/i.test(m)) return true;
  if (st >= 500) return true;
  return /ANTHROPIC|não configurado|nao configurado|not configured|Resposta vazia|vazia do Claude|Nexus|cr[eé]ditos|carteira|FALLBACK|TIMEOUT|timeout|instável|várias falhas|1 minuto|Claude indisponível|Erro no painel|painel Claude/i.test(
    m
  );
}

function hasNonZeroSeries(items) {
  const arr = Array.isArray(items) ? items : [];
  return arr.some((it) => Number(it?.valor ?? it?.value ?? 0) > 0);
}

function hasUsefulRows(rows) {
  const rr = Array.isArray(rows) ? rows : [];
  return rr.some((row) =>
    Array.isArray(row) &&
    row.some((cell) => {
      const v = String(cell ?? '').trim().toLowerCase();
      return v && v !== '0' && v !== '—' && v !== 'sem dados';
    })
  );
}

function hasRenderableSignal(output) {
  if (!output || output.permissionGranted === false) return false;

  if (output.schema === 'impetus_claude_v1') {
    const p = output.claudePayload;
    if (!p || p.shouldRender === false) return false;
    if (p.type === 'chart') {
      const ds = Array.isArray(p.output?.datasets) ? p.output.datasets : [];
      return ds.some((d) => Array.isArray(d?.data) && d.data.some((n) => Number(n) > 0));
    }
    if (p.type === 'table') return hasUsefulRows(p.output?.rows);
    if (p.type === 'kpi') {
      const cards = Array.isArray(p.output?.cards) ? p.output.cards : [];
      return cards.some((c) => Number(String(c?.value ?? '').replace(',', '.').replace(/[^\d.-]/g, '')) > 0);
    }
    if (p.type === 'report') return String(p.description || '').trim().length > 20;
    if (p.type === 'alert') return Array.isArray(p.output?.items) && p.output.items.length > 0;
    return false;
  }

  if (output.type === 'legacy_voice_visual') {
    const v = output.legacyVisual || {};
    if (v.kind === 'empty' || v.kind === 'error' || v.kind === 'clear') return false;
    if (hasNonZeroSeries(v.barData) || hasNonZeroSeries(v.trendData)) return true;
    if (Array.isArray(v.extraTables) && v.extraTables.some((t) => hasUsefulRows(t?.rows))) return true;
    return false;
  }

  if (hasNonZeroSeries(output.chartData) || hasNonZeroSeries(output.barData) || hasNonZeroSeries(output.trendData)) {
    return true;
  }
  if (hasUsefulRows(output.table?.rows)) return true;
  if (Array.isArray(output.extraTables) && output.extraTables.some((t) => hasUsefulRows(t?.rows))) return true;
  if (Array.isArray(output.kpiCards) && output.kpiCards.some((k) => Number(String(k?.value ?? '').replace(',', '.').replace(/[^\d.-]/g, '')) > 0)) {
    return true;
  }
  return false;
}

export function useSmartPanel({ enabled = true, voiceMode = false } = {}) {
  const notify = useNotification();
  const [userContext, setUserContext] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentOutput, setCurrentOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contextLoading, setContextLoading] = useState(true);
  const busyRef = useRef(false);
  const pendingRef = useRef(null);
  const currentOutputRef = useRef(null);

  useEffect(() => {
    currentOutputRef.current = currentOutput;
  }, [currentOutput]);

  useEffect(() => {
    const summary = buildPanelVoiceContextSummary(currentOutput);
    try {
      if (summary) {
        sessionStorage.setItem(VOICE_PANEL_CONTEXT_KEY, summary);
      } else {
        sessionStorage.removeItem(VOICE_PANEL_CONTEXT_KEY);
      }
    } catch (_) {}
    dispatchSmartPanelContextUpdated(summary);
  }, [currentOutput]);

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

  const dismissError = useCallback(() => setError(null), []);

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
      if (!hasRenderableSignal(out)) {
        setCurrentOutput(null);
        setError(null);
        return;
      }
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
            if (!hasRenderableSignal(legacyOut)) {
              setCurrentOutput(null);
              setError(null);
              return;
            }
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
      const st = e?.response?.status;
      const msg =
        st === 401 || st === 403
          ? 'Sessão expirada ou sem permissão. Saia da conta e volte a entrar.'
          : e?.response?.data?.error || e?.message || 'Erro ao processar';
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

  const tryVoiceMetaCommand = useCallback(
    async (text) => {
      const meta = parsePanelVoiceMetaCommand(text);
      if (!meta) return false;
      setError(null);
      const out = currentOutputRef.current;
      const hasPanel =
        out &&
        ((out.schema === 'impetus_claude_v1' && out.claudePayload) ||
          (out.type === 'legacy_voice_visual' && out.legacyVisual) ||
          (out.permissionGranted !== false &&
            (out.title ||
              (out.chartData || []).length ||
              (out.barData || []).length ||
              out.table?.rows?.length ||
              out.reportContent)));
      if (!hasPanel) {
        notify.warning('Não há painel para exportar ou enviar. Peça um painel primeiro.');
        return true;
      }
      try {
        if (meta.kind === 'print') {
          printPanel();
          notify.success('A preparar impressão…');
        } else if (meta.kind === 'pdf') {
          downloadPanelPdf(out);
          notify.success('PDF a descarregar.');
        } else if (meta.kind === 'excel') {
          await downloadPanelXlsx(out);
          notify.success('Excel a descarregar.');
        } else if (meta.kind === 'chat') {
          const body = panelOutputToPlainText(out);
          const r = await sendPanelTextToImpetusChatTargets(
            {
              userQueries: meta.userQueries || [],
              groupQuery: meta.groupQuery != null ? meta.groupQuery : null
            },
            body
          );
          let msg =
            r.mode === 'group'
              ? `Enviado no grupo «${r.groupName}».`
              : `Enviado no chat para ${r.names.join(', ')}.`;
          if (r.failures?.length) msg += ` Não encontrei: ${r.failures.join(', ')}.`;
          notify.success(msg);
        } else if (meta.kind === 'share') {
          const text = panelOutputToPlainText(out, 4000);
          try {
            if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
              await navigator.share({ title: 'Impetus Painel', text });
              notify.success('Partilha iniciada.');
            } else if (navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(text || out?.title || '');
              notify.success('Conteúdo copiado para a área de transferência.');
            } else {
              notify.warning('Partilha não disponível neste navegador.');
            }
          } catch (e) {
            if (e?.name !== 'AbortError') {
              try {
                if (navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(text || out?.title || '');
                  notify.success('Copiado para a área de transferência.');
                } else {
                  notify.error('Não foi possível partilhar.');
                }
              } catch (_) {
                notify.error('Não foi possível partilhar.');
              }
            }
          }
        }
      } catch (e) {
        notify.error(String(e?.response?.data?.error || e?.message || e || 'Erro.'));
      }
      return true;
    },
    [notify, setError]
  );

  useEffect(() => {
    if (!voiceMode) {
      registerVoicePanelMetaHandler(null);
      return;
    }
    registerVoicePanelMetaHandler(tryVoiceMetaCommand);
    return () => registerVoicePanelMetaHandler(null);
  }, [voiceMode, tryVoiceMetaCommand]);

  useEffect(() => {
    if (!voiceMode) return;
    const onVoice = (ev) => {
      const text = String(ev.detail?.text || '').trim();
      if (!text) return;
      void (async () => {
        if (await tryVoiceMetaCommand(text)) return;
        void sendCommand(text);
      })();
    };
    const onClaudeBridge = (ev) => {
      const userTranscript = String(ev.detail?.userTranscript || '').trim();
      const assistantResponse = String(ev.detail?.assistantResponse || '').trim();
      if (userTranscript.length < 1 && assistantResponse.length < 8) return;
      void (async () => {
        setError(null);
        setLoading(true);
        try {
          const r = await dashboard.runClaudePanel({ userTranscript, assistantResponse });
          const data = r?.data ?? r;
          if (!data?.ok) {
            const errMsg = String(data?.error || '');
            const leg = voiceBridgeLegacyPrompt(userTranscript, assistantResponse);
            const noDataSemantic =
              /nao encontrei|não encontrei|sem dados|nao localizado|não localizado|informacao indisponivel|informação indisponível/i.test(
                `${errMsg} ${assistantResponse}`
              );
            if (noDataSemantic) {
              setCurrentOutput(null);
              setError(null);
              return;
            }
            if (shouldFallbackVoiceClaudeToLegacy(userTranscript, assistantResponse, errMsg, r?.status)) {
              void sendCommand(leg);
              return;
            }
            setError(errMsg || 'Painel visual indisponível.');
            return;
          }
          if (!data.shouldRender) {
            setCurrentOutput(null);
            setError(null);
            return;
          }
          const claudeOut = {
            schema: 'impetus_claude_v1',
            permissionGranted: true,
            claudePayload: data.panel,
            exportOptions: ['excel', 'pdf', 'print']
          };
          if (!hasRenderableSignal(claudeOut)) {
            setCurrentOutput(null);
            setError(null);
            return;
          }
          setCurrentOutput(claudeOut);
        } catch (e) {
          const st = e?.response?.status;
          const errMsg = String(e?.response?.data?.error || e?.message || '');
          const code = String(e?.code || '');
          const leg = voiceBridgeLegacyPrompt(userTranscript, assistantResponse);
          if (st === 401 || st === 403) {
            setError('Sessão expirada ou sem permissão. Saia da conta e volte a entrar.');
            return;
          }
          if (
            shouldFallbackVoiceClaudeToLegacy(userTranscript, assistantResponse, errMsg, st) ||
            (leg.length >= 4 &&
              !st &&
              /ECONNABORTED|ERR_NETWORK|ETIMEDOUT|timeout/i.test(code + errMsg))
          ) {
            void sendCommand(leg);
            return;
          }
          setError(
            errMsg ||
              (code === 'ERR_NETWORK'
                ? 'Rede: não foi possível contactar a API. No servidor, use `npm run preview:prod` ou Vite com proxy /api → backend :4000.'
                : 'Erro ao gerar o painel.')
          );
        } finally {
          setLoading(false);
        }
      })();
    };
    window.addEventListener(SMART_PANEL_VOICE_EVENT, onVoice);
    window.addEventListener(CLAUDE_PANEL_BRIDGE_EVENT, onClaudeBridge);
    return () => {
      window.removeEventListener(SMART_PANEL_VOICE_EVENT, onVoice);
      window.removeEventListener(CLAUDE_PANEL_BRIDGE_EVENT, onClaudeBridge);
    };
  }, [voiceMode, sendCommand, tryVoiceMetaCommand]);

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
    dismissError,
    restoreHistoryItem,
    suggestions
  };
}
