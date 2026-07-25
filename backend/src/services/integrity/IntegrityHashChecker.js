'use strict';
/**
 * IntegrityHashChecker — INT-01B
 * Stat-first SHA256 diferencial: re-hash só quando mtime mudou.
 * Emite eventos ao IntegrityEventBus quando hash diverge do baseline.
 */

const fs     = require('fs');
const crypto = require('crypto');

class IntegrityHashChecker {
  /**
   * @param {IntegrityEventBus} eventBus
   * @param {IntegrityBaselineManager} baselineManager
   * @param {object} options
   */
  constructor(eventBus, baselineManager, options = {}) {
    this._bus      = eventBus;
    this._bm       = baselineManager;
    this._interval = parseInt(process.env.INTEGRITY_HASH_CHECK_INTERVAL || '300', 10) * 1000;
    this._timer    = null;
    this._running  = false;
    this._lastMtimes = new Map(); // path → last known mtime_unix
    this._stats    = { checks: 0, hashes_computed: 0, violations: 0, errors: 0 };

    // Inicializa lastMtimes a partir do baseline (para não fazer hash na primeira run se não mudou)
    for (const asset of baselineManager.getAllAssets()) {
      if (asset.monitor_hash) {
        this._lastMtimes.set(asset.path, asset.mtime_unix || 0);
      }
    }
  }

  start() {
    if (this._running) return;
    this._running = true;
    // Primeira execução imediata após um pequeno delay de startup
    setTimeout(() => this._checkAll(), 2000);
    this._timer = setInterval(() => this._checkAll(), this._interval);
  }

  stop() {
    this._running = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  getStats() { return { ...this._stats }; }

  async _checkAll() {
    const assets = this._bm.getAllAssets().filter(a => a.monitor_hash);
    this._stats.checks++;

    for (const asset of assets) {
      try {
        await this._checkAsset(asset);
      } catch (e) {
        this._stats.errors++;
        this._bus.emit({
          event_type:       'INTEGRITY_ANOMALY',
          severity:         'MEDIUM',
          asset_path:       asset.path,
          asset_id:         asset.id,
          asset_criticality: asset.criticality,
          sensor_component: 'HashChecker',
          detail:           `erro ao verificar hash: ${e.message}`,
          confidence:       'LOW',
        });
      }
    }
  }

  async _checkAsset(asset) {
    const effectivePath = asset.canonical_path || asset.path;

    if (!fs.existsSync(effectivePath)) {
      this._bus.emit({
        event_type:       'INTEGRITY_FILE_DELETED',
        severity:         asset.criticality === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        asset_path:       asset.path,
        asset_id:         asset.id,
        asset_criticality: asset.criticality,
        sensor_component: 'HashChecker',
        detail:           `ficheiro ausente: ${effectivePath}`,
        confidence:       'HIGH',
      });
      return;
    }

    // Baseline ausente para este activo
    if (!asset.sha256) {
      this._bus.emit({
        event_type:       'INTEGRITY_BASELINE_MISSING',
        severity:         'HIGH',
        asset_path:       asset.path,
        asset_id:         asset.id,
        asset_criticality: asset.criticality,
        sensor_component: 'HashChecker',
        detail:           'activo não possui entrada no baseline',
        confidence:       'HIGH',
      });
      return;
    }

    // Stat-first: só re-calcula SHA256 se mtime mudou
    const stat = fs.statSync(effectivePath);
    const currentMtime = Math.floor(stat.mtimeMs / 1000);
    const lastMtime    = this._lastMtimes.get(asset.path) || 0;

    if (currentMtime === lastMtime) {
      return; // Sem mudança de mtime — hash não pode ter mudado
    }

    // mtime mudou — calcular SHA256
    this._stats.hashes_computed++;
    const currentHash = computeFileSha256(effectivePath);

    // Actualizar mtime independentemente do resultado
    this._lastMtimes.set(asset.path, currentMtime);

    if (currentHash !== asset.sha256) {
      this._stats.violations++;
      this._bus.emit({
        event_type:       'INTEGRITY_HASH_CHANGED',
        severity:         asset.criticality === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        asset_path:       asset.path,
        asset_id:         asset.id,
        asset_criticality: asset.criticality,
        sensor_component: 'HashChecker',
        hash_algorithm:   'SHA256',
        hash_previous:    asset.sha256,
        hash_current:     currentHash,
        detail:           `hash SHA256 diverge do baseline (mtime: ${lastMtime} → ${currentMtime})`,
        confidence:       'HIGH',
      });
    }
  }
}

function computeFileSha256(filePath) {
  const hash   = crypto.createHash('sha256');
  const buffer = fs.readFileSync(filePath);
  hash.update(buffer);
  return hash.digest('hex');
}

// Exporta a função utilitária para uso nos testes
IntegrityHashChecker.computeFileSha256 = computeFileSha256;

module.exports = IntegrityHashChecker;
