/**
 * Ponte Anam ↔ SmartPanel (painel direito do overlay de voz).
 */
import { AnamEvent, MessageRole } from '@anam-ai/js-sdk';
import { dashboard } from './api';
import {
  dispatchAnamPanelVoiceCommand,
  dispatchClaudePanelBridge,
  runVoicePanelMetaIfHandled,
  SMART_PANEL_CONTEXT_UPDATED_EVENT
} from '../features/smartPanel/smartPanelEvents';
import {
  inferVoiceVisualIntent,
  resolveClaudePanelVisualIntent
} from '../voice/voiceVisualPanelService';
import { shouldBlockPersonaOpening } from '../utils/anamOpeningGate';

function blockPersonaOpeningIfNeeded(client, g, spoken) {
  if (!client || !spoken) return false;
  const sessionAgeMs = g?.sessionStartedAt ? Date.now() - g.sessionStartedAt : 999_999;
  const shouldBlock = shouldBlockPersonaOpening({
    spoken,
    expectedLine: g?.expectedOpeningLine || '',
    userHasSpoken: Boolean(g?.userHasSpoken),
    sessionAgeMs
  });
  if (!shouldBlock) return false;
  try {
    client.interruptPersona?.();
  } catch (_) {}
  return true;
}

const PANEL_BRIEF = `PAINEL DIREITO (SmartPanel IMPETUS):
- Área visual ao lado do avatar: gráficos, KPIs, tabelas e relatórios operacionais.
- Quando o utilizador pedir painel, gráfico, KPIs, relatório, PDF, Excel ou resumo, o sistema gera conteúdo nesse painel.
- Use o CONTEXTO DO PAINEL abaixo para responder sobre o que está visível.
- Responda em português do Brasil, direto ao assunto, frases curtas.`;

function readPanelContextFromStorage() {
  try {
    return String(sessionStorage.getItem('impetus_voice_last_panel_context') || '').trim();
  } catch (_) {
    return '';
  }
}

function pushPanelContextToClient(client) {
  if (!client?.addContext) return;
  const panelCtx = readPanelContextFromStorage();
  const block = panelCtx
    ? `${PANEL_BRIEF}\n\nCONTEXTO ATUAL DO PAINEL VISUAL:\n${panelCtx}`
    : PANEL_BRIEF;
  try {
    client.addContext(block.slice(0, 6500));
  } catch (_) {}
}

async function injectOperationalVoiceContext(client) {
  if (!client?.addContext) return;
  try {
    const r = await dashboard.getVoiceRealtimeContext();
    const append = String(r.data?.instructions_append || '').trim();
    if (append) client.addContext(append.slice(0, 6500));
  } catch (_) {}
  pushPanelContextToClient(client);
}

function normRole(msg) {
  const r = msg?.role;
  if (r === MessageRole.USER || r === 'user') return 'user';
  if (r === MessageRole.PERSONA || r === 'persona') return 'persona';
  return String(r || '').toLowerCase();
}

function panelCommandText(userText, assistantText = '') {
  const u = String(userText || '').trim();
  const a = String(assistantText || '').trim();
  if (u.length >= 4) return u;
  if (a.length >= 24 && /\b(painel|grafico|gráfico|kpi|mostra|gera|gere|indicador|relatorio|relatório)\b/i.test(a)) {
    return `Mostrar no painel: ${a.slice(0, 600)}`;
  }
  return u;
}

async function handleUserTurn(text, assistantText = '') {
  const t = panelCommandText(text, assistantText);
  if (t.length < 3) return;
  if (await runVoicePanelMetaIfHandled(t)) return;
  dispatchAnamPanelVoiceCommand(t);
}

/**
 * @param {import('@anam-ai/js-sdk').default} client
 * @param {object} g estado __impetusAnamG
 */
