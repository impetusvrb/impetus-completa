'use strict';

/**
 * FASE 4 — Governança centralizada de structured_input (fundação escalável).
 *
 * Registry de schemas por domínio cognitivo. Validação via Zod com modo
 * backward-compatible: campos desconhecidos são stripped, não rejeitados.
 *
 * Feature flag: STRUCTURED_INPUT_SCHEMA_STRICT (default false — permissivo legado)
 */

const { z } = require('zod');

const STRICT = process.env.STRUCTURED_INPUT_SCHEMA_STRICT === 'true';

const environmentalMetricsSchema = z
  .object({
    water_intensity: z.record(z.unknown()).optional(),
    energy_intensity: z.record(z.unknown()).optional(),
    waste_ratio: z.record(z.unknown()).optional()
  })
  .passthrough();

const environmentalPayloadSchema = z
  .object({
    metrics: environmentalMetricsSchema,
    window: z.string().max(256).optional(),
    data_quality: z.string().max(128).optional(),
    unit: z.string().max(64).optional(),
    as_of: z.string().max(64).optional()
  })
  .passthrough();

const environmentalStructuredInputSchema = z.object({
  type: z.literal('environmental'),
  payload: environmentalPayloadSchema
});

const REGISTRY = Object.freeze({
  environmental: {
    domain: 'environmental',
    schema: environmentalStructuredInputSchema,
    trustLevel: 'structured',
    description: 'Métricas ambientais industriais (água, energia, resíduos)'
  }
});

const ALLOWED_TYPES = Object.freeze(Object.keys(REGISTRY));

/**
 * Valida structured_input contra o registry.
 * @returns {{ ok: boolean, normalized?: object, error?: { code: string, message: string, issues?: unknown[] } }}
 */
function validateStructuredInput(structuredInput) {
  if (structuredInput == null) {
    return { ok: true, normalized: null };
  }

  if (!structuredInput.type) {
    return {
      ok: false,
      error: { code: 'INVALID_STRUCTURED_INPUT_TYPE', message: 'structured_input.type é obrigatório' }
    };
  }

  if (!structuredInput.payload || typeof structuredInput.payload !== 'object') {
    return {
      ok: false,
      error: { code: 'INVALID_STRUCTURED_INPUT_PAYLOAD', message: 'structured_input.payload é obrigatório' }
    };
  }

  const entry = REGISTRY[structuredInput.type];
  if (!entry) {
    return {
      ok: false,
      error: {
        code: 'STRUCTURED_INPUT_TYPE_NOT_ALLOWED',
        message: `Tipo não permitido: ${String(structuredInput.type)}`
      }
    };
  }

  const parseMode = STRICT ? { errorMap: undefined } : {};
  const result = entry.schema.safeParse(structuredInput, parseMode);

  if (!result.success) {
    const issues = result.error?.issues?.map((i) => ({
      path: i.path.join('.'),
      message: i.message
    }));
    return {
      ok: false,
      error: {
        code: 'STRUCTURED_INPUT_SCHEMA_VIOLATION',
        message: `Payload inválido para domínio ${structuredInput.type}`,
        issues
      }
    };
  }

  return { ok: true, normalized: result.data, trustLevel: entry.trustLevel };
}

function listDomains() {
  return ALLOWED_TYPES.map((type) => ({
    type,
    trustLevel: REGISTRY[type].trustLevel,
    description: REGISTRY[type].description
  }));
}

module.exports = {
  validateStructuredInput,
  listDomains,
  ALLOWED_TYPES,
  REGISTRY,
  isStrictMode: () => STRICT
};
