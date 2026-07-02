'use strict';

const fs = require('fs');
const path = require('path');
const flags = require('../config/sz2FeatureFlags');
const { applyRetention } = require('./zOperationalMemoryRetention');
const { buildIndex } = require('./zContextualMemoryIndex');

/**
 * zOperationalMemoryRuntime — kernel da memória operacional tenant-isolated.
 *
 *  - In-memory Map por tenant_id
 *  - Persistência opcional (file-based) em backend/data/cognitive-os-memory/
 *  - Retention (TTL + cap)
 *  - Nunca lança: degrada para no-op
 *
 * IMPORTANTE: NÃO substitui DB. É um buffer cognitivo de curto prazo.
 */

const _store = new Map();
const { dataSubdir } = require('../../config/impetusHome');
const _DATA_DIR = dataSubdir('cognitive-os-memory');

function _safeMkdir() {
  if (!flags.isPersistenceEnabled()) return;
  try {
    fs.mkdirSync(_DATA_DIR, { recursive: true });
  } catch (_) {}
}

function _filePath(tenantId) {
  return path.join(_DATA_DIR, `${String(tenantId).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
}

function _loadFromDisk(tenantId) {
  if (!flags.isPersistenceEnabled()) return null;
  try {
    const fp = _filePath(tenantId);
    if (!fs.existsSync(fp)) return null;
    const raw = fs.readFileSync(fp, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data?.entries) ? data.entries : null;
  } catch (_) {
    return null;
  }
}

function _saveToDisk(tenantId, entries) {
  if (!flags.isPersistenceEnabled()) return;
  try {
    _safeMkdir();
    fs.writeFileSync(
      _filePath(tenantId),
      JSON.stringify({ tenant_id: tenantId, updated_at: new Date().toISOString(), entries }, null, 2),
      'utf8'
    );
  } catch (_) {}
}

function _ensure(tenantId) {
  if (!_store.has(tenantId)) {
    const fromDisk = _loadFromDisk(tenantId) || [];
    _store.set(tenantId, fromDisk);
  }
  return _store.get(tenantId);
}

function record(tenantId, entry = {}) {
  if (!flags.isMemoryEnabled()) return { recorded: false };
  if (!tenantId) return { recorded: false, reason: 'tenant_required' };
  const normalized = {
    id: entry.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts: entry.ts || Date.now(),
    type: entry.type || 'generic',
    user_id: entry.user_id || null,
    summary: entry.summary || '',
    intent: entry.intent || null,
    payload: entry.payload || null,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    domain: entry.domain || null,
    correlation_id: entry.correlation_id || null,
    source: entry.source || 'sz2'
  };
  const arr = _ensure(tenantId);
  arr.push(normalized);
  const pruned = applyRetention(arr);
  _store.set(tenantId, pruned);
  _saveToDisk(tenantId, pruned);
  return { recorded: true, entry: normalized, size: pruned.length };
}

function list(tenantId, opts = {}) {
  if (!flags.isMemoryEnabled()) return [];
  if (!tenantId) return [];
  const arr = applyRetention(_ensure(tenantId));
  if (opts.type) return arr.filter((e) => e.type === opts.type);
  return arr;
}

function index(tenantId) {
  return buildIndex(list(tenantId));
}

function size(tenantId) {
  return list(tenantId).length;
}

function clear(tenantId) {
  if (!tenantId) return;
  _store.set(tenantId, []);
  _saveToDisk(tenantId, []);
}

function snapshot() {
  const out = {};
  for (const [tenant, arr] of _store.entries()) {
    out[tenant] = arr.length;
  }
  return out;
}

module.exports = { record, list, index, size, clear, snapshot };
