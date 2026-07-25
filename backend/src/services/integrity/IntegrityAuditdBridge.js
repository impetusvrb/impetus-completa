'use strict';
/**
 * IntegrityAuditdBridge — INT-01B
 * Consome /var/log/audit/audit.log via polling com persistência de offset.
 * Filtra por chaves impetus_*. Emite eventos normalizados ao EventBus.
 * Sem criar novas regras auditd nesta fase.
 */

const fs   = require('fs');
const path = require('path');

const AUDIT_LOG     = process.env.INTEGRITY_AUDIT_LOG || '/var/log/audit/audit.log';
const POLL_INTERVAL = 5000; // 5s

// Chaves auditd que nos interessam
const IMPETUS_KEYS = new Set([
  'impetus_repo_write',
  'impetus_delete',
  'impetus_env',
  'impetus_exec_rm',
  'impetus_exec_rsync',
  'impetus_exec_git',
  'impetus_root_exec',
  'impetus_nginx_config',
  'impetus_fail2ban_config',
  'impetus_tls_config',
  'impetus_audit_config',
  'impetus_bin_write',
  'impetus_cron_config',
  'impetus_integrity_baseline',
]);

// Mapeamento de chave auditd → tipo de evento de integridade
const KEY_TO_EVENT = {
  impetus_delete:              'INTEGRITY_FILE_DELETED',
  impetus_env:                 'INTEGRITY_ENV_CHANGED',
  impetus_repo_write:          'INTEGRITY_HASH_CHANGED',
  impetus_nginx_config:        'INTEGRITY_HASH_CHANGED',
  impetus_fail2ban_config:     'INTEGRITY_HASH_CHANGED',
  impetus_tls_config:          'INTEGRITY_CERT_CHANGED',
  impetus_audit_config:        'INTEGRITY_HASH_CHANGED',
  impetus_bin_write:           'INTEGRITY_SCRIPT_CHANGED',
  impetus_cron_config:         'INTEGRITY_HASH_CHANGED',
  impetus_integrity_baseline:  'INTEGRITY_HASH_CHANGED',
  impetus_exec_rm:             'INTEGRITY_ANOMALY',
  impetus_exec_rsync:          'INTEGRITY_ANOMALY',
  impetus_exec_git:            'INTEGRITY_ANOMALY',
  impetus_root_exec:           'INTEGRITY_ANOMALY',
};

const KEY_SEVERITY = {
  impetus_delete:          'CRITICAL',
  impetus_env:             'CRITICAL',
  impetus_tls_config:      'CRITICAL',
  impetus_integrity_baseline: 'CRITICAL',
  impetus_repo_write:      'HIGH',
  impetus_nginx_config:    'CRITICAL',
  impetus_fail2ban_config: 'CRITICAL',
  impetus_audit_config:    'CRITICAL',
  impetus_bin_write:       'HIGH',
  impetus_cron_config:     'HIGH',
  impetus_exec_rm:         'MEDIUM',
  impetus_exec_rsync:      'MEDIUM',
  impetus_exec_git:        'LOW',
  impetus_root_exec:       'LOW',
};

class IntegrityAuditdBridge {
  constructor(eventBus, options = {}) {
    this._bus        = eventBus;
    this._offset     = 0;
    this._timer      = null;
    this._running    = false;
    this._stats      = { polls: 0, records_read: 0, events_emitted: 0, errors: 0 };
    this._pendingRecords = new Map(); // seq → { syscall, path, key, uid, pid, timestamp }
  }

  start() {
    if (this._running) return;
    if (!fs.existsSync(AUDIT_LOG)) {
      // audit.log não disponível — iniciar em modo degradado silencioso
      this._stats.errors++;
      return;
    }
    this._running = true;
    // Posicionar no fim do log actual (não processar histórico)
    try {
      this._offset = fs.statSync(AUDIT_LOG).size;
    } catch { this._offset = 0; }

    this._timer = setInterval(() => this._poll(), POLL_INTERVAL);
  }

