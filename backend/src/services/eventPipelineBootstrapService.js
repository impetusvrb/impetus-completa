'use strict';

/**
 * Arranque seguro do event pipeline — handlers injectáveis, defaults no-op.
 * Execução “live” de ChatGPT/Claude nas acções do bus só com flags explícitas.
 */

const { bootEventPipeline } = require('../eventPipeline/pipeline');

function _safeJsonLog(prefix, obj) {
  try {
    console.info(prefix, JSON.stringify(obj));
  } catch (_e) {}
}

/**
 * Handlers estritamente NOOP — sem flags LIVE, sem chamadas externas.
 * Usado quando IMPETUS_EVENT_PIPELINE_SHADOW=true.
 */
function buildShadowNoopHandlers() {
  return {
    send_to_chatgpt: async () => ({ noop: true, ok: true, channel: 'chatgpt', content: '', silent_integration_noop: true }),
    execute_task: async () => ({ noop: true, ok: true, channel: 'task', silent_integration_noop: true }),
    call_external_api: async () => ({
      noop: true,
      ok: true,
      channel: 'external_api',
      data: null,
      silent_integration_noop: true
    }),
    claude_handler: async () => ({
      noop: true,
      status: 'ok',
      kpis: [],
      alerts: [],
      recommendations: [],
      generated_at: new Date().toISOString(),
      silent_integration_noop: true
    })
  };
}

function buildDefaultPipelineHandlers() {
  return {
    send_to_chatgpt: async (input) => {
      if (process.env.IMPETUS_PIPELINE_LIVE_CHATGPT === 'true') {
        try {
          const ai = require('./ai');
          const key = (process.env.OPENAI_API_KEY || '').trim();
          if (key && ai && typeof ai.chatCompletion === 'function') {
            const prompt = `Responda de forma breve (máximo 4 frases) ao contexto abaixo. Não invente factos nem dados de sensores.\n\nResumo anonimizado:\n${String(
              input.summary || ''
            ).slice(0, 2000)}`;
            const content = await ai.chatCompletion(prompt, {
              max_tokens: 400,
              orchestrator_exempt: true
            });
            return {
              ok: true,
              channel: 'chatgpt',
              noop: false,
              content: content || '',
              silent_integration_noop: false
            };
          }
        } catch (e) {
          console.warn('[PIPELINE_CHATGPT]', e && e.message ? e.message : e);
        }
      }
      _safeJsonLog('[PIPELINE_CHATGPT_NOOP]', {
        event_id: input.event_id,
        intent: input.intent
      });
      return {
        ok: false,
        channel: 'chatgpt',
        noop: true,
        content: '',
        error: 'integration_noop',
        silent_integration_noop: true
      };
    },

    execute_task: async (input) => {
      _safeJsonLog('[PIPELINE_TASK_NOOP]', { event_id: input.event_id, intent: input.intent });
      return { ok: true, channel: 'task', noop: true, silent_integration_noop: true };
    },

    call_external_api: async (input) => {
      _safeJsonLog('[PIPELINE_EXTERNAL_NOOP]', { event_id: input.event_id, intent: input.intent });
      return {
        ok: true,
        channel: 'external_api',
        noop: true,
        data: null,
        silent_integration_noop: true
      };
    },

    claude_handler: async (job) => {
      if (process.env.IMPETUS_PIPELINE_LIVE_CLAUDE === 'true') {
        try {
          const claudeService = require('./claudeService');
          if (typeof claudeService.isAvailable === 'function' && claudeService.isAvailable()) {
            const sys =
              'És analista industrial IMPETUS. Responde APENAS JSON válido com chaves: status (string), kpis (array de {label,value}), alerts (array de {severity,message}), recommendations (array de strings), generated_at (ISO8601).';
            const user = `Intent: ${job.intent}\nResumo: ${String(job.summary || '').slice(0, 4000)}\nEntidades: ${(job.entities || []).join(', ')}`;
            const raw = await claudeService.analyze(sys, user, {
              max_tokens: 1800,
              orchestrator_exempt: true
            });
            if (raw && String(raw).trim()) {
              try {
                const m = String(raw).match(/\{[\s\S]*\}/);
                const parsed = m ? JSON.parse(m[0]) : null;
                if (parsed && typeof parsed === 'object') {
                  return Object.assign(
                    {
                      status: 'ok',
                      kpis: [],
                      alerts: [],
                      recommendations: [],
                      generated_at: new Date().toISOString()
                    },
                    parsed
                  );
                }
              } catch (_e) {
                /* continua para NOOP estruturado */
              }
            }
          }
        } catch (e) {
          console.warn('[PIPELINE_CLAUDE_HANDLER]', e && e.message ? e.message : e);
        }
      }
      console.info('[CLAUDE_JOB_NOOP]', JSON.stringify({ event_id: job.event_id, intent: job.intent }));
      return {
        status: 'ok',
        kpis: [],
        alerts: [],
        recommendations: [],
        generated_at: new Date().toISOString(),
        note: 'NOOP_HANDLER',
        silent_integration_noop: true
      };
    }
  };
}

/**
 * @returns {{ ok: boolean, reason?: string, types?: string[], already_booted?: boolean }}
 */
function bootIfEnabled() {
  if (process.env.IMPETUS_EVENT_PIPELINE_ENABLED !== 'true') {
    return { ok: false, reason: 'disabled_by_env' };
  }
  const shadow = process.env.IMPETUS_EVENT_PIPELINE_SHADOW === 'true';
  const handlers = shadow ? buildShadowNoopHandlers() : buildDefaultPipelineHandlers();
  const out = bootEventPipeline({ handlers });
  if (out && out.already_booted) {
    return { ok: true, already_booted: true };
  }
  return out && out.ok ? { ok: true, types: out.types } : { ok: false, reason: out && out.reason };
}

module.exports = {
  bootIfEnabled,
  buildDefaultPipelineHandlers,
  buildShadowNoopHandlers
};
