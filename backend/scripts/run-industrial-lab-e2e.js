#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function main() {
  const lab = require('../src/industrial-edge/lab/industrialLabE2eService');
  const r = await lab.runSuite(process.argv[2] || lab.PILOT_DEFAULT);
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
