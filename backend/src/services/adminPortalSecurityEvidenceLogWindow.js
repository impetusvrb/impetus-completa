'use strict';

/**
 * SEC-VISUAL-INTELLIGENCE-001F — Janela incremental de logs (acelerador derivado).
 * Evidência primária: ficheiros de log. Estado em memória, invalidável, rebuild integral fail-safe.
 */

const fs = require('fs');
const fsp = require('fs/promises');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/** @type {Map<string, LogWindowState|null>} */
const windowByKey = new Map();

/**
 * @typedef {object} LogWindowState
 * @property {number} dev
 * @property {number} ino
 * @property {number} byteOffset
 * @property {string} partialLine
 * @property {string[]} lines
 * @property {string} syncMarker — primeiros bytes no último sync (detecta substituição/rotação)
 * @property {boolean} syncEndsWithNewline
 */

const SYNC_MARKER_BYTES = 64;

async function readFileHead(filePath, maxBytes = SYNC_MARKER_BYTES) {
  try {
    const stat = await fsp.stat(filePath);
    if (stat.size === 0) {
      return { marker: '', markerLen: 0, endsWithNewline: true, stat };
    }
    const len = Math.min(maxBytes, stat.size);
    const fh = await fsp.open(filePath, 'r');
    try {
      const buf = Buffer.alloc(len);
      await fh.read(buf, 0, len, 0);
      const last = Buffer.alloc(1);
      await fh.read(last, 0, 1, stat.size - 1);
      return {
        marker: buf.toString('utf8'),
        markerLen: len,
        endsWithNewline: last[0] === 0x0a,
        stat
      };
    } finally {
      await fh.close();
    }
  } catch {
    return { marker: '', markerLen: 0, endsWithNewline: true, stat: null };
  }
}

function headMarkerMatches(prev, head) {
  if (!prev?.syncMarker || !head?.marker) return true;
  const compareLen = Math.min(prev.markerLen || 0, head.markerLen || 0, SYNC_MARKER_BYTES);
  if (compareLen === 0) return true;
  return prev.syncMarker.slice(0, compareLen) === head.marker.slice(0, compareLen);
}

/**
 * @typedef {object} AcquireMetrics
 * @property {'FULL_REBUILD'|'INCREMENTAL'} mode
 * @property {string|null} reason
 * @property {number} new_bytes
 * @property {number} new_lines
 * @property {number} window_size
 */

