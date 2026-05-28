'use strict';

const tracing = require('../observability/edgeTracing');

/**
 * Encaminha amostras edge para o pipeline do conector industrial correspondente.
 */
async function bridgeEdgePayload(companyId, payload, effectiveMode) {
  const source = String(
    payload.connector_source || payload.telemetry_source || payload.source || 'edge'
  ).toLowerCase();

  const t0 = Date.now();
  let result = { ok: false, code: 'UNKNOWN_SOURCE', source };

  try {
    if (source === 'mqtt' || source === 'environment_mqtt') {
      const mqtt = require('../../domains/environment/telemetry/connectors/environmentMqttConnector');
      const topic = payload.topic || payload.mqtt_topic || 'edge/ingest';
      const message = payload.message || payload;
      const norm = mqtt.ingestMqttMessage(companyId, topic, message);
      if (!norm.ok) return { ...norm, source: 'mqtt' };
      if (effectiveMode !== 'on') {
        await tracing.trace(companyId, 'edge_bridge_mqtt_audit', 'ok', { topic, latency_ms: Date.now() - t0 });
        return { ok: true, audit: true, source: 'mqtt', sampleBody: norm.sampleBody };
      }
      const runtime = require('../../domains/environment/telemetry/environmentTelemetryRuntime');
      result = await runtime.processConnectorIngest(companyId, null, 'mqtt', {
        topic,
        message,
        ...norm.sampleBody,
      });
      result.source = 'mqtt';
    } else if (source === 'opcua' || source === 'opc_ua') {
      const opcua = require('../../domains/environment/telemetry/connectors/environmentOpcUaConnector');
      const nodeId = payload.node_id || payload.opcua_node || 'ns=2;s=Edge';
      const value = payload.value;
      const norm = opcua.ingestSubscriptionSample(companyId, nodeId, value, payload.meta || {});
      if (!norm.ok) return { ...norm, source: 'opcua' };
      if (effectiveMode !== 'on') {
        await tracing.trace(companyId, 'edge_bridge_opcua_audit', 'ok', { node_id: nodeId, latency_ms: Date.now() - t0 });
        return { ok: true, audit: true, source: 'opcua', sampleBody: norm.sampleBody };
      }
      const runtime = require('../../domains/environment/telemetry/environmentTelemetryRuntime');
      result = await runtime.processConnectorIngest(companyId, null, 'opcua', {
        node_id: nodeId,
        value,
        meta: payload.meta || {},
      });
      result.source = 'opcua';
    } else if (source === 'modbus' || source === 'modbus_tcp') {
      const modbus = require('../../domains/environment/telemetry/connectors/environmentModbusConnector');
      const registers = payload.registers || [{
        address: payload.address ?? payload.register ?? 0,
        raw_value: payload.value ?? payload.raw_value ?? 0,
        ...payload,
      }];
      if (effectiveMode !== 'on') {
        const samples = [];
        for (const reg of registers) {
          const raw = reg.raw_value != null ? reg.raw_value : 0;
          samples.push(modbus.convertRegisterToSample(reg.address || reg.register || 0, raw, { ...payload.meta, ...reg }));
        }
        await tracing.trace(companyId, 'edge_bridge_modbus_audit', 'ok', {
          register_count: samples.length,
          latency_ms: Date.now() - t0,
        });
        return { ok: true, audit: true, source: 'modbus', samples };
      }
      result = await modbus.pollRegisters(companyId, registers, payload.meta || {}, 3);
      result.source = 'modbus';
    } else {
      const ingest = require('../../domains/environment/telemetry/environmentTelemetryIngestService');
      if (effectiveMode !== 'on') {
        await tracing.trace(companyId, 'edge_bridge_generic_audit', 'ok', { latency_ms: Date.now() - t0 });
        return { ok: true, audit: true, source: 'edge' };
      }
      result = await ingest.ingestSingle(companyId, null, payload);
      result.source = 'edge';
    }

    await tracing.trace(companyId, 'edge_bridge_ingest', result.ok ? 'ok' : 'error', {
      source,
      latency_ms: Date.now() - t0,
      code: result.code,
    });
    return result;
  } catch (err) {
    await tracing.trace(companyId, 'edge_bridge_failed', 'error', { source, error: err?.message });
    return { ok: false, code: 'BRIDGE_FAILED', error: err?.message, source };
  }
}

module.exports = { bridgeEdgePayload };
