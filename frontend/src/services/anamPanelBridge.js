/**
 * Ponte Anam ↔ SmartPanel (painel direito do overlay de voz).
 * Governança: o painel só executa quando a Anam confirma (ex.: «gerando o gráfico…»).
 */
import { AnamEvent, MessageRole } from '@anam-ai/js-sdk';
import { dashboard } from './api';
import {
  dispatchAnamPanelCommit,
  dispatchAnamPanelVoiceCommand,
  runVoicePanelMetaIfHandled,
  SMART_PANEL_CONTEXT_UPDATED_EVENT
} from '../features/smartPanel/smartPanelEvents';
import { inferVoiceVisualIntent } from '../voice/voiceVisualPanelService';
import { shouldBlockPersonaOpening } from '../utils/anamOpeningGate';
import { parsePanelVoiceMetaCommand } from '../features/smartPanel/panelVoiceMetaCommands';
import {
  isAnamMetaCommitPhrase,
  resolvePanelMetaFromConversation
} from '../utils/anamMetaGovernance';
import { runPanelMetaResolved } from '../features/smartPanel/smartPanelEvents';

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
- O painel mostra dados de TODO o IMPETUS que o utilizador pode aceder (telemetria, manutenção, produção, qualidade, etc.). Atualize só após acordo: «Certo, gerando a telemetria no painel».
- AÇÕES AUTOMÁTICAS (confirme com UMA frase de execução — o sistema dispara igual ao painel visual):
  • Chat: após acordo, diga ex.: «Certo, vou enviar para o João no chat interno» — o IMPETUS envia; não peça ao utilizador ir ao menu.
  • Imprimir: «Vou abrir a impressão do painel».
  • PDF/Excel: «Vou gerar o PDF» / «Vou baixar a planilha».
  • Linguagem natural; NÃO exija palavras-chave. Confirme só depois que o sistema concluir.
