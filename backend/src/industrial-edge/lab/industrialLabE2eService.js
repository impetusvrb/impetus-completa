'use strict';

const net = require('net');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const edgeFlags = require('../config/edgeRuntimeFlags');
const bridge = require('../runtime/edgeConnectorBridgeRuntime');
const persistence = require('../services/edgeQueuePersistenceService');

const PILOT_DEFAULT = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';

function _check(name, passed, detail = {}) {
  return { name, passed: !!passed, detail };
}

function _tcpProbe(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let done = false;
    const finish = (ok, error) => {
      if (done) return;
      done = true;
      try {
        sock.destroy();
      } catch { /* ignore */ }
      resolve({ ok, error });
    };
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => finish(true));
    sock.once('timeout', () => finish(false, 'timeout'));
    sock.once('error', (e) => finish(false, e?.message));
    sock.connect(port, host);
  });
}

function _parseMqttHostPort(url) {
  try {
    const u = new URL(url.replace(/^mqtt:\/\//, 'http://'));
    return { host: u.hostname || '127.0.0.1', port: parseInt(u.port || '1883', 10) };
  } catch {
    return { host: '127.0.0.1', port: 1883 };
  }
}

function _parseOpcuaHostPort(url) {
  try {
    const m = String(url).match(/opc\.tcp:\/\/([^:/]+):(\d+)/i);
    if (m) return { host: m[1], port: parseInt(m[2], 10) };
  } catch { /* ignore */ }
  return { host: '127.0.0.1', port: 4840 };
}

async function runSuite(companyId = PILOT_DEFAULT) {
  const checks = [];
  const runId = uuidv4();

  checks.push(_check('lab_enabled', edgeFlags.isIndustrialLabEnabled()));

  try {
    await persistence.ensureSchema();
    checks.push(_check('edge_schema', true));
  } catch (err) {
    checks.push(_check('edge_schema', false, { error: err.message }));
  }

  const connectorModules = [
    ['mqtt', () => require('../../industrial-mqtt/governance/mqttGovernanceService').getDiagnostics()],
    ['opcua', () => require('../../industrial-opcua/governance/opcuaGovernanceService').getDiagnostics()],
    ['modbus', () => require('../../industrial-modbus/governance/modbusGovernanceService').getDiagnostics()],
    ['edge', () => require('../governance/edgeGovernanceService').getDiagnostics()],
  ];

  const connectorDiag = {};
  for (const [name, fn] of connectorModules) {
    try {
      connectorDiag[name] = fn();
      checks.push(_check(`module_${name}`, connectorDiag[name]?.enabled !== false, connectorDiag[name]));
    } catch (err) {
      checks.push(_check(`module_${name}`, false, { error: err.message }));
    }
  }

  const mqttHp = _parseMqttHostPort(edgeFlags.labMqttUrl());
  const modbusProbe = await _tcpProbe(edgeFlags.labModbusHost(), edgeFlags.labModbusPort());
  const opcuaHp = _parseOpcuaHostPort(edgeFlags.labOpcuaUrl());
  const opcuaProbe = await _tcpProbe(opcuaHp.host, opcuaHp.port);

  checks.push(_check('lab_mqtt_tcp', (await _tcpProbe(mqttHp.host, mqttHp.port)).ok, mqttHp));
  checks.push(_check('lab_modbus_tcp', modbusProbe.ok, {
    host: edgeFlags.labModbusHost(),
    port: edgeFlags.labModbusPort(),
    error: modbusProbe.error,
  }));
  checks.push(_check('lab_opcua_tcp', opcuaProbe.ok, { ...opcuaHp, error: opcuaProbe.error }));

  if (companyId) {
    const edgePayload = {
      edge_sequence: `lab-${Date.now()}`,
      idempotency_key: `lab-e2e-${runId}`,
      connector_source: 'mqtt',
      topic: 'impetus/lab/e2e',
      value: 1,
      unit: 'count',
      telemetry_type: 'lab_probe',
    };
    try {
      const memEdge = require('../../domains/environment/telemetry/environmentEdgeTelemetryRuntime');
      process.env.IMPETUS_ENVIRONMENT_TELEMETRY_EDGE_ENABLED = 'true';
      process.env.IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED = 'true';
      const enq = memEdge.enqueueEdgeSample(companyId, edgePayload);
      checks.push(_check('edge_enqueue', enq.ok === true, enq));

      const mqttBridge = await bridge.bridgeEdgePayload(companyId, edgePayload, 'audit');
      checks.push(_check('bridge_mqtt_audit', mqttBridge.ok === true, mqttBridge));

      const modbusBridge = await bridge.bridgeEdgePayload(companyId, {
        connector_source: 'modbus',
        registers: [{ address: 0, raw_value: 42, metric_key: 'lab.modbus' }],
      }, 'audit');
      checks.push(_check('bridge_modbus_audit', modbusBridge.ok === true, modbusBridge));
    } catch (err) {
      checks.push(_check('edge_lab_flow', false, { error: err.message }));
    }
  }

  const mandatory = checks.filter((c) => !String(c.name).startsWith('lab_'));
  const ok = mandatory.every((c) => c.passed);
  const lab_connectivity_ok = checks
    .filter((c) => String(c.name).startsWith('lab_'))
    .every((c) => c.passed);
  const connectors = {
    mqtt_mode: process.env.IMPETUS_MQTT_REAL_MODE,
    opcua_mode: process.env.IMPETUS_OPCUA_REAL_MODE,
    modbus_mode: process.env.IMPETUS_MODBUS_REAL_MODE,
    edge_mode: process.env.IMPETUS_EDGE_RUNTIME_MODE,
    diagnostics: connectorDiag,
  };

  try {
    await db.query(
      `INSERT INTO industrial_lab_runs (company_id, run_id, suite, ok, checks, connectors)
       VALUES ($1::uuid, $2, 'e2e', $3, $4::jsonb, $5::jsonb)`,
      [companyId || null, runId, ok, JSON.stringify(checks), JSON.stringify(connectors)]
    );
  } catch (err) {
    checks.push(_check('lab_run_persisted', false, { error: err.message }));
  }

  return { ok, lab_connectivity_ok, run_id: runId, checks, connectors };
}

module.exports = { runSuite, PILOT_DEFAULT };