export function wireAnamPanelBridge(client, g) {
  if (!client || typeof client.addListener !== 'function') return;
  if (g.panelBridgeWired && g.panelBridgeClient === client) return;

  unwireAnamPanelBridge(g);

  let lastUserFinal = '';
  let lastHandledUserKey = '';
  let lastBridgeKey = '';
  let personaAccum = '';

  const processUserText = (text, key) => {
    const t = String(text || '').trim();
    if (t.length < 3) return;
    const dedupeKey = key || t;
    if (dedupeKey === lastHandledUserKey) return;
    lastHandledUserKey = dedupeKey;
    lastUserFinal = t;
    void handleUserTurn(t);
  };

  const tryClaudeBridge = (userText, assistantText, bridgeKey) => {
    const u = String(userText || '').trim();
    const a = String(assistantText || '').trim();
    if (u.length < 2 || a.length < 6) return;
    const key = bridgeKey || `${u.slice(0, 80)}::${a.length}`;
    if (key === lastBridgeKey) return;
    lastBridgeKey = key;
    dispatchClaudePanelBridge({ userTranscript: u, assistantResponse: a });
    if (inferVoiceVisualIntent(u) && !resolveClaudePanelVisualIntent(u, a)) {
      dispatchAnamPanelVoiceCommand(u);
    }
  };

  const onMessageHistory = (messages) => {
    const arr = Array.isArray(messages) ? messages : [];
    const users = arr.filter((m) => normRole(m) === 'user');
    const personas = arr.filter((m) => normRole(m) === 'persona');
    const lastUser = users[users.length - 1];
    const lastPersona = personas[personas.length - 1];

    if (lastUser?.content) {
      processUserText(lastUser.content, `hist-user:${lastUser.id || lastUser.content}`);
    }

    if (lastPersona?.content) {
      tryClaudeBridge(
        lastUser?.content || lastUserFinal,
        lastPersona.content,
        `hist-bridge:${lastUser?.id || 'u'}:${lastPersona.id}:${lastPersona.content.length}`
      );
    }
  };

  const onMessage = (ev) => {
    const role = String(ev?.role || '').toLowerCase();
    const content = String(ev?.content || '');
    const end = Boolean(ev?.endOfSpeech);
    const interrupted = Boolean(ev?.interrupted);

    if (role === 'user' || role === MessageRole.USER) {
      if (content.trim().length >= 3) {
        g.userHasSpoken = true;
        processUserText(content, `stream-user:${ev?.id || content}`);
      }
      return;
    }

    if (role === 'persona' || role === MessageRole.PERSONA) {
      if (interrupted) {
        personaAccum = '';
        return;
      }
      if (content) {
        personaAccum = end ? content : `${personaAccum}${content}`;
        const partial = personaAccum.trim();
        if (partial.length >= 8 && blockPersonaOpeningIfNeeded(client, g, partial)) {
          personaAccum = '';
          return;
        }
      }
      if (end) {
        const assistant = personaAccum.trim();
        personaAccum = '';
        if (blockPersonaOpeningIfNeeded(client, g, assistant)) {
          return;
        }
        if (assistant.length >= 6) {
          tryClaudeBridge(lastUserFinal, assistant, `stream-bridge:${lastUserFinal.length}:${assistant.length}`);
          void handleUserTurn(lastUserFinal, assistant);
        }
      }
    }
  };

  const onPanelContext = () => {
    pushPanelContextToClient(client);
  };

  const onSessionReady = () => {
    void injectOperationalVoiceContext(client);
  };

  client.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, onMessage);
  client.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, onMessageHistory);
  client.addListener(AnamEvent.SESSION_READY, onSessionReady);

  if (typeof window !== 'undefined') {
    window.addEventListener(SMART_PANEL_CONTEXT_UPDATED_EVENT, onPanelContext);
  }

  g.panelBridgeWired = true;
  g.panelBridgeClient = client;
  g.panelBridgeCleanup = () => {
    try {
      client.removeListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, onMessage);
      client.removeListener(AnamEvent.MESSAGE_HISTORY_UPDATED, onMessageHistory);
      client.removeListener(AnamEvent.SESSION_READY, onSessionReady);
    } catch (_) {}
    if (typeof window !== 'undefined') {
      window.removeEventListener(SMART_PANEL_CONTEXT_UPDATED_EVENT, onPanelContext);
    }
    g.panelBridgeWired = false;
    g.panelBridgeClient = null;
    g.panelBridgeCleanup = null;
  };

  void injectOperationalVoiceContext(client);
}

export function unwireAnamPanelBridge(g) {
  if (g?.panelBridgeCleanup) {
    g.panelBridgeCleanup();
  }
}
