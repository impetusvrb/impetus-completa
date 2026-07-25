'use strict';

/**
 * SEC-VISUAL-INTELLIGENCE-001F — Testes T-ROT-01..10 (ficheiros temporários, sem logs de produção).
 * Executar: node backend/scripts/sec001f-log-window-tests.js
 */

const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const logWindowSvc = require('../src/services/adminPortalSecurityEvidenceLogWindow');

const results = [];

function pass(id, detail) {
  results.push({ id, result: 'PASS', detail });
  console.log(`  ${id}: PASS — ${detail}`);
}

function fail(id, detail) {
  results.push({ id, result: 'FAIL', detail });
  console.log(`  ${id}: FAIL — ${detail}`);
}

async function withTempLog(fn) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'impetus-logtest-'));
  const filePath = path.join(dir, 'test.log');
  try {
    return await fn(filePath, dir);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
}

async function runTests() {
  console.log('=== T-ROT: Testes de rotação/truncamento (temp files) ===\n');

  // T-ROT-01 append normal
  await withTempLog(async (fp) => {
    logWindowSvc.resetLogWindowState('t1');
    await fsp.writeFile(fp, 'line1\nline2\n');
    const r1 = await logWindowSvc.acquireLogWindow(fp, 10, 't1');
    await fsp.appendFile(fp, 'line3\n');
    const r2 = await logWindowSvc.acquireLogWindow(fp, 10, 't1');
    if (r2.metrics.mode === 'INCREMENTAL' && r2.lines.join('|') === 'line1|line2|line3') {
      pass('T-ROT-01', `incremental append, lines=${r2.lines.length}`);
    } else fail('T-ROT-01', JSON.stringify(r2));
  });

  // T-ROT-02 linha parcial (unidade appendChunkToState)
  {
    const state = { partialLine: 'partial', lines: ['complete'], byteOffset: 0 };
    const added = logWindowSvc.appendChunkToState(state, '', 10);
    if (state.partialLine === 'partial' && state.lines.length === 1 && added === 0) {
      pass('T-ROT-02', 'linha parcial retida em appendChunk, não parseada prematuramente');
    } else fail('T-ROT-02', `partial=${state.partialLine} lines=${state.lines.length}`);
  }

  // T-ROT-03 completar linha parcial (unidade appendChunkToState)
  {
    const state = { partialLine: 'part', lines: ['a'], byteOffset: 0 };
    logWindowSvc.appendChunkToState(state, 'ial\nb\n', 10);
    if (state.lines.join('|') === 'a|partial|b' && state.partialLine === '') {
      pass('T-ROT-03', `linha completada: ${state.lines.join('|')}`);
    } else fail('T-ROT-03', state.lines.join('|'));
  }

  // T-ROT-04 truncate
  await withTempLog(async (fp) => {
    logWindowSvc.resetLogWindowState('t4');
    await fsp.writeFile(fp, 'long1\nlong2\nlong3\n');
    await logWindowSvc.acquireLogWindow(fp, 10, 't4');
    const stBefore = logWindowSvc.getLogWindowState('t4');
    await fsp.writeFile(fp, 'x\n');
    const r2 = await logWindowSvc.acquireLogWindow(fp, 10, 't4');
    if (r2.metrics.mode === 'FULL_REBUILD' && ['TRUNCATED', 'CONTENT_REPLACED'].includes(r2.metrics.reason)) {
      pass('T-ROT-04', `rebuild após truncate (${r2.metrics.reason}), lines=${r2.lines.join('|')}`);
    } else fail('T-ROT-04', JSON.stringify(r2.metrics));
    void stBefore;
  });

  // T-ROT-05 rename/create (simula rotação)
  await withTempLog(async (fp, dir) => {
    logWindowSvc.resetLogWindowState('t5');
    await fsp.writeFile(fp, 'old1\nold2\n');
    await logWindowSvc.acquireLogWindow(fp, 10, 't5');
    const oldStat = await fsp.stat(fp);
    await fsp.rename(fp, path.join(dir, 'test.log.1'));
    await fsp.writeFile(fp, 'new1\n');
    const newStat = await fsp.stat(fp);
    const r2 = await logWindowSvc.acquireLogWindow(fp, 10, 't5');
    if (oldStat.ino !== newStat.ino && r2.metrics.mode === 'FULL_REBUILD') {
      pass('T-ROT-05', `inode changed ${oldStat.ino}→${newStat.ino}, rebuild`);
    } else if (r2.metrics.mode === 'FULL_REBUILD' && r2.lines.join('|') === 'new1') {
      pass('T-ROT-05', `rotação detectada (${r2.metrics.reason}), rebuild com new1`);
    } else fail('T-ROT-05', JSON.stringify({ r2: r2.metrics, ino: [oldStat.ino, newStat.ino] }));
  });

  // T-ROT-06 substituição (unlink + create)
  await withTempLog(async (fp) => {
    logWindowSvc.resetLogWindowState('t6');
    await fsp.writeFile(fp, 'orig\n');
    await logWindowSvc.acquireLogWindow(fp, 10, 't6');
    const ino1 = (await fsp.stat(fp)).ino;
    await fsp.unlink(fp);
    await fsp.writeFile(fp, 'replacement\n');
    const ino2 = (await fsp.stat(fp)).ino;
    const r2 = await logWindowSvc.acquireLogWindow(fp, 10, 't6');
    if (ino1 !== ino2 && r2.metrics.mode === 'FULL_REBUILD' && r2.lines.join('|') === 'replacement') {
      pass('T-ROT-06', 'substituição detectada, sem continuidade presumida');
    } else if (ino1 === ino2 && r2.metrics.mode === 'FULL_REBUILD' && r2.metrics.reason === 'CONTENT_REPLACED' && r2.lines.join('|') === 'replacement') {
      pass('T-ROT-06', 'substituição (inode reutilizado) detectada via syncMarker');
    } else fail('T-ROT-06', `inos ${ino1}/${ino2} lines=${r2.lines}`);
  });

  // T-ROT-07 estado ausente
  await withTempLog(async (fp) => {
    logWindowSvc.resetLogWindowState('t7');
    await fsp.writeFile(fp, 'a\n');
    const r = await logWindowSvc.acquireLogWindow(fp, 10, 't7');
    if (r.metrics.mode === 'FULL_REBUILD' && r.metrics.reason === 'STATE_ABSENT') {
      pass('T-ROT-07', 'primeiro acesso = FULL_REBUILD STATE_ABSENT');
    } else fail('T-ROT-07', JSON.stringify(r.metrics));
  });

  // T-ROT-08 estado inválido (corrompido manualmente)
  await withTempLog(async (fp) => {
    logWindowSvc.resetLogWindowState('t8');
    await fsp.writeFile(fp, 'a\n');
    logWindowSvc.setLogWindowState('t8', {
      dev: 0,
      ino: 999999999,
      byteOffset: 999999,
      partialLine: '',
      lines: ['ghost']
    });
    const r = await logWindowSvc.acquireLogWindow(fp, 10, 't8');
    if (r.metrics.mode === 'FULL_REBUILD') {
      pass('T-ROT-08', `estado inválido → rebuild (${r.metrics.reason})`);
    } else fail('T-ROT-08', JSON.stringify(r.metrics));
  });

  // T-ROT-09 múltiplos appends
  await withTempLog(async (fp) => {
    logWindowSvc.resetLogWindowState('t9');
    await fsp.writeFile(fp, '');
    let totalNew = 0;
    for (let i = 1; i <= 5; i++) {
      await fsp.appendFile(fp, `ev${i}\n`);
      const r = await logWindowSvc.acquireLogWindow(fp, 20, 't9');
      if (r.metrics.mode === 'INCREMENTAL') totalNew += r.metrics.new_lines;
      else totalNew += i === 1 ? r.metrics.new_lines : 0;
    }
    const final = await logWindowSvc.acquireLogWindow(fp, 20, 't9');
    if (final.lines.length === 5 && totalNew === 5) {
      pass('T-ROT-09', '5 appends, 5 linhas, sem perda/duplicação');
    } else fail('T-ROT-09', `lines=${final.lines.length} totalNew=${totalNew}`);
  });

  // T-ROT-10 janela excede limite
  await withTempLog(async (fp) => {
    logWindowSvc.resetLogWindowState('t10');
    const max = 5;
    let content = '';
    for (let i = 1; i <= 8; i++) content += `L${i}\n`;
    await fsp.writeFile(fp, content);
    const r = await logWindowSvc.acquireLogWindow(fp, max, 't10');
    const expected = ['L4', 'L5', 'L6', 'L7', 'L8'];
    if (r.lines.length === max && r.lines.join('|') === expected.join('|')) {
      pass('T-ROT-10', `janela=${max}, expulsou L1-L3: ${r.lines.join('|')}`);
    } else fail('T-ROT-10', `got ${r.lines.join('|')} expected ${expected.join('|')}`);
  });

  const fails = results.filter((r) => r.result === 'FAIL');
  console.log(`\n=== T-ROT: ${results.length - fails.length}/${results.length} PASS ===`);
  if (fails.length) process.exit(1);
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
