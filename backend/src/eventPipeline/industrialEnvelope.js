'use strict';

/**
 * Envelope industrial (WAVE 1) — estende o envelope v2 sem quebrar contratos legados.
 */

const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const { createEvent, validateEvent } = require('./envelope');
const { validateCatalogType } = require('./catalog/industrialEventCatalog');
const { isEventCatalogStrict } = require('./industrialFlags');

const ISO_DATE = z
  .string()
  .min(10)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'occurred_at deve ser ISO 8601 válido' });

const industrialExtensionSchema = z
  .object({
    event_name: z.string().min(3).max(128),
    domain: z.string().min(2).max(32),
    company_id: z.string().uuid(),
    correlation_id: z.string().min(1).max(128),
    causation_id: z.string().min(1).max(128).nullable().optional(),
    trace_id: z.string().min(1).max(128).nullable().optional(),
    workflow_id: z.string().min(1).max(128).nullable().optional(),
    idempotency_key: z.string().min(8).max(256),
    partition_key: z.string().min(1).max(128),
    payload: z.record(z.any()).default({}),
    metadata: z.record(z.any()).default({}),
    occurred_at: ISO_DATE,
    schema_version: z.number().int().min(1).max(99).default(1)
  })
  .strict();

/**
 * @param {object} partial
 * @param {{ strictCatalog?: boolean }} [opts]
 */
function buildIndustrialEnvelope(partial, opts = {}) {
  if (!partial || typeof partial !== 'object' || Array.isArray(partial)) {
    const e = new Error('buildIndustrialEnvelope: input inválido');
    e.code = 'INDUSTRIAL_ENVELOPE_INVALID';
    throw e;
  }

  const eventName = String(partial.event_name || partial.type || '').trim().toLowerCase();
  const strict = opts.strictCatalog != null ? !!opts.strictCatalog : isEventCatalogStrict();
  const catalogCheck = validateCatalogType(eventName, { strict });
  if (!catalogCheck.ok) {
    const e = new Error(`Catálogo: ${catalogCheck.reason} (${eventName})`);
    e.code = 'INDUSTRIAL_CATALOG_REJECT';
    throw e;
  }

  const companyId = String(partial.company_id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(companyId)) {
    const e = new Error('company_id UUID obrigatório em eventos industriais');
    e.code = 'INDUSTRIAL_ENVELOPE_INVALID';
    throw e;
  }

  const correlationId =
    partial.correlation_id != null
      ? String(partial.correlation_id).slice(0, 128)
      : partial.trace_id != null
        ? String(partial.trace_id).slice(0, 128)
        : uuidv4();

  const candidate = {
    event_name: eventName,
    domain: partial.domain || catalogCheck.entry.domain,
    company_id: companyId,
    correlation_id: correlationId,
    causation_id:
      partial.causation_id != null ? String(partial.causation_id).slice(0, 128) : null,
    trace_id: partial.trace_id != null ? String(partial.trace_id).slice(0, 128) : correlationId,
    workflow_id: partial.workflow_id != null ? String(partial.workflow_id).slice(0, 128) : null,
    idempotency_key:
      partial.idempotency_key != null
        ? String(partial.idempotency_key).slice(0, 256)
        : `${eventName}:${companyId}:${correlationId}`,
    partition_key: String(partial.partition_key || companyId).slice(0, 128),
    payload:
      partial.payload && typeof partial.payload === 'object' && !Array.isArray(partial.payload)
        ? partial.payload
        : {},
    metadata:
      partial.metadata && typeof partial.metadata === 'object' && !Array.isArray(partial.metadata)
        ? partial.metadata
        : {},
    occurred_at: partial.occurred_at || new Date().toISOString(),
    schema_version: partial.schema_version || 1
  };

  const parsed = industrialExtensionSchema.safeParse(candidate);
  if (!parsed.success) {
    const e = new Error(
      `Envelope industrial inválido: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`
    );
    e.code = 'INDUSTRIAL_ENVELOPE_INVALID';
    e.details = parsed.error.issues;
    throw e;
  }

  const base = {
    ...parsed.data,
    event_id: partial.event_id || uuidv4(),
    catalog: catalogCheck.entry
  };
  try {
    const partition = require('./partition/partitionKeyService');
    return partition.enrichPartitionFields(base);
  } catch (_e) {
    return base;
  }
}

/**
 * Espelha envelope v2 legado a partir de industrial (shadow / dual-write).
 */
function toLegacyEnvelope(industrial) {
  const priority =
    industrial.catalog && industrial.catalog.critical ? 'high' : 'medium';
  return createEvent({
    type: 'system_health_snapshot',
    source: 'system',
    user: industrial.metadata && industrial.metadata.user_id != null ? String(industrial.metadata.user_id) : null,
    priority,
    payload: {
      industrial_mirror: true,
      event_name: industrial.event_name,
      company_id: industrial.company_id,
      correlation_id: industrial.correlation_id,
      trace_id: industrial.trace_id,
      workflow_id: industrial.workflow_id,
      data: industrial.payload
    }
  });
}

/**
 * @param {object} legacy — envelope v2
 * @param {{ event_name?: string, correlation_id?: string, trace_id?: string }} [ctx]
 */
function fromLegacyEnvelope(legacy, ctx = {}) {
  const validated = validateEvent(legacy);
  const companyId =
    validated.payload && validated.payload.company_id != null
      ? String(validated.payload.company_id)
      : null;
  if (!companyId || !/^[0-9a-f-]{36}$/i.test(companyId)) {
    return null;
  }
  const eventName =
    ctx.event_name ||
    (validated.payload && validated.payload.industrial_event_name) ||
    'operational.pipeline.stage';
  return buildIndustrialEnvelope(
    {
      event_name: eventName,
      company_id: companyId,
      correlation_id: ctx.correlation_id || validated.id,
      trace_id: ctx.trace_id || ctx.correlation_id || validated.id,
      causation_id: validated.id,
      payload: validated.payload || {},
      metadata: {
        legacy_type: validated.type,
        legacy_source: validated.source,
        user_id: validated.user
      },
      occurred_at: validated.timestamp
    },
    { strictCatalog: false }
  );
}

module.exports = {
  industrialExtensionSchema,
  buildIndustrialEnvelope,
  toLegacyEnvelope,
  fromLegacyEnvelope
};
