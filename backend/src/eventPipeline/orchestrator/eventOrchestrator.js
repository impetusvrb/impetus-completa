'use strict';

/**
 * Orquestrador de eventos IMPETUS — Node.js controla o fluxo; Vertex AI apoia (Gemini).
 *
 * Mapeamento intent → acção (regras explícitas, sem múltiplas IAs por evento sem motivo):
 *   conversation   → send_to_chatgpt(...)
 *   analysis       → enqueue_claude_job(...)
 *   task           → execute_task(...)
 *   external_data  → call_external_api(...) → send_to_chatgpt(...)
 *   system_health  → enqueue_claude_job(...)
 *
 * Acções concretas são injectáveis (handlers) no `wireOrchestrator()` para isolar
 * o pipeline dos serviços actuais (chat, tarefas, APIs externas) e permitir testes.
 */

const claudeJobQueue = require('./claudeJobQueue');
const { callWithRetry } = require('../resilience/aiResilience');

const _handlers = {
  /** @type {(input: object) => Promise<object>} */
  send_to_chatgpt: async function defaultSendToChatGPT(input) {
    console.info('[ROUTER_NOOP_CHATGPT]', JSON.stringify({ event_id: input.event_id }));
    return { ok: true, channel: 'chatgpt', noop: true, content: '' };
  },
  /** @type {(input: object) => Promise<object>} */
  execute_task: async function defaultExecuteTask(input) {
    console.info('[ROUTER_NOOP_TASK]', JSON.stringify({ event_id: input.event_id }));
    return { ok: true, channel: 'task', noop: true };
  },
  /** @type {(input: object) => Promise<object>} */
  call_external_api: async function defaultCallExternalApi(input) {
    console.info('[ROUTER_NOOP_EXTERNAL]', JSON.stringify({ event_id: input.event_id }));
    return { ok: true, channel: 'external_api', noop: true, data: null };
  }
};

/**
 * Permite ao boot da aplicação ligar handlers reais sem acoplamento neste módulo.
 *
 * @param {{
 *   send_to_chatgpt?: (input: object) => Promise<object>,
 *   execute_task?: (input: object) => Promise<object>,
 *   call_external_api?: (input: object) => Promise<object>,
 *   claude_handler?: (job: object) => Promise<object>
 * }} mapping
 */
function wireOrchestrator(mapping = {}) {
  if (typeof mapping.send_to_chatgpt === 'function') _handlers.send_to_chatgpt = mapping.send_to_chatgpt;
  if (typeof mapping.execute_task === 'function') _handlers.execute_task = mapping.execute_task;
  if (typeof mapping.call_external_api === 'function') _handlers.call_external_api = mapping.call_external_api;
  if (typeof mapping.claude_handler === 'function') claudeJobQueue.setHandler(mapping.claude_handler);
}

function _baseInput(processed, refined) {
  return {
    event_id: processed.event_id,
    event_type: processed.event_type,
    intent: refined.intent,
    confidence: refined.confidence,
    summary: processed.summary,
    entities: refined.entities,
    priority: refined.priority,
    payload: processed.anonymized_payload || {}
  };
}

/**
 * Roteia um evento já processado e refinado.
 *
 * @param {object} processed — saída de eventProcessor.processEvent
 * @param {object} refined — saída de intentRefinementService.refineIntent
 * @returns {Promise<{ ok: boolean, channel: string, intent: string, output: any, error?: string }>}
 */
async function routeRefinedEvent(processed, refined) {
  const input = _baseInput(processed, refined);
  const meta = { intent: refined.intent, event_id: processed.event_id, type: processed.event_type };

  try {
    if (refined.intent === 'task') {
      const out = await callWithRetry(() => _handlers.execute_task(input), {
        metadata: { ...meta, ia_chamada: 'none' },
        fallback: async () => ({ ok: false, channel: 'task', error: 'task_handler_failed' })
      });
      return { ok: !!out.ok, channel: 'task', intent: refined.intent, output: out };
    }

    if (refined.intent === 'analysis' || refined.intent === 'system_health') {
      const out = await claudeJobQueue.enqueue(input);
      return { ok: true, channel: 'claude_background', intent: refined.intent, output: out };
    }

    if (refined.intent === 'external_data') {
      const ext = await callWithRetry(() => _handlers.call_external_api(input), {
        metadata: { ...meta, ia_chamada: 'none' },
        fallback: async () => ({ ok: false, channel: 'external_api', error: 'external_api_failed', data: null })
      });
      const composed = { ...input, payload: { ...input.payload, external: ext.data } };
      const reply = await callWithRetry(() => _handlers.send_to_chatgpt(composed), {
        metadata: { ...meta, ia_chamada: 'chatgpt' },
        fallback: async () => ({
          ok: true,
          channel: 'chatgpt',
          noop: false,
          content: 'Resposta indisponível no momento. Tente novamente em alguns instantes.'
        })
      });
      return {
        ok: !!reply.ok,
        channel: 'external_then_chatgpt',
        intent: refined.intent,
        output: { external: ext, reply }
      };
    }

    // conversation (default)
    const out = await callWithRetry(() => _handlers.send_to_chatgpt(input), {
      metadata: { ...meta, ia_chamada: 'chatgpt' },
      fallback: async () => ({
        ok: true,
        channel: 'chatgpt',
        noop: false,
        content: 'Resposta indisponível no momento. Tente novamente em alguns instantes.'
      })
    });
    return { ok: !!out.ok, channel: 'chatgpt', intent: refined.intent, output: out };
  } catch (err) {
    return {
      ok: false,
      channel: 'orchestrator',
      intent: refined.intent,
      output: null,
      error: err && err.message ? String(err.message) : 'orchestrator_error'
    };
  }
}

module.exports = {
  wireOrchestrator,
  routeRefinedEvent
};
