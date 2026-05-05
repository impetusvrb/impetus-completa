import {
  inferVoiceVisualIntent,
  resolveClaudePanelVisualIntent
} from '../../voice/voiceVisualPanelService';
import { parsePanelVoiceMetaCommand } from './panelVoiceMetaCommands';

/** Evento global: frase final do utilizador no modo voz → painel inteligente (teclado / legado). */
export const SMART_PANEL_VOICE_EVENT = 'impetus-smart-panel-command';

/** Registado por useSmartPanel (voiceMode) para o motor executar imprimir/PDF/enviar chat antes do LLM. */
let voicePanelMetaHandler = null;

export function registerVoicePanelMetaHandler(fn) {
  voicePanelMetaHandler = typeof fn === 'function' ? fn : null;
}

/**
 * @param {string} text
 * @returns {Promise<boolean>} true se foi comando de painel (mesmo sem painel — mostra aviso)
 */
export async function runVoicePanelMetaIfHandled(text) {
  const t = String(text || '').trim();
  if (!t || !voicePanelMetaHandler) return false;
  return voicePanelMetaHandler(t);
}

/**
 * Após a IA de voz responder: utilizador + assistente → Claude monta o painel visual.
 * Não substitui a OpenAI na conversação.
 */
export const CLAUDE_PANEL_BRIDGE_EVENT = 'impetus-claude-panel-bridge';
export const SMART_PANEL_CONTEXT_UPDATED_EVENT = 'impetus-smart-panel-context-updated';

export function dispatchSmartPanelVoiceCommand(text) {
  if (typeof window === 'undefined') return;
  const t = String(text || '').trim();
  if (parsePanelVoiceMetaCommand(t)) {
    window.dispatchEvent(new CustomEvent(SMART_PANEL_VOICE_EVENT, { detail: { text: t } }));
    return;
  }
  if (t.length < 4) return;
  const intent = inferVoiceVisualIntent(t);
  if (intent == null && t.length < 12) return;
  window.dispatchEvent(new CustomEvent(SMART_PANEL_VOICE_EVENT, { detail: { text: t } }));
}

/**
 * @param {{ userTranscript?: string, assistantResponse?: string }} detail
 */
export function dispatchClaudePanelBridge(detail) {
  if (typeof window === 'undefined') return;
  const userTranscript = String(detail?.userTranscript || '').trim();
  const assistantResponse = String(detail?.assistantResponse || '').trim();

  if (inferVoiceVisualIntent(userTranscript) === 'clear') {
    dispatchSmartPanelVoiceCommand(userTranscript);
    return;
  }

  /* Só monta painel quando o utilizador pediu algo visual explícito ou confirmou oferta (ex. relatório/PDF).
   * Conversa casual não dispara API. */
  const visualIntent = resolveClaudePanelVisualIntent(
    userTranscript,
    assistantResponse
  );
  if (!visualIntent) return;

  window.dispatchEvent(
    new CustomEvent(CLAUDE_PANEL_BRIDGE_EVENT, {
      detail: { userTranscript, assistantResponse }
    })
  );
}

export function dispatchSmartPanelContextUpdated(contextText) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(SMART_PANEL_CONTEXT_UPDATED_EVENT, {
      detail: { contextText: String(contextText || '') }
    })
  );
}