- Use o CONTEXTO DO PAINEL abaixo para falar do que está visível.
- Responda em português do Brasil, direto ao assunto.`;

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

async function injectOperationalVoiceContext(client, hint = '') {
  if (!client?.addContext) return;
  try {
    const params = hint ? { hint: String(hint).slice(0, 200) } : {};
    const r = await dashboard.getVoiceRealtimeContext(params);
    const append = String(r.data?.instructions_append || r?.instructions_append || '').trim();
    if (append) {
      client.addContext(
        `[ATUALIZAÇÃO DADOS IMPETUS ${new Date().toISOString()}]\n${append}`.slice(0, 6500)
      );
    }
  } catch (e) {
    console.warn('[anam] voice context refresh', e?.message || e);
  }
  pushPanelContextToClient(client);
}

function normRole(msg) {
  const r = msg?.role;
  if (r === MessageRole.USER || r === 'user') return 'user';
  if (r === MessageRole.PERSONA || r === 'persona') return 'persona';
  return String(r || '').toLowerCase();
}

async function speakMetaResult(client, g, result) {
  const line = String(result?.speakLine || '').trim();
  if (!line || !client?.talk || g?.client !== client) return;
  try {
    client.interruptPersona?.();
  } catch (_) {}
  try {
    await client.talk(line.slice(0, 280));
    g.lastMetaTalkAt = Date.now();
    if (result?.success) g.lastPanelMetaSuccessAt = Date.now();
  } catch (e) {
    console.warn('[anam] meta talk', e?.message || e);
  }
}

function personaClaimsPanelMetaDone(assistantText, userText) {
  const a = String(assistantText || '').trim();
  if (a.length < 8) return false;
  const meta = parsePanelVoiceMetaCommand(userText);
  if (!meta || meta.kind === 'share') return false;

  if (meta.kind === 'chat') {
    if (!/\b(enviei|mandei|j[aá]\s+enviei|acabei de enviar|foi enviado|est[aá] enviado)\b/i.test(a)) {
      return false;
    }
    if (/\b(chat|mensagem|impetus)\b/i.test(a)) return true;
    return true;
  }
  if (meta.kind === 'print') {
    return /\b(imprimi|imprimindo|j[aá]\s+imprimi|foi\s+imprim|est[aá]\s+imprim|mandei\s+imprimir|abri\s+a\s+impress|disparei\s+a\s+impress|vou\s+imprim|abrindo\s+a\s+impress|deixa\s+eu\s+imprim)\b/i.test(
      a
    );
  }
  if (meta.kind === 'pdf') {
    return /\b(baixei|descarreguei|pdf\s+pronto|j[aá]\s+baixei|foi\s+baixad|est[aá]\s+baixad|gerou\s+o\s+pdf)\b/i.test(a);
  }
  if (meta.kind === 'excel') {
    return /\b(baixei|descarreguei|planilha\s+pronta|excel\s+pronto|j[aá]\s+baixei|foi\s+baixad)\b/i.test(a);
  }
  return false;
}

async function runResolvedMeta(meta, execKey, client, g) {
  if (!meta?.kind) return null;
  const result = await runPanelMetaResolved(meta);
  if (!result?.handled) return null;
  g.lastMetaExecKey = execKey;
  if (result.success) {
    await speakMetaResult(client, g, result);
    return true;
  }
  if (result.speakLine) {
    await speakMetaResult(client, g, result);
    return false;
  }
  return false;
}

/**
 * Executa PDF/Excel/imprimir/chat. Prioridade: confirmação da Anam («vou enviar…») → pedido do utilizador.
 */
async function ensurePanelMetaExecuted(userText, assistantText, client, g) {
  const u = String(userText || '').trim();
  const a = String(assistantText || '').trim();
  if (u.length < 3 && a.length < 8) return false;

  if (inferVoiceVisualIntent(u) === 'clear') {
    dispatchAnamPanelVoiceCommand(u);
    return true;
  }

  const metaKinds = ['chat', 'print', 'pdf', 'excel'];

  if (a.length >= 8) {
    for (const kind of metaKinds) {
      if (!isAnamMetaCommitPhrase(kind, a, u)) continue;
      const execKey = `meta-commit:${kind}:${u.slice(0, 40)}:${a.slice(0, 60)}`;
      const recentlyDone =
        g.lastMetaExecKey === execKey &&
        g.lastPanelMetaSuccessAt &&
        Date.now() - g.lastPanelMetaSuccessAt < 5000;
      if (recentlyDone) return true;

      const meta = resolvePanelMetaFromConversation(u, a, kind);
      if (meta) {
        try {
          client.interruptPersona?.();
        } catch (_) {}
        const done = await runResolvedMeta(meta, execKey, client, g);
        if (done !== null) return done;
      }
    }
  }

  if (u.length < 3) return false;

  const execKey = `meta:${u.slice(0, 100)}`;
  const recentlyDone =
    g.lastMetaExecKey === execKey && g.lastPanelMetaSuccessAt && Date.now() - g.lastPanelMetaSuccessAt < 4000;

  if (!recentlyDone) {
    const result = await runVoicePanelMetaIfHandled(u);
    if (result?.handled) {
      g.lastMetaExecKey = execKey;
      if (result.success) {
        await speakMetaResult(client, g, result);
        return true;
      }
      if (result.speakLine) {
        await speakMetaResult(client, g, result);
        return false;
      }
    }
  } else if (g.lastPanelMetaSuccessAt) {
    return true;
  }

  if (personaClaimsPanelMetaDone(a, u) && !g.lastPanelMetaSuccessAt) {
    try {
      client.interruptPersona?.();
    } catch (_) {}
    const kind = parsePanelVoiceMetaCommand(u)?.kind || resolvePanelMetaFromConversation(u, a)?.kind;
    const meta = kind ? resolvePanelMetaFromConversation(u, a, kind) : null;
    const retry = meta
      ? await runPanelMetaResolved(meta)
      : await runVoicePanelMetaIfHandled(u);
    g.lastMetaExecKey = execKey;
    if (retry?.handled) {
      await speakMetaResult(client, g, retry);
      return Boolean(retry.success);
    }
    if (client?.talk && g.client === client) {
      try {
        client.interruptPersona?.();
      } catch (_) {}
      const kind = parsePanelVoiceMetaCommand(u)?.kind;
      const failLine =
        kind === 'print'
          ? 'Não consegui abrir a impressão. Gere o painel primeiro e permita pop-ups neste site.'
          : kind === 'pdf' || kind === 'excel'
            ? 'Não consegui exportar o painel. Gere o relatório primeiro e tente de novo.'
            : 'Não consegui enviar no chat interno. Confirme se o painel já foi gerado e o nome do destinatário no Impetus.';
      await client.talk(failLine);
      g.lastMetaTalkAt = Date.now();
    }
    return false;
  }

  return false;
}

function pushPanelTurn(g, role, text) {
  if (!g.panelConversation) g.panelConversation = [];
  const t = String(text || '').trim();
  if (t.length < 2) return;
  const last = g.panelConversation[g.panelConversation.length - 1];
  if (last && last.role === role && last.text === t) return;
  g.panelConversation.push({ role, text: t });
  if (g.panelConversation.length > 10) {
    g.panelConversation = g.panelConversation.slice(-10);
  }
}

function tryPanelCommit(userText, assistantText, g, commitKey) {
  const u = String(userText || '').trim();
  const a = String(assistantText || '').trim();
  if (a.length < 8) return;
  if (g.lastPanelCommitKey === commitKey) return;
  g.lastPanelCommitKey = commitKey;
  dispatchAnamPanelCommit({
    userTranscript: u,
    assistantResponse: a,
    recentTurns: g.panelConversation || []
  });
}

/**
 * @param {import('@anam-ai/js-sdk').default} client
 * @param {object} g estado __impetusAnamG
 */
export function wireAnamPanelBridge(client, g) {
  if (!client || typeof client.addListener !== 'function') return;
  if (g.panelBridgeWired && g.panelBridgeClient === client) return;

  unwireAnamPanelBridge(g);

  g.panelConversation = [];
  g.lastPanelCommitKey = '';

  let lastUserFinal = '';
  let lastHandledUserKey = '';
  let personaAccum = '';

  const processUserText = (text, key) => {
    const t = String(text || '').trim();
    if (t.length < 3) return;
    const dedupeKey = key || t;
    if (dedupeKey === lastHandledUserKey) return;
    lastHandledUserKey = dedupeKey;
    lastUserFinal = t;
    pushPanelTurn(g, 'user', t);
    void injectOperationalVoiceContext(client, t);
    void ensurePanelMetaExecuted(t, '', client, g);
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
      const u = lastUser?.content || lastUserFinal;
      const metaKind =
        resolvePanelMetaFromConversation(u, lastPersona.content)?.kind ||
        parsePanelVoiceMetaCommand(u)?.kind;
      const skipPanelCommit =
        metaKind === 'chat' ||
        metaKind === 'pdf' ||
        metaKind === 'excel' ||
        metaKind === 'print' ||
        metaKind === 'share';
      void ensurePanelMetaExecuted(u, lastPersona.content, client, g).then((metaDone) => {
        if (!metaDone && !skipPanelCommit) {
          pushPanelTurn(g, 'assistant', lastPersona.content);
          tryPanelCommit(
            u,
            lastPersona.content,
            g,
            `hist-commit:${lastUser?.id || 'u'}:${lastPersona.id}:${lastPersona.content.length}`
          );
        }
      });
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
          if (personaClaimsPanelMetaDone(assistant, lastUserFinal) && !g.lastPanelMetaSuccessAt) {
            try {
              client.interruptPersona?.();
            } catch (_) {}
          }
          if (
            g.lastMetaTalkAt &&
            Date.now() - g.lastMetaTalkAt < 12_000 &&
            /\b(clique|clica|menu|bot[aã]o|para baixar|v[aá]\s+em|acesse|abre o|passo a passo|exportar.*?(?:clic|menu))\b/i.test(
              assistant
            )
          ) {
            try {
              client.interruptPersona?.();
            } catch (_) {}
            return;
          }
          const metaKind =
            resolvePanelMetaFromConversation(lastUserFinal, assistant)?.kind ||
            parsePanelVoiceMetaCommand(lastUserFinal)?.kind;
          const skipPanelCommit =
            metaKind === 'chat' ||
            metaKind === 'pdf' ||
            metaKind === 'excel' ||
            metaKind === 'print' ||
            metaKind === 'share';
          void ensurePanelMetaExecuted(lastUserFinal, assistant, client, g).then((metaDone) => {
            if (metaDone || skipPanelCommit) return;
            pushPanelTurn(g, 'assistant', assistant);
            tryPanelCommit(
              lastUserFinal,
              assistant,
              g,
              `stream-commit:${lastUserFinal.length}:${assistant.length}`
            );
          });
          if (!skipPanelCommit) {
            pushPanelTurn(g, 'assistant', assistant);
          }
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
    g.panelConversation = [];
    g.lastPanelCommitKey = '';
  };

  void injectOperationalVoiceContext(client);
}

export function unwireAnamPanelBridge(g) {
  if (g?.panelBridgeCleanup) {
    g.panelBridgeCleanup();
  }
}
