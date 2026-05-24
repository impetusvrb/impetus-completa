import {
  inferVoiceVisualIntent,
  resolveClaudePanelVisualIntent
} from '../../voice/voiceVisualPanelService';
import {
  buildAnamPanelCommand,
  isAnamPanelCommitPhrase
} from '../../utils/anamPanelGovernance';
import { parsePanelVoiceMetaCommand } from './panelVoiceMetaCommands';

/** Evento global: frase final do utilizador no modo voz → painel inteligente (teclado / legado). */
export const SMART_PANEL_VOICE_EVENT = 'impetus-smart-panel-command';

/** Registado por useSmartPanel (voiceMode) para o motor executar imprimir/PDF/enviar chat antes do LLM. */
let voicePanelMetaHandler = null;
/** Comando direto ao painel (modo Anam — evita perder eventos CustomEvent). */
let anamPanelCommandHandler = null;

export function registerVoicePanelMetaHandler(fn) {
  voicePanelMetaHandler = typeof fn === 'function' ? fn : null;
}

export function registerAnamPanelCommandHandler(fn) {
  anamPanelCommandHandler = typeof fn === 'function' ? fn : null;
}

/**
 * @param {string} text
 * @returns {Promise<boolean>} true se foi comando de painel (mesmo sem painel — mostra aviso)
 */
/**
 * @returns {Promise<{ handled: boolean, success?: boolean, kind?: string, speakLine?: string }>}
 */
export async function runVoicePanelMetaIfHandled(text) {
  const t = String(text || '').trim();
  if (!t) return { handled: false };
  const handler = voicePanelMetaHandler || anamPanelCommandHandler;
  if (!handler) {
    console.warn('[panel-meta] handler não registado — overlay de voz sem SmartPanel?');
    return { handled: false };
  }
  const result = await handler(t);
  if (result === true) return { handled: true, success: true };
  if (result && typeof result === 'object' && result.handled) return result;
  return { handled: false };
}

/** Execução directa com meta já resolvida (Anam confirmou envio/impressão). */
let panelMetaDirectHandler = null;

export function registerPanelMetaDirectHandler(fn) {
  panelMetaDirectHandler = typeof fn === 'function' ? fn : null;
}

export async function runPanelMetaResolved(meta) {
  if (!meta?.kind) return { handled: false };
  if (panelMetaDirectHandler) {
    const direct = await panelMetaDirectHandler(meta);
    if (direct && typeof direct === 'object' && direct.handled) return direct;
    if (direct === true) return { handled: true, success: true };
  }
  const { buildSyntheticMetaCommand } = await import('../../utils/anamMetaGovernance');
  const synthetic = buildSyntheticMetaCommand(meta);
  if (synthetic) return runVoicePanelMetaIfHandled(synthetic);
  return { handled: false };
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

function shouldAnamTriggerPanel(t) {
  if (parsePanelVoiceMetaCommand(t)) return true;
  if (t.length < 4) return false;
  if (inferVoiceVisualIntent(t) != null) return true;
  return (
    t.length >= 6 &&
    /\b(mostra|exibe|gera|gere|cria|crie|painel|grafico|gráfico|kpi|relatorio|relatório|dashboard|exporta|pdf|excel|manutenc|manutenção|producao|produção|indicador|metrica|métrica|numeros|números|resumo|tabela)\b/i.test(
      t
    )
  );
}

function fireAnamPanelCommand(t) {
  if (anamPanelCommandHandler) {
    void anamPanelCommandHandler(t);
    return;
  }
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SMART_PANEL_VOICE_EVENT, { detail: { text: t, source: 'anam' } }));
}

/** Modo Anam: envia ao SmartPanel quando há pedido visual (filtro mais largo que o Realtime). */
export function dispatchAnamPanelVoiceCommand(text) {
  const t = String(text || '').trim();
  if (!shouldAnamTriggerPanel(t)) return;
  fireAnamPanelCommand(t);
}

/**
 * Modo Anam governado: só dispara Claude/painel após a persona confirmar execução.
 * @param {{ userTranscript?: string, assistantResponse?: string, recentTurns?: { role: string, text: string }[] }} detail
 */
export function dispatchAnamPanelCommit(detail) {
  const userTranscript = String(detail?.userTranscript || '').trim();
  const assistantResponse = String(detail?.assistantResponse || '').trim();
  if (!isAnamPanelCommitPhrase(assistantResponse, userTranscript)) return;

  const panelCommand = buildAnamPanelCommand(
    userTranscript,
    assistantResponse,
    detail?.recentTurns
  );

  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(CLAUDE_PANEL_BRIDGE_EVENT, {
      detail: {
        userTranscript: panelCommand,
        assistantResponse,
        source: 'anam-commit'
      }
    })
  );
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
