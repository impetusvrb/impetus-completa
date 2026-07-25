'use strict';
/**
 * IntegrityStateStore — INT-01C
 * Gerencia state.json (atômico) e events.jsonl (append-only).
 * Nenhum consumidor externo nesta fase — telemetria interna apenas.
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const STATE_DIR   = process.env.INTEGRITY_STATE_DIR || '/var/lib/impetus/integrity';
const STATE_FILE  = path.join(STATE_DIR, 'state.json');
const EVENTS_FILE = path.join(STATE_DIR, 'events.jsonl');
const EVENTS_MAX_BYTES = parseInt(process.env.INTEGRITY_EVENTS_MAX_MB  || '50', 10) * 1024 * 1024;
const EVENTS_ROTATE_DAYS = parseInt(process.env.INTEGRITY_EVENTS_RETAIN_DAYS || '30', 10);

class IntegrityStateStore {
  constructor() {
    this._state       = null;
    this._eventsBytes = 0;
    this._stats       = { writes: 0, appends: 0, rotations: 0, errors: 0 };
  }

  /** Inicializa o directório e o estado inicial. */
  init(initialState = {}) {
    try {
      fs.mkdirSync(STATE_DIR, { recursive: true });
      fs.chmodSync(STATE_DIR, 0o700);
    } catch { /* já existe */ }

    this._state = {
      schema_version:      '1.0',
      sensor_active:       false,
      sensor_started_at:   null,
      last_check:          null,
      last_hash_check:     null,
      last_perm_check:     null,
      mode:                'STOPPED',
      baseline_id:         null,
      baseline_version:    null,
      assets_monitored:    0,
      ok:                  true,
      violations:          0,
      violations_last_24h: 0,
      active_violations:   [],
      last_event:          null,
      stats: {
        hash_checks:       0,
        perm_checks:       0,
        events_produced:   0,
        events_suppressed: 0,
        events_persisted:  0,
        errors:            0,
      },
      metrics: {
        avg_hash_ms:       0,
        avg_scan_ms:       0,
        avg_correlation_ms: 0,
        heap_mb:           0,
        queue_size:        0,
      },
      last_error: null,
      ...initialState,
    };

    // Se já existir state.json, tentar carregar para continuidade
    if (fs.existsSync(STATE_FILE)) {
      try {
        const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        // Preservar stats históricos
        this._state.stats.hash_checks     = saved.stats?.hash_checks     || 0;
        this._state.stats.perm_checks     = saved.stats?.perm_checks     || 0;
        this._state.stats.events_produced = saved.stats?.events_produced || 0;
      } catch { /* começa do zero se corrompido */ }
    }

    // Rastrear tamanho actual do events.jsonl
    if (fs.existsSync(EVENTS_FILE)) {
      try { this._eventsBytes = fs.statSync(EVENTS_FILE).size; } catch { this._eventsBytes = 0; }
    }

    this._writeState();
  }

  /** Actualiza campos do estado e persiste atomicamente. */
  update(patch) {
    if (!this._state) return;

    // Merge plano (campos de topo) e stats aninhados
    if (patch.stats) {
      Object.assign(this._state.stats, patch.stats);
      delete patch.stats;
    }
    if (patch.metrics) {
      Object.assign(this._state.metrics, patch.metrics);
      delete patch.metrics;
    }
    Object.assign(this._state, patch);
    this._state.last_check = new Date().toISOString();

    this._writeState();
  }

  /** Persiste um evento de integridade no events.jsonl. */
  appendEvent(event) {
    try {
      const line = JSON.stringify(event) + '\n';
      const lineBytes = Buffer.byteLength(line, 'utf8');

      // Rotação por tamanho
      if (this._eventsBytes + lineBytes > EVENTS_MAX_BYTES) {
        this._rotateEvents();
      }

      fs.appendFileSync(EVENTS_FILE, line, 'utf8');
      this._eventsBytes += lineBytes;
      this._stats.appends++;

      // Actualizar contador no state
      if (this._state) {
        this._state.stats.events_persisted++;
        this._state.last_event = {
          event_id:   event.event_id,
          event_type: event.event_type,
          asset_path: event.asset_path,
          severity:   event.severity_final || event.severity,
          timestamp:  event.timestamp,
        };
        this._writeState();
      }
    } catch (e) {
      this._stats.errors++;
    }
  }

  /** Lê o estado actual (para consumo externo em INT-01D). */
  getState() {
    return this._state ? { ...this._state } : null;
  }

  /** Lê o state.json do disco (para funções externas como getIntegrityState()). */
  static readStateFile() {
    try {
      if (!fs.existsSync(STATE_FILE)) return { sensor_active: false, reason: 'state_file_missing' };
      const raw  = fs.readFileSync(STATE_FILE, 'utf8');
      const data = JSON.parse(raw);

      // Verificar staleness
      const maxAge = 2 * parseInt(process.env.INTEGRITY_HASH_CHECK_INTERVAL || '300', 10) * 1000;
      if (data.last_check) {
        const age = Date.now() - new Date(data.last_check).getTime();
        if (age > maxAge) return { ...data, sensor_active: false, stale: true };
      }
      return data;
    } catch {
      return { sensor_active: false, error: true };
    }
  }

  getStoreStats() { return { ...this._stats }; }

  // ── internos ─────────────────────────────────────────────────────────────

  _writeState() {
    if (!this._state) return;
    const tmp = STATE_FILE + '.tmp';
    try {
      fs.writeFileSync(tmp, JSON.stringify(this._state, null, 2), 'utf8');
      fs.renameSync(tmp, STATE_FILE); // atomic rename
      this._stats.writes++;
    } catch (e) {
      this._stats.errors++;
      try { fs.unlinkSync(tmp); } catch { /* cleanup tmp */ }
    }
  }

  _rotateEvents() {
    const ts  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dst = path.join(STATE_DIR, `baseline_history/events.${ts}.jsonl`);
    try {
      fs.renameSync(EVENTS_FILE, dst);
      this._eventsBytes = 0;
      this._stats.rotations++;
      this._cleanOldRotations();
    } catch { /* se falhar, continua a escrever no mesmo ficheiro */ }
  }

  _cleanOldRotations() {
    try {
      const histDir = path.join(STATE_DIR, 'baseline_history');
      const cutoff  = Date.now() - EVENTS_ROTATE_DAYS * 86400 * 1000;
      for (const f of fs.readdirSync(histDir)) {
        if (!f.startsWith('events.')) continue;
        const fp = path.join(histDir, f);
        if (fs.statSync(fp).mtimeMs < cutoff) fs.unlinkSync(fp);
      }
    } catch { /* limpeza não é crítica */ }
  }
}

// Singleton usado pela CorrelationEngine e Engine
let _instance = null;
function getInstance() {
  if (!_instance) _instance = new IntegrityStateStore();
  return _instance;
}

IntegrityStateStore.getInstance = getInstance;
IntegrityStateStore.STATE_FILE  = STATE_FILE;
IntegrityStateStore.EVENTS_FILE = EVENTS_FILE;

/** Reset do singleton — apenas para testes isolados. Não usar em produção. */
IntegrityStateStore._resetForTest = function() { _instance = null; };

module.exports = IntegrityStateStore;
