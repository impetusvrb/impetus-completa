/**
 * Overlay premium da IA operacional.
 * Esquerda: avatar e comandos. Direita: painel dinâmico vazio para resultados em tempo real.
 */
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import VoiceAvatarExternalSlot from './VoiceAvatarExternalSlot';
import SmartPanel from '../features/smartPanel/SmartPanel';
import { useImpetusVoice } from '../voice/ImpetusVoiceContext';
import {
  ANAM_STATE,
  buildAnamOperationalAuditPayload,
  isAnamModuleDisabled,
  isRealOperationalFailure,
  resolveAnamOperationalState
} from './voiceOverlayStatusUtils';
import './ImpetusVoiceOverlay.css';

function statusLabel(status, realtimeMode) {
  if (realtimeMode && status === 'listening') return 'REALTIME · OUVINDO…';
  if (realtimeMode && status === 'speaking') return 'REALTIME · VOZ…';
  if (realtimeMode && status === 'processing') return 'REALTIME · ANALISANDO…';
  if (status === 'listening') return 'OUVINDO…';
  if (status === 'processing') return 'ANALISANDO…';
  if (status === 'speaking') return 'RESPONDENDO…';
  return 'PRONTA';
}

export default function ImpetusVoiceOverlay({
  open,
  status,
  bargeInFlash,
  realtimeMode = false,
  onClose,
  onRetryConnection,
  /** Ref do slot Anam (vídeo WebRTC) */
  anamSlotRef = null,
  anamEnabled = false,
  anamConfigured = null,
  anamStreaming = false,
  anamAlert = null,
  anamStatus = 'idle',
  /** Realtime Presence Engine — estado de expressão decidido pelo IMPETUS (Akool só executa) */
  presenceExpression = null,
  presencePerceptionState = null,
  presenceAkoolReady = false
}) {
  const { toggleVoice, voiceState, wakePhraseIssue } = useImpetusVoice();
  const [panelLoading, setPanelLoading] = useState(false);

  useEffect(() => {
    const onPanelLoading = (e) => setPanelLoading(!!e.detail?.loading);
    window.addEventListener('impetus-smart-panel-loading', onPanelLoading);
    return () => window.removeEventListener('impetus-smart-panel-loading', onPanelLoading);
  }, []);

  const rawAlert = anamAlert || voiceState.lastAlert;
  const moduleDisabled = isAnamModuleDisabled({
    anamEnabled,
    anamStatus,
    anamConfigured
  });
  const hasRealFailure =
    !moduleDisabled && rawAlert && isRealOperationalFailure(rawAlert);

  const operationalState = resolveAnamOperationalState({
    status,
    anamStatus,
    anamStreaming,
    anamEnabled,
    anamConfigured,
    micActive: voiceState.isContinuous,
    panelLoading,
    hasRealFailure
  });

  useEffect(() => {
    if (!open) return undefined;
    const audit = buildAnamOperationalAuditPayload({
      status,
      anamStatus,
      anamStreaming,
      anamEnabled,
      anamConfigured,
      micActive: voiceState.isContinuous,
      panelLoading,
      hasRealFailure
    });
    window.__IMPETUS_ANAM_STATE_AUDIT__ = audit;
    window.dispatchEvent(new CustomEvent('impetus-anam-state-audit', { detail: audit }));
    if (sessionStorage.getItem('impetus-anam-audit-log') === '1') {
      console.info('[ANAM audit]', audit);
    }
    return undefined;
  }, [
    open,
    status,
    anamStatus,
    anamStreaming,
    anamEnabled,
    anamConfigured,
    voiceState.isContinuous,
    panelLoading,
    hasRealFailure,
    operationalState.state
  ]);

  const liveHint = () => {
    if (!voiceState.isContinuous) {
      if (wakePhraseIssue === 'insecure') {
        return 'Em HTTP o «Ok Impetus» não funciona. Toque na avatar, use Alt+Shift+V ou HTTPS.';
      }
      if (wakePhraseIssue === 'no-speech-api') {
        return 'Comando por voz indisponível neste navegador. Toque na avatar para ativar o microfone.';
      }
      return 'Toque na avatar para ATIVAR o microfone (ou diga «Ok Impetus» fora deste painel)';
    }
    const lab = statusLabel(status, realtimeMode);
    if (anamEnabled) {
      if (anamStreaming) return 'Fale com a persona Anam…';
      if (anamStatus === 'connecting' || anamStatus === 'checking') return 'A ligar Anam…';
    }
    if (lab === 'PRONTA') return 'A ligar escuta…';
    if (lab === 'OUVINDO…' || (realtimeMode && status === 'listening')) return 'OUVINDO COMANDO……';
    return lab;
  };

  if (!open) return null;

  const avatarState =
    status === 'listening'
      ? 'listening'
      : status === 'speaking'
        ? 'speaking'
        : status === 'processing'
          ? 'processing'
          : 'standby';
  const modeClass =
    status === 'speaking'
      ? 'impetus-voice-overlay--speaking'
      : status === 'listening'
        ? 'impetus-voice-overlay--listening'
        : status === 'processing'
          ? 'impetus-voice-overlay--processing'
          : 'impetus-voice-overlay--idle';
  const flashClass = bargeInFlash ? ' impetus-voice-overlay--listening-flash' : '';

  const commandHint = liveHint();
  const bars = Array.from({ length: 28 }, (_, i) => i);
  const showLegacyAlert = hasRealFailure ? rawAlert : null;

  return (
    <div className={`impetus-voice-overlay ${modeClass}${flashClass}`} role="dialog" aria-modal="true">
      <div className="impetus-voice-overlay__panel">
        <div className="impetus-voice-overlay__bg-grid" aria-hidden="true" />
        <div className="impetus-voice-overlay__topbar">
          <div className="impetus-voice-overlay__brand-wrap">
            <div className="impetus-voice-overlay__brand">IMPETUS</div>
            <div className="impetus-voice-overlay__headline">IA OPERACIONAL AO VIVO</div>
          </div>
          <button type="button" className="impetus-voice-overlay__close" onClick={onClose}>
            <X size={16} />
            Encerrar
          </button>
        </div>

        <div className="impetus-voice-overlay__grid">
          <section className="impetus-voice-overlay__left">
            <div className="impetus-voice-overlay__avatar">
              <div className="impetus-voice-overlay__avatar-decor" aria-hidden="true">
                <div className="impetus-voice-overlay__orbit impetus-voice-overlay__orbit--a" />
                <div className="impetus-voice-overlay__orbit impetus-voice-overlay__orbit--b" />
                <div className="impetus-voice-overlay__orbit impetus-voice-overlay__orbit--c" />
                <div className="impetus-voice-overlay__orbit impetus-voice-overlay__orbit--d" />
              </div>
              <div className="impetus-voice-overlay__avatar-ring" aria-hidden="true" />
              <button
                type="button"
                className="impetus-voice-overlay__avatar-trigger"
                onClick={() => void toggleVoice()}
                title={
                  voiceState.isContinuous
                    ? 'Desativar escuta contínua'
                    : 'Ativar escuta — microfone (mesmo efeito que «Ok Impetus»)'
                }
                aria-pressed={voiceState.isContinuous}
              >
                <VoiceAvatarExternalSlot
                  size={344}
                  state={avatarState}
                  slotRef={anamSlotRef}
                  anamStatus={anamStatus}
                  anamStreaming={anamStreaming}
                  anamModuleDisabled={operationalState.state === ANAM_STATE.DISABLED}
                  anamDisabledLabel={operationalState.avatarSubtitle}
                />
              </button>
            </div>

            <div className="impetus-voice-overlay__command-card">
              {/* Desktop / tablet — layout legado preservado */}
              <div className="impetus-voice-overlay__command-legacy">
                {showLegacyAlert && (
                  <p className="impetus-voice-overlay__alert" role="alert">
                    {showLegacyAlert}
                  </p>
                )}
                <div className="impetus-voice-overlay__listening-bar">
                  <span className="impetus-voice-overlay__dot" />
                  <span className="sr-only">{commandHint}</span>
                  <div className="impetus-voice-overlay__wave" aria-hidden="true">
                    {bars.map((i) => (
                      <span
                        key={i}
                        className="impetus-voice-overlay__bar"
                        style={{
                          animationDelay: `${(i % 7) * 0.06}s`,
                          animationDuration: `${0.72 + (i % 5) * 0.11}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
                {(status === 'listening' || anamStatus === 'connecting' || anamStreaming) && (
                  <p className="impetus-voice-overlay__listening-caption">
                    {anamStreaming ? 'anam · ao vivo' : anamStatus === 'connecting' ? 'a ligar anam' : 'ouvindo'}
                  </p>
                )}
                {(presenceExpression || presencePerceptionState) && (
                  <p className="impetus-voice-overlay__presence" aria-live="polite">
                    <span className="impetus-voice-overlay__presence-label">Presença</span>
                    {presencePerceptionState && (
                      <span className="impetus-voice-overlay__presence-chip">{presencePerceptionState}</span>
                    )}
                    {presenceExpression && (
                      <span className="impetus-voice-overlay__presence-chip impetus-voice-overlay__presence-chip--expr">
                        {presenceExpression}
                      </span>
                    )}
                    {presenceAkoolReady && (
                      <span
                        className="impetus-voice-overlay__presence-akool"
                        title="Motor Anam configurado no servidor"
                      >
                        Anam
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Mobile — status compacto (MOBILE-ANAM-003 / MOBILE-ANAM-004) */}
              <div className="impetus-voice-overlay__command-compact" aria-live="polite">
                {operationalState.state === ANAM_STATE.ERROR ? (
                  <div className="impetus-voice-overlay__status-error-wrap">
                    <p className="impetus-voice-overlay__status-error" role="alert">
                      <span aria-hidden="true">⚠️ </span>
                      {operationalState.failureMessage}
                    </p>
                    {onRetryConnection && (
                      <button
                        type="button"
                        className="impetus-voice-overlay__status-retry"
                        onClick={onRetryConnection}
                      >
                        ↻ Reconectar
                      </button>
                    )}
                  </div>
                ) : operationalState.state === ANAM_STATE.DISABLED ? (
                  <span
                    className={`impetus-voice-overlay__status-pill impetus-voice-overlay__status-pill--${operationalState.pill.tone}`}
                  >
                    <span
                      className="impetus-voice-overlay__status-dot impetus-voice-overlay__status-dot--inactive"
                      aria-hidden="true"
                    >
                      ○
                    </span>
                    {operationalState.pill.label}
                  </span>
                ) : (
                  <span
                    className={`impetus-voice-overlay__status-pill impetus-voice-overlay__status-pill--${operationalState.pill.tone}`}
                  >
                    <span className="impetus-voice-overlay__status-dot" aria-hidden="true" />
                    {operationalState.pill.label}
                  </span>
                )}
                <span className="sr-only">{commandHint}</span>
              </div>
            </div>
          </section>

          <section className="impetus-voice-overlay__right">
            <div className="impetus-voice-overlay__dynamic-body impetus-voice-overlay__dynamic-body--visual-only">
              <div className="impetus-voice-overlay__stream-wrap">
                <SmartPanel
                  className="impetus-voice-overlay__smart-panel"
                  voiceOnly
                  voiceStatus={status}
                  voiceRealtime={realtimeMode}
                  micActive={voiceState.isContinuous}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
