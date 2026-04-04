import { inferVoiceVisualIntent } from '../../voice/voiceVisualPanelService';

/** Evento global: frase final do utilizador no modo voz → painel inteligente. */
export const SMART_PANEL_VOICE_EVENT = 'impetus-smart-panel-command';

export function dispatchSmartPanelVoiceCommand(text) {
  if (typeof window === 'undefined') return;
  const t = String(text || '').trim();
  if (t.length < 4) return;
  const intent = inferVoiceVisualIntent(t);
  /* Evita pedidos à API em respostas curtas tipo «ok», «combinado» sem pedido de painel. */
  if (intent == null && t.length < 12) return;
  window.dispatchEvent(new CustomEvent(SMART_PANEL_VOICE_EVENT, { detail: { text: t } }));
}
