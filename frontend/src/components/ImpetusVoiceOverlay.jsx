/**
 * Overlay premium da IA operacional.
 * Esquerda: avatar e comandos. Direita: painel dinâmico vazio para resultados em tempo real.
 */
import React from 'react';
import { X } from 'lucide-react';
import ImpetusAvatarLive from './ImpetusAvatarLive';
import SmartPanel from '../features/smartPanel/SmartPanel';
import { useImpetusVoice } from '../voice/ImpetusVoiceContext';
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
  mouthState,
  videoLipSyncRef = null,
  didAvatarVideoUrl = null,
  didAvatarReplay = false,
  realtimeMode = false,
  onClose,
  voiceAvatarAnimationEnabled = true,
  voiceAvatarControlRef = null,
  /** Realtime Presence Engine — estado de expressão decidido pelo IMPETUS (Akool só executa) */
  presenceExpression = null,
  presencePerceptionState = null,
  presenceAkoolReady = false
}) {
  const passLipSync = videoLipSyncRef;
  const { toggleVoice, voiceState, wakePhraseIssue } = useImpetusVoice();

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
  const bars = Array.from({ length: 28 }, (_, i) => i);

  const commandHint = liveHint();

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
                <ImpetusAvatarLive
                  state={avatarState}
                  mouthState={mouthState}
                  size={344}
                  immersiveVoice
                  videoLipSyncRef={passLipSync}
                  didVideoUrl={didAvatarVideoUrl}
                  didReplayOverlay={didAvatarReplay}
                  didPrimarySpeaking={false}
                  voiceAvatarAnimationEnabled={voiceAvatarAnimationEnabled}
                  voiceAvatarControlRef={voiceAvatarControlRef}
                />
              </button>
            </div>

            <div className="impetus-voice-overlay__command-card">
              {voiceState.lastAlert && (
                <p className="impetus-voice-overlay__alert" role="alert">
                  {voiceState.lastAlert}
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
              {status === 'listening' && (
                <p className="impetus-voice-overlay__listening-caption">ouvindo</p>
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
                    <span className="impetus-voice-overlay__presence-akool" title="Motor Akool configurado no servidor">
                      Akool
                    </span>
                  )}
                </p>
              )}

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

