import React, { useState, useCallback } from 'react';
import { FileSpreadsheet, Download, Printer, Share2, Loader2, Mic, AlertCircle, MessageCircle } from 'lucide-react';
import { useSmartPanel } from './useSmartPanel';
import DynamicPanelRenderer from './DynamicPanelRenderer';
import DynamicClaudePanelRenderer from './DynamicClaudePanelRenderer';
import { downloadPanelXlsx, downloadPanelPdf, printPanel, panelOutputToPlainText } from './panelExport';
import { sendPanelTextToImpetusChatTargets } from './panelShareToImpetusChat';
import { useNotification } from '../../context/NotificationContext';
import './SmartPanel.css';

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
  const notify = useNotification();
  const [input, setInput] = useState('');
  const {
    contextLoading,
    currentOutput,
    loading,
    error,
    sendCommand,
    dismissError,
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

  const isClaudeVoicePanel = currentOutput?.schema === 'impetus_claude_v1' && currentOutput?.claudePayload;
  const isLegacy = currentOutput?.type === 'legacy_voice_visual';
  const canExport =
    currentOutput &&
    !isLegacy &&
    (currentOutput.exportOptions || []).some((x) => ['excel', 'pdf', 'print'].includes(x));
  const showVoiceExport =
    Boolean(currentOutput) && !loading && (isClaudeVoicePanel || isLegacy || canExport);

  const doShare = async () => {
    const text = panelOutputToPlainText(currentOutput, 4000);
    try {
      if (navigator.share) await navigator.share({ title: 'Impetus Painel', text });
      else await navigator.clipboard.writeText(text || currentOutput?.title || '');
    } catch (_) {}
  };

  const doSendImpetusChat = useCallback(async () => {
    const raw = window.prompt(
      'Nomes separados por vírgula (ex.: João, Maria, Wellington), ou grupo:Nome do grupo'
    );
    if (!raw?.trim()) return;
    const t = raw.trim();
    try {
      const body = panelOutputToPlainText(currentOutput);
      let targets;
      if (/^grupo\s*:/i.test(t)) {
        targets = { userQueries: [], groupQuery: t.replace(/^grupo\s*:/i, '').trim() };
      } else {
        const qs = t.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
        targets = { userQueries: qs.length ? qs : [t], groupQuery: null };
      }
      const r = await sendPanelTextToImpetusChatTargets(targets, body);
      let msg =
        r.mode === 'group'
          ? `Enviado no grupo «${r.groupName}».`
          : `Enviado no chat para ${r.names.join(', ')}.`;
      if (r.failures?.length) msg += ` Não encontrei: ${r.failures.join(', ')}.`;
      notify.success(msg);
    } catch (e) {
      notify.error(String(e?.response?.data?.error || e?.message || e));
    }
  }, [currentOutput, notify]);

  const micState =
    !micActive ? 'idle' : voiceRealtime && voiceStatus === 'listening' ? 'listening' : voiceStatus === 'speaking' ? 'speaking' : 'processing';

  const micAria = !micActive
    ? 'Microfone inativo. Ative na avatar à esquerda.'
    : voiceRealtime && voiceStatus === 'listening'
      ? 'A ouvir.'
      : voiceStatus === 'speaking'
        ? 'A responder em voz.'
        : 'A processar.';

  if (voiceOnly) {
    return (
      <div className={`smart-panel smart-panel--voice-only smart-panel--visual-canvas ${className}`}>
        <span className="sr-only">{contextLoading ? 'A carregar.' : micAria}</span>

        <div className="smart-panel__visual-toolbar">
          <div
            className="smart-panel__mic-orb"
            data-state={micState}
            data-active={micActive ? 'true' : 'false'}
            aria-hidden
          >
            <Mic size={20} strokeWidth={2.2} />
          </div>
          {loading && (
            <div className="smart-panel__visual-loading" aria-hidden>
              <Loader2 className="smart-panel__spin smart-panel__spin--lg" size={26} />
            </div>
          )}
          {showVoiceExport && (
            <div className="smart-panel__export smart-panel__export--icons">
              {(isClaudeVoicePanel || isLegacy || (currentOutput.exportOptions || []).includes('excel')) && (
                <button
                  type="button"
                  className="smart-panel__icon-btn"
                  title="Excel"
                  aria-label="Exportar Excel"
                  onClick={() => void downloadPanelXlsx(currentOutput)}
                >
                  <FileSpreadsheet size={18} />
                </button>
              )}
              {(isClaudeVoicePanel || isLegacy || (currentOutput.exportOptions || []).includes('pdf')) && (
                <button
                  type="button"
                  className="smart-panel__icon-btn"
                  title="PDF"
                  aria-label="Exportar PDF"
                  onClick={() => downloadPanelPdf(currentOutput)}
                >
                  <Download size={18} />
                </button>
              )}
              {(isClaudeVoicePanel || isLegacy || (currentOutput.exportOptions || []).includes('print')) && (
                <button type="button" className="smart-panel__icon-btn" title="Imprimir" aria-label="Imprimir" onClick={printPanel}>
                  <Printer size={18} />
                </button>
              )}
              <button
                type="button"
                className="smart-panel__icon-btn"
                title="Enviar no chat Impetus"
                aria-label="Enviar no chat Impetus"
                onClick={() => void doSendImpetusChat()}
              >
                <MessageCircle size={18} />
              </button>
              {(navigator.share || navigator.clipboard?.writeText) && (
                <button
                  type="button"
                  className="smart-panel__icon-btn"
                  title="Partilhar"
                  aria-label="Partilhar"
                  onClick={() => void doShare()}
                >
                  <Share2 size={18} />
                </button>
              )}
            </div>
          )}
        </div>

        {error && !isLegacy && (
          <div className="smart-panel__visual-error" role="alert">
            <AlertCircle size={22} aria-hidden className="smart-panel__visual-error-icon" />
            <div className="smart-panel__visual-error-body">
              <p className="smart-panel__visual-error-msg">{error}</p>
              <button
                type="button"
                className="btn btn-ghost smart-panel__visual-error-dismiss"
                onClick={dismissError}
              >
                Dispensar
              </button>
            </div>
          </div>
        )}

        <div className="smart-panel__visual-stage">
          {currentOutput && !loading ? (
            isClaudeVoicePanel ? (
              <DynamicClaudePanelRenderer
                payload={currentOutput.claudePayload}
                className="smart-panel__dynamic"
                visualOnly
              />
            ) : (
              <DynamicPanelRenderer output={currentOutput} className="smart-panel__dynamic" visualOnly />
            )
          ) : !loading ? (
            <div className="smart-panel__visual-placeholder" aria-hidden />
          ) : null}
        </div>
      </div>
    );
  }

  /* Modo com teclado (fora do overlay de voz) */
  return (
    <div className={`smart-panel ${className}`}>
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

      {suggestions.length > 0 && (
        <div className="smart-panel__chips">
          <span className="smart-panel__chips-label">Sugestões rápidas</span>
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
        </div>
      )}

      {error && !isLegacy && <p className="smart-panel__error">{error}</p>}

      {loading && (
        <div className="smart-panel__loading" aria-live="polite">
          <Loader2 className="smart-panel__spin smart-panel__spin--lg" size={28} />
          <span>A gerar o painel…</span>
        </div>
      )}

      {currentOutput && !loading && (
        <div className="smart-panel__output-wrap">
          <div className="smart-panel__output-head">
            <span className="smart-panel__output-label">Output</span>
            {canExport && (
              <div className="smart-panel__export">
                {(currentOutput.exportOptions || []).includes('excel') && (
                  <button type="button" className="smart-panel__export-btn" onClick={() => void downloadPanelXlsx(currentOutput)}>
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
              </div>
            )}
          </div>
          <DynamicPanelRenderer output={currentOutput} className="smart-panel__dynamic" visualOnly={false} />
        </div>
      )}
    </div>
  );
}
