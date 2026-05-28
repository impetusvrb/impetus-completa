#!/usr/bin/env node
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('child_process').execSync(`node "${__dirname}/fix-opcua-hexy-cjs.js"`, { stdio: 'pipe' });

const runtime = require('../src/industrial-opcua/runtime/opcuaRealClientRuntime');
const PILOT = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';

(async () => {
  await runtime.stopClient(PILOT);
  const nodes = require('fs').existsSync(require('path').join(__dirname, '../.opcua-lab-nodes.json'))
    ? JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../.opcua-lab-nodes.json'), 'utf8')).nodes
    : ['ns=1;i=1001'];
  const r = await runtime.startClient(PILOT, {
    endpoint_url: 'opc.tcp://127.0.0.1:4840/UA/ImpetusLab',
    enabled: true,
    mode: 'on',
    node_subscriptions: nodes,
  });
  console.log(JSON.stringify({ start: r, stats: runtime.getGlobalStats() }, null, 2));
  process.exit(r.ok ? 0 : 1);
})().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
