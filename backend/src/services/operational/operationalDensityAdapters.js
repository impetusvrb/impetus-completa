'use strict';

/**
 * FASE 8 — DENSIDADE OPERACIONAL REAL
 *
 * Adapters para ingestão de dados operacionais reais:
 * PLCs, ERP, telemetria, qualidade, manutenção, estoque, RH.
 *
 * Feature flag: OPERATIONAL_DENSITY_ADAPTERS_ENABLED (default true)
 *
 * Cada adapter normaliza dados para o formato unificado do Impetus.
 * Integração real depende de APIs/protocolos externos configurados via env.
 */

const ENABLED = process.env.OPERATIONAL_DENSITY_ADAPTERS_ENABLED !== 'false';

const ADAPTER_STATUS = {
  NOT_CONFIGURED: 'not_configured',
  CONFIGURED: 'configured',
  ACTIVE: 'active',
  ERROR: 'error'
};

function _normalize(source, data) {
  return {
    source,
    timestamp: new Date().toISOString(),
    data: data || {},
    normalized: true
  };
}

const plcAdapter = {
  name: 'plc',
  getStatus() {
    const endpoint = process.env.PLC_API_ENDPOINT;
    return endpoint ? ADAPTER_STATUS.CONFIGURED : ADAPTER_STATUS.NOT_CONFIGURED;
  },
  async ingest(rawData) {
    if (!ENABLED) return { ok: false, reason: 'disabled' };
    return _normalize('plc', {
      signals: rawData?.signals || [],
      alarms: rawData?.alarms || [],
      timestamp: rawData?.timestamp || new Date().toISOString()
    });
  }
};

const erpAdapter = {
  name: 'erp',
  getStatus() {
    const endpoint = process.env.ERP_API_ENDPOINT;
    return endpoint ? ADAPTER_STATUS.CONFIGURED : ADAPTER_STATUS.NOT_CONFIGURED;
  },
  async ingest(rawData) {
    if (!ENABLED) return { ok: false, reason: 'disabled' };
    return _normalize('erp', {
      orders: rawData?.orders || [],
      inventory: rawData?.inventory || [],
      production: rawData?.production || []
    });
  }
};

const telemetryAdapter = {
  name: 'telemetry',
  getStatus() {
    const endpoint = process.env.TELEMETRY_ENDPOINT;
    return endpoint ? ADAPTER_STATUS.CONFIGURED : ADAPTER_STATUS.NOT_CONFIGURED;
  },
  async ingest(rawData) {
    if (!ENABLED) return { ok: false, reason: 'disabled' };
    return _normalize('telemetry', {
      sensors: rawData?.sensors || [],
      readings: rawData?.readings || [],
      anomalies: rawData?.anomalies || []
    });
  }
};

const qualityAdapter = {
  name: 'quality',
  getStatus() {
    return ADAPTER_STATUS.CONFIGURED;
  },
  async ingest(rawData) {
    if (!ENABLED) return { ok: false, reason: 'disabled' };
    return _normalize('quality', {
      inspections: rawData?.inspections || [],
      deviations: rawData?.deviations || [],
      indicators: rawData?.indicators || []
    });
  }
};

const ALL_ADAPTERS = Object.freeze([plcAdapter, erpAdapter, telemetryAdapter, qualityAdapter]);

function getAdapterStatuses() {
  return ALL_ADAPTERS.map(a => ({ name: a.name, status: a.getStatus() }));
}

function getAdapter(name) {
  return ALL_ADAPTERS.find(a => a.name === name) || null;
}

module.exports = {
  plcAdapter,
  erpAdapter,
  telemetryAdapter,
  qualityAdapter,
  ALL_ADAPTERS,
  getAdapterStatuses,
  getAdapter,
  ADAPTER_STATUS,
  isEnabled: () => ENABLED
};
