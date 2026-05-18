'use strict';

const water = require('./water/waterRuntimes');
const effluent = require('./effluent/effluentRuntimes');
const emissions = require('./emissions/emissionsRuntimes');
const waste = require('./waste/wasteRuntimes');
const field = require('./field/fieldRuntimes');
const { publishEnvironmentIndustrialEvent } = require('../events/environmentEventPublisher');
const obs = require('./shared/environmentOperationalObservability');

const AREA_HANDLERS = {
  water: {
    summary: () => ({
      capabilities: ['consumption', 'capture', 'permit', 'meters', 'eta', 'reservoir', 'collection', 'analysis']
    }),
    record: (ctx) => water.waterCollectionRuntime({ ...ctx, ...ctx.body })
  },
  effluent: {
    summary: () => ({
      capabilities: ['ete', 'ph', 'dbo', 'dqo', 'solids', 'flow', 'temperature', 'nc']
    }),
    record: (ctx) => effluent.effluentSamplingRuntime({ ...ctx, ...ctx.body })
  },
  emissions: {
    summary: () => ({
      capabilities: ['stack', 'pm', 'nox', 'sox', 'co2', 'voc', 'flare', 'odor']
    }),
    record: (ctx) => emissions.emissionsSamplingRuntime({ ...ctx, ...ctx.body })
  },
  waste: {
    summary: () => ({
      capabilities: ['generation', 'classification', 'mtr', 'fdsr', 'destination', 'inventory', 'reverse_logistics']
    }),
    record: (ctx) => waste.wasteManifestRuntime({ ...ctx, ...ctx.body })
  },
  field: {
    summary: () => ({
      capabilities: ['inspection', 'occurrence', 'leak', 'fauna', 'flora', 'noise', 'drainage', 'conditions']
    }),
    record: (ctx) => field.environmentalOccurrenceRuntime({ ...ctx, ...ctx.body })
  }
};

const EVENT_BY_AREA = {
  water: 'environment.water.sample_collected',
  effluent: 'environment.effluent.analysis_completed',
  emissions: 'environment.emission.alert_triggered',
  waste: 'environment.waste.manifest_created',
  field: 'environment.field.occurrence_registered'
};

function getWorkspaceSummary(area, ctx) {
  const handler = AREA_HANDLERS[area];
  if (!handler) return { ok: false, error: 'unknown_area' };
  return {
    ok: true,
    domain: 'environment',
    area,
    company_id: ctx.companyId,
    shadow: true,
    ...handler.summary()
  };
}

async function recordOperationalAction(area, ctx) {
  const handler = AREA_HANDLERS[area];
  if (!handler) return { ok: false, error: 'unknown_area' };

  const runtimeResult = handler.record(ctx);
  const eventName = EVENT_BY_AREA[area] || 'environment.environmental.evidence_attached';

  let publish = { ok: true, skipped: true };
  if (ctx.body?.publish_event !== false) {
    publish = await publishEnvironmentIndustrialEvent(
      {
        event_name: eventName,
        company_id: String(ctx.companyId),
        correlation_id: ctx.body.correlation_id || uuidv4(),
        payload: { area, runtime: runtimeResult, form: ctx.body }
      },
      { origin_layer: 'operational', user_id: ctx.user?.id }
    );
  }

  obs.recordEnvironmentOperationalMetric('environment_operational_density_score', 1, { area });

  return { ok: true, runtime: runtimeResult, publish };
}

module.exports = {
  getWorkspaceSummary,
  recordOperationalAction,
  water,
  effluent,
  emissions,
  waste,
  field
};
