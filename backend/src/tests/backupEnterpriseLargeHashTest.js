'use strict';

/**
 * CERT-ENTERPRISE-BACKUP-01 — testes hash streaming e manifest >2 GiB
 * node src/tests/backupEnterpriseLargeHashTest.js
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const lib = require('../../scripts/enterprise/backup-lib');

function expectedSha256(filePath) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(1024 * 1024);
  try {
    let pos = 0;
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, pos);
      if (n <= 0) break;
      hash.update(buf.subarray(0, n));
      pos += n;
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex');
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('  OK', name);
  } catch (e) {
    failed += 1;
    console.error('  FAIL', name, '-', e.message);
  }
}

console.log('=== backupEnterpriseLargeHashTest ===');

test('sha256 ficheiro pequeno', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'impetus-bk-'));
  const fp = path.join(dir, 'small.bin');
  fs.writeFileSync(fp, Buffer.from('impetus-backup-test'));
  assert.strictEqual(lib.sha256File(fp), expectedSha256(fp));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('sha256 ficheiro >2 GiB (sparse)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'impetus-bk-'));
  const fp = path.join(dir, 'large.sparse');
  const size = 2 * 1024 * 1024 * 1024 + 64 * 1024; // 2 GiB + 64 KiB
  const fd = fs.openSync(fp, 'w');
  fs.closeSync(fd);
  // sparse extend
  fs.truncateSync(fp, size);
  const t0 = Date.now();
  const h = lib.sha256File(fp);
  const ms = Date.now() - t0;
  assert.strictEqual(h, expectedSha256(fp));
  assert.ok(ms < 120000, `hash demorou ${ms}ms`);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('writeManifest + validateManifest com dump grande simulado', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'impetus-bk-'));
  const dump = path.join(dir, 'database.dump');
  fs.writeFileSync(dump, Buffer.alloc(1024, 0xab));
  lib.writeManifest(dir, [{ path: dump, type: 'database', relative: 'database.dump' }], {
    mode: 'test',
  });
  assert.ok(fs.existsSync(path.join(dir, 'manifest.json')));
  const v = lib.validateManifest(dir, { strict: true });
  assert.strictEqual(v.ok, true);
  fs.rmSync(dir, { recursive: true, force: true });
});

console.log(`\nResultado: ${passed} OK, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
