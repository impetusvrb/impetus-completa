import React, { useState, useCallback } from 'react';
import { FileSpreadsheet, Download, Printer, Share2, History, Loader2, Mic } from 'lucide-react';
import { useSmartPanel } from './useSmartPanel';
import DynamicPanelRenderer from './DynamicPanelRenderer';
import { downloadPanelXlsx, downloadPanelPdf, printPanel } from './panelExport';
import './SmartPanel.css';

function voiceStatusLabel(status, realtimeMode) {
  if (realtimeMode && status === 'listening') return 'A ouvir o seu pedido…';
  if (realtimeMode && status === 'speaking') return 'A IA está a responder…';
  if (realtimeMode && status === 'processing') return 'A processar…';
  if (status === 'listening') return 'A ouvir…';
  if (status === 'speaking') return 'A falar…';
  if (status === 'processing') return 'A analisar…';
  return 'Ative o microfone na avatar à esquerda';
}

/**
 * @param {{
 *   className?: string,
 *   voiceOnly?: boolean,
 *   voiceStatus?: string,
 *   voiceRealtime?: boolean,
 *   micActive?: boolean
 * }} props
 */
export default function SmartPanel({
  className = '',
  voiceOnly = false,
  voiceStatus = 'idle',
  voiceRealtime = false,
  micActive = false
}) {
  const [input, setInput] = useState('');
  const {
    userContext,
    contextLoading,
    history,
    currentOutput,
    loading,
    error,
    sendCommand,
    restoreHistoryItem,
    suggestions
  } = useSmartPanel({ enabled: true, voiceMode: voiceOnly });

  const onSubmit = useCallback(
    (e) => {
      e?.preventDefault?.();
      const t = input.trim();
      if (!t) return;
      void sendCommand(t);
      setInput('');
    },
    [input, sendCommand]
  );

  const isLegacy = currentOutput?.type === 'legacy_voice_visual';
  const canExport =
    currentOutput &&
    !isLegacy &&
    (currentOutput.exportOptions || []).some((x) => ['excel', 'pdf', 'print'].includes(x));

  const doShare = async () => {
    const text = [currentOutput?.title, currentOutput?.reportContent].filter(Boolean).join('\n').slice(0, 4000);
    try {
      if (navigator.share) await navigator.share({ title: 'Impetus Painel', text });
      else await navigator.clipboard.writeText(text || currentOutput?.title || '');
    } catch (_) {}
  };

  const accessLine =
    userContext?.accessibleModuleLabels?.length > 0
      ? userContext.accessibleModuleLabels.slice(0, 8).join(', ')
      : '—';

  return (
    <div className={`smart-panel ${voiceOnly ? 'smart-panel--voice-only' : ''} ${className}`}>
      <div className="smart-panel__context">
        {contextLoading ? (
          <p className="smart-panel__context-line smart-panel__context-line--muted">
            <Loader2 className="smart-panel__spin" size={14} /> A carregar perfil…
          </p>
        ) : (
          <>
            <p className="smart-panel__context-line">
              <span className="smart-panel__context-icon" aria-hidden>
                👤
              </span>
              Olá, <strong>{userContext?.displayName}</strong> · {userContext?.roleLabel}
              {userContext?.department && userContext.department !== '—' ? ` · ${userContext.department}` : ''}
            </p>
            <p className="smart-panel__context-line smart-panel__context-line--small">
              <span className="smart-panel__context-icon" aria-hidden>
                ✅
              </span>
              Módulos: {accessLine}
            </p>
          </>
        )}
      </div>

      {voiceOnly ? (
        <div className="smart-panel__voice-prompt" aria-live="polite">
          <div className="smart-panel__voice-prompt-icon">
            <Mic size={22} />
          </div>
          <div>
            <p className="smart-panel__voice-prompt-title">Comando por voz</p>
            <p className="smart-panel__voice-prompt-text">
              {voiceStatusLabel(voiceStatus, voiceRealtime)}
            </p>
            {!micActive && (
              <p className="smart-panel__voice-prompt-hint">
                Toque na avatar para ligar o microfone. Depois fale o que quer ver: KPIs, gráficos, relatório,
                manutenção, «painel completo» ou «limpar painel».
              </p>
            )}
          </div>
        </div>
      ) : (
        <form className="smart-panel__form" onSubmit={onSubmit}>
          <label className="smart-panel__label" htmlFor="smart-panel-input">
            O que quer analisar?
          </label>
          <div className="smart-panel__input-row">
            <input
              id="smart-panel-input"
              type="text"
              className="smart-panel__input"
              placeholder="Ex.: relatório de KPIs da semana, gráfico de interações, alertas críticos…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
            <button type="submit" className="smart-panel__send" disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="smart-panel__spin" size={18} /> : <span>Enviar</span>}
            </button>
          </div>
        </form>
      )}

      {suggestions.length > 0 && (
        <div className="smart-panel__chips smart-panel__chips--hints">
          <span className="smart-panel__chips-label">
            {voiceOnly ? 'Exemplos (diga em voz alta)' : 'Sugestões rápidas'}
          </span>
          {voiceOnly ? (
            <ul className="smart-panel__hint-list">
              {suggestions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : (
            <div className="smart-panel__chips-row">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="smart-panel__chip"
                  disabled={loading}
                  onClick={() => void sendCommand(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && !isLegacy && <p className="smart-panel__error">{error}</p>}

      {loading && (
        <div className="smart-panel__loading" aria-live="polite">
          <Loader2 className="smart-panel__spin smart-panel__spin--lg" size={28} />
          <span>A gerar o painel com os seus dados…</span>
        </div>
      )}

      {history.length > 0 && (
        <div className="smart-panel__history">
          <span className="smart-panel__history-label">
            <History size={14} /> Últimos pedidos por voz
          </span>
          <div className="smart-panel__history-row">
            {history.map((h) => (
              <button
                key={h.at}
                type="button"
                className="smart-panel__history-btn"
                onClick={() => restoreHistoryItem(h)}
                title={h.input}
              >
                {h.input.slice(0, 42)}
                {h.input.length > 42 ? '…' : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {currentOutput && !loading && (
        <div className="smart-panel__output-wrap">
          <div className="smart-panel__output-head">
            <span className="smart-panel__output-label">Output gerado</span>
            {canExport && (
              <div className="smart-panel__export">
                {(currentOutput.exportOptions || []).includes('excel') && (
                  <button type="button" className="smart-panel__export-btn" onClick={() => downloadPanelXlsx(currentOutput)}>
                    <FileSpreadsheet size={15} /> Excel
                  </button>
                )}
                {(currentOutput.exportOptions || []).includes('pdf') && (
                  <button type="button" className="smart-panel__export-btn" onClick={() => downloadPanelPdf(currentOutput)}>
                    <Download size={15} /> PDF
                  </button>
                )}
                {(currentOutput.exportOptions || []).includes('print') && (
                  <button type="button" className="smart-panel__export-btn" onClick={printPanel}>
                    <Printer size={15} /> Imprimir
                  </button>
                )}
                {(navigator.share || navigator.clipboard?.writeText) && (
                  <button type="button" className="smart-panel__export-btn" onClick={() => void doShare()}>
                    <Share2 size={15} /> Partilhar
                  </button>
                )}
              </div>
            )}
          </div>
          <DynamicPanelRenderer output={currentOutput} className="smart-panel__dynamic" />
        </div>
      )}
    </div>
  );
}
