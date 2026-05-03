'use strict';

/**
 * Envelope canónico do pipeline event-driven IMPETUS (versão 2.0).
 *
 * Aditivo: convive com os fluxos HTTP existentes; nenhum serviço atual depende deste
 * módulo. Validado com `zod` para falhar cedo e nunca permitir payload bruto a jusante.
 */

const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');

const EVENT_TYPES = Object.freeze([
  'chat_message',
  'sensor_alert',
  'task_update',
  'external_data',
  'system_health_snapshot'
]);

const EVENT_SOURCES = Object.freeze(['whatsapp', 'system', 'machine', 'api_externa']);

const PRIORITIES = Object.freeze(['high', 'medium', 'low']);

const ISO_DATE = z
  .string()
  .min(10)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'timestamp deve ser ISO 8601 válido' });

const eventEnvelopeSchema = z
  .object({
    id: z.string().uuid(),
    type: z.enum(EVENT_TYPES),
    source: z.enum(EVENT_SOURCES),
    user: z.union([z.string().min(1), z.null()]),
    payload: z.record(z.any()).default({}),
    priority: z.enum(PRIORITIES),
    timestamp: ISO_DATE
  })
  .strict();

/**
 * @param {object} input — campos parciais; `id`/`timestamp`/`priority` são preenchidos por omissão.
 * @returns {{
 *   id: string,
 *   type: string,
 *   source: string,
 *   user: string|null,
 *   payload: object,
 *   priority: 'high'|'medium'|'low',
 *   timestamp: string
 * }}
 */
function createEvent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const e = new Error('createEvent: input inválido');
    e.code = 'EVENT_ENVELOPE_INVALID';
    throw e;
  }
  const candidate = {
    id: input.id || uuidv4(),
    type: input.type,
    source: input.source,
    user: input.user != null ? String(input.user) : null,
    payload: input.payload && typeof input.payload === 'object' && !Array.isArray(input.payload) ? input.payload : {},
    priority: input.priority || 'medium',
    timestamp: input.timestamp || new Date().toISOString()
  };
  return validateEvent(candidate);
}

/**
 * @param {object} candidate
 * @returns {object} envelope normalizado
 */
function validateEvent(candidate) {
  const parsed = eventEnvelopeSchema.safeParse(candidate);
  if (!parsed.success) {
    const e = new Error(`Envelope inválido: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    e.code = 'EVENT_ENVELOPE_INVALID';
    e.details = parsed.error.issues;
    throw e;
  }
  return parsed.data;
}

module.exports = {
  EVENT_TYPES,
  EVENT_SOURCES,
  PRIORITIES,
  eventEnvelopeSchema,
  createEvent,
  validateEvent
};
