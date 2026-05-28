#!/usr/bin/env node
'use strict';

const path = require('path');
const { execSync } = require('child_process');
try {
  execSync(`node "${path.join(__dirname, 'fix-opcua-hexy-cjs.js')}"`, { stdio: 'pipe' });
} catch { /* ignore */ }

const { OPCUAServer, Variant, DataType, coerceNodeId } = require('node-opcua');
const fs = require('fs');

const PORT = parseInt(process.env.IMPETUS_OPCUA_LAB_PORT || '4840', 10);
const NODEMAP_FILE = path.join(__dirname, '../.opcua-lab-nodes.json');

async function main() {
  const server = new OPCUAServer({
    port: PORT,
    resourcePath: '/UA/ImpetusLab',
    buildInfo: { productName: 'IMPETUS-OPCUA-LAB', buildNumber: '1', buildDate: new Date() },
  });

  await server.initialize();
  const addressSpace = server.engine.addressSpace;
  const namespace = addressSpace.getOwnNamespace();
  const labNs = addressSpace.registerNamespace('urn:impetus:lab');
  const nsIdx = labNs.index;

  const folder = namespace.addObject({
    organizedBy: namespace.objectsFolder,
    browseName: 'Simulator',
  });

  const v1 = namespace.addVariable({
    componentOf: folder,
    browseName: 'Simulator1',
    dataType: DataType.Double,
    minimumSamplingInterval: 1000,
    value: { get: () => new Variant({ dataType: DataType.Double, value: 25.5 }) },
  });

  const v2 = namespace.addVariable({
    componentOf: folder,
    browseName: 'Temperature',
    dataType: DataType.Double,
    minimumSamplingInterval: 1000,
    value: {
      get: () => new Variant({ dataType: DataType.Double, value: 22.0 + Math.sin(Date.now() / 60000) }),
    },
  });

  const nodes = [v1.nodeId.toString(), v2.nodeId.toString()];
  fs.writeFileSync(NODEMAP_FILE, JSON.stringify({ namespace_index: nsIdx, nodes }, null, 2));

  await server.start();
  let endpoint = server.getEndpointUrl();
  endpoint = endpoint.replace(/opc\.tcp:\/\/[^:/]+/i, 'opc.tcp://127.0.0.1');
  fs.writeFileSync(path.join(__dirname, '../.opcua-lab-endpoint.txt'), endpoint, 'utf8');
  console.log(`[OPCUA_LAB] endpoint=${endpoint}`);
  console.log(`[OPCUA_LAB] subscribe nodes: ${nodes.join(', ')}`);
}

main().catch((err) => {
  console.error('[OPCUA_LAB] Falha:', err?.message || err);
  process.exit(1);
});