  stop() {
    this._running = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  getStats() { return { ...this._stats }; }

  _poll() {
    this._stats.polls++;
    try {
      const stat = fs.statSync(AUDIT_LOG);
      if (stat.size < this._offset) {
        // Log foi rotacionado — reiniciar do início
        this._offset = 0;
      }
      if (stat.size === this._offset) return; // Sem novos dados

      const fd = fs.openSync(AUDIT_LOG, 'r');
      const bytesToRead = stat.size - this._offset;
      const buf = Buffer.allocUnsafe(bytesToRead);
      const bytesRead = fs.readSync(fd, buf, 0, bytesToRead, this._offset);
      fs.closeSync(fd);

      if (bytesRead > 0) {
        this._offset += bytesRead;
        const chunk = buf.slice(0, bytesRead).toString('utf8');
        this._processChunk(chunk);
      }
    } catch (e) {
      this._stats.errors++;
    }
  }

  _processChunk(chunk) {
    const lines = chunk.split('\n').filter(l => l.trim());
    for (const line of lines) {
      this._stats.records_read++;
      this._parseLine(line);
    }
  }

  _parseLine(line) {
    // Extrair tipo e sequência
    const typeMatch = line.match(/^type=(\w+)/);
    const seqMatch  = line.match(/msg=audit\([\d.]+:(\d+)\)/);
    if (!typeMatch || !seqMatch) return;

    const type = typeMatch[1];
    const seq  = seqMatch[1];

    if (type === 'SYSCALL') {
      const keyMatch = line.match(/\bkey="([^"]+)"/);
      if (!keyMatch) return;
      const key = keyMatch[1];
      if (!IMPETUS_KEYS.has(key)) return;

      const tsMatch  = line.match(/msg=audit\(([\d.]+):\d+\)/);
      const uidMatch = line.match(/\buid=(\d+)\b/);
      const pidMatch = line.match(/\bpid=(\d+)\b/);

      this._pendingRecords.set(seq, {
        key,
        timestamp: tsMatch ? parseFloat(tsMatch[1]) : Date.now() / 1000,
        uid:       uidMatch ? parseInt(uidMatch[1], 10) : null,
        pid:       pidMatch ? parseInt(pidMatch[1], 10) : null,
        paths:     [],
      });

    } else if (type === 'PATH') {
      const rec = this._pendingRecords.get(seq);
      if (!rec) return;

      const nameMatch = line.match(/\bname="([^"]+)"/);
      if (nameMatch) rec.paths.push(nameMatch[1]);

    } else if (type === 'EOE') {
      // End of Event — emitir e limpar
      const rec = this._pendingRecords.get(seq);
      if (rec) {
        this._pendingRecords.delete(seq);
        this._emitFromRecord(rec);
      }
    }

    // Limpeza de registos pendentes antigos (sem EOE)
    if (this._pendingRecords.size > 500) {
      const keys = [...this._pendingRecords.keys()].slice(0, 100);
      for (const k of keys) {
        const r = this._pendingRecords.get(k);
        if (r) this._emitFromRecord(r);
        this._pendingRecords.delete(k);
      }
    }
  }

  _emitFromRecord(rec) {
    if (!rec.key || !IMPETUS_KEYS.has(rec.key)) return;

    // Filtrar paths relevantes (ignora caminhos temporários e duplicados)
    const relevantPaths = rec.paths.filter(p =>
      p && p !== '(null)' && !p.includes('/proc/') && !p.includes('/sys/')
    );

    const primaryPath = relevantPaths[0] || '(unknown)';
    const eventType   = KEY_TO_EVENT[rec.key] || 'INTEGRITY_ANOMALY';
    const severity    = KEY_SEVERITY[rec.key]  || 'LOW';

    this._stats.events_emitted++;
    this._bus.emit({
      event_type:       eventType,
      severity,
      asset_path:       primaryPath,
      asset_id:         null, // será resolvido pelo CorrelationEngine
      asset_criticality: null,
      sensor_component: 'AuditdBridge',
      auditd_key:       rec.key,
      auditd_uid:       rec.uid,
      auditd_pid:       rec.pid,
      all_paths:        relevantPaths,
      detail:           `auditd key=${rec.key} paths=[${relevantPaths.join(', ')}]`,
      confidence:       'HIGH',
    });
  }
}

module.exports = IntegrityAuditdBridge;