async function tailFile(filePath, maxLines) {
  try {
    await fsp.access(filePath, fs.constants.R_OK);
  } catch {
    return [];
  }
  try {
    const { stdout } = await execFileAsync('tail', ['-n', String(maxLines), filePath], {
      timeout: 12_000,
      maxBuffer: 4 * 1024 * 1024
    });
    return String(stdout || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function trimWindow(lines, maxLines) {
  if (lines.length <= maxLines) return lines;
  return lines.slice(-maxLines);
}

/**
 * Processa bytes novos respeitando linha parcial pendente.
 * @returns {number} linhas completas adicionadas
 */
function appendChunkToState(state, chunk, maxLines) {
  const combined = state.partialLine + chunk;
  const endsWithNewline = combined.endsWith('\n');
  const rawParts = combined.split('\n');

  if (!endsWithNewline) {
    state.partialLine = rawParts.pop() || '';
  } else {
    state.partialLine = '';
  }

  const newLines = rawParts.map((l) => l.trim()).filter(Boolean);
  if (newLines.length === 0) return 0;

  state.lines.push(...newLines);
  state.lines = trimWindow(state.lines, maxLines);
  return newLines.length;
}

function updateByteOffset(state, fileSize) {
  if (state.partialLine) {
    state.byteOffset = fileSize - Buffer.byteLength(state.partialLine, 'utf8');
  } else {
    state.byteOffset = fileSize;
  }
}

function classifyInvalidReason(prev, stat) {
  if (!prev) return 'STATE_ABSENT';
  if (prev.dev !== stat.dev || prev.ino !== stat.ino) return 'INODE_CHANGED';
  if (stat.size < prev.byteOffset) return 'TRUNCATED';
  return 'AMBIGUOUS';
}

function canIncremental(prev, stat, head) {
  if (!prev) return false;
  if (prev.dev !== stat.dev || prev.ino !== stat.ino) return false;
  if (stat.size < prev.byteOffset) return false;
  if (!prev.syncEndsWithNewline) return false;
  if (!headMarkerMatches(prev, head)) return false;
  return true;
}

async function readBytesFromOffset(filePath, offset, length) {
  if (length <= 0) return '';
  const fh = await fsp.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(length);
    const { bytesRead } = await fh.read(buf, 0, length, offset);
    return buf.subarray(0, bytesRead).toString('utf8');
  } finally {
    await fh.close();
  }
}

/**
 * Aquisição canónica de janela móvel por linhas.
 * @param {string} filePath
 * @param {number} maxLines
 * @param {string} stateKey
 * @returns {Promise<{ lines: string[], metrics: AcquireMetrics }>}
 */
async function acquireLogWindow(filePath, maxLines, stateKey) {
  /** @type {AcquireMetrics} */
  const metrics = {
    mode: 'FULL_REBUILD',
    reason: 'STATE_ABSENT',
    new_bytes: 0,
    new_lines: 0,
    window_size: 0
  };

  const prev = windowByKey.get(stateKey) || null;
  const head = await readFileHead(filePath);
  const stat = head.stat;
  if (!stat) {
    windowByKey.set(stateKey, null);
    return { lines: [], metrics: { ...metrics, reason: 'FILE_UNAVAILABLE' } };
  }

  if (canIncremental(prev, stat, head)) {
    const unread = stat.size - prev.byteOffset;
    if (unread > 0) {
      const chunk = await readBytesFromOffset(filePath, prev.byteOffset, unread);
      metrics.new_bytes = unread;
      metrics.new_lines = appendChunkToState(prev, chunk, maxLines);
      updateByteOffset(prev, stat.size);
    }
    metrics.mode = 'INCREMENTAL';
    metrics.reason = unread > 0 ? null : 'NO_NEW_BYTES';
    metrics.window_size = prev.lines.length;
    windowByKey.set(stateKey, prev);
    return { lines: [...prev.lines], metrics };
  }

  const reason = classifyInvalidReason(prev, stat);
  if (prev && !headMarkerMatches(prev, head)) {
    metrics.reason = 'CONTENT_REPLACED';
  } else {
    metrics.reason = reason;
  }
  const lines = await tailFile(filePath, maxLines);
  /** @type {LogWindowState} */
  const fresh = {
    dev: stat.dev,
    ino: stat.ino,
    byteOffset: stat.size,
    partialLine: '',
    lines: trimWindow([...lines], maxLines),
    syncMarker: head.marker,
    markerLen: head.markerLen,
    syncEndsWithNewline: head.endsWithNewline
  };
  windowByKey.set(stateKey, fresh);

  metrics.mode = 'FULL_REBUILD';
  metrics.new_bytes = stat.size;
  metrics.new_lines = lines.length;
  metrics.window_size = fresh.lines.length;
  return { lines: [...fresh.lines], metrics };
}

/** Rebuild integral via tail — caminho legado para prova de equivalência. */
async function acquireLogWindowLegacy(filePath, maxLines) {
  const lines = await tailFile(filePath, maxLines);
  return {
    lines,
    metrics: {
      mode: 'FULL_REBUILD',
      reason: 'LEGACY_PATH',
      new_bytes: 0,
      new_lines: lines.length,
      window_size: lines.length
    }
  };
}

function resetLogWindowState(stateKey) {
  if (stateKey) windowByKey.delete(stateKey);
  else windowByKey.clear();
}

function getLogWindowState(stateKey) {
  const s = windowByKey.get(stateKey);
  return s ? { ...s, lines: [...s.lines] } : null;
}

function setLogWindowState(stateKey, state) {
  windowByKey.set(stateKey, state ? { ...state, lines: [...state.lines] } : null);
}

module.exports = {
  acquireLogWindow,
  acquireLogWindowLegacy,
  resetLogWindowState,
  getLogWindowState,
  setLogWindowState,
  appendChunkToState,
  trimWindow,
  tailFile
};
