/**
 * Overlay premium da IA operacional.
 * Esquerda: avatar e comandos. Direita: painel dinâmico vazio para resultados em tempo real.
 */
import React from 'react';
import { Activity, BarChart3, FileText, X } from 'lucide-react';
import ImpetusAvatarLive from './ImpetusAvatarLive';
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
  voiceAvatarControlRef = null
}) {
  const passLipSync = videoLipSyncRef;

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
            </div>

            <div className="impetus-voice-overlay__command-card">
              <div className="impetus-voice-overlay__listening-bar">
                <span className="impetus-voice-overlay__dot" />
                <span>{statusLabel(status, realtimeMode) === 'PRONTA' ? 'OUVINDO COMANDO...' : statusLabel(status, realtimeMode)}</span>
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

              <p className="impetus-voice-overlay__user-msg">IMPETUS, COMO ESTÁ A LINHA DE PRODUÇÃO A?</p>
              <p className="impetus-voice-overlay__ai-msg">
                VOCÊ DESEJA QUE EU GERE UM RELATÓRIO OU GRÁFICO PARA VOCÊ ACOMPANHAR?
              </p>

              <div className="impetus-voice-overlay__suggestions">
                <button type="button"><FileText size={15} /> RELATÓRIO</button>
                <button type="button"><BarChart3 size={15} /> GRÁFICO</button>
                <button type="button"><Activity size={15} /> ANÁLISE</button>
              </div>
            </div>
          </section>

          <section className="impetus-voice-overlay__right">
            <div className="impetus-voice-overlay__right-header">
              <h3>PAINEL DINÂMICO EM TEMPO REAL</h3>
              <span>···</span>
            </div>
            <div className="impetus-voice-overlay__dynamic-empty">
              <div className="impetus-voice-overlay__empty-inner">
                <strong>ÁREA DE RESULTADOS</strong>
                <p>
                  Este painel ficará vazio até receber comandos como:
                  &quot;gere um gráfico da linha A&quot;, &quot;crie relatório&quot; ou &quot;mostrar indicadores&quot;.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

