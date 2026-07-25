'use strict';
/**
 * IntegrityBaselineManager — INT-01B
 * Lê e valida baseline.json e asset_inventory.json.
 * READ-ONLY: nunca sobrescreve automaticamente.
 */

const fs   = require('fs');
const path = require('path');

const BASELINE_SCHEMA_VERSION = '1.0';

class IntegrityBaselineManager {
  constructor(options = {}) {
    const integrityDir = options.integrityDir ||
      path.join(__dirname, '../../../security/integrity');
    this._baselinePath   = path.join(integrityDir, 'baseline.json');
    this._inventoryPath  = path.join(integrityDir, 'asset_inventory.json');
    this._baseline   = null;
    this._inventory  = null;
    this._loadedAt   = null;
  }

  load() {
    this._baseline  = this._loadJson(this._baselinePath, 'baseline');
    this._inventory = this._loadJson(this._inventoryPath, 'inventory');
    this._validate();
    this._loadedAt = new Date().toISOString();
    return this;
  }

  isValid() {
    try { this._validate(); return true; } catch { return false; }
  }

  /** Devolve entrada completa do baseline para um path absoluto. */
  getAssetByPath(assetPath) {
    if (!this._baseline) return null;
    for (const criticality of ['CRITICAL', 'HIGH', 'MEDIUM']) {
      const group = this._baseline.assets[criticality];
      if (!group) continue;
      for (const [id, entry] of Object.entries(group)) {
        if (entry.path === assetPath || entry.canonical_path === assetPath) {
          return { id, criticality, ...entry };
        }
      }
    }
    return null;
  }

  /** Devolve todos os activos monitorados com hash e inventário unidos. */
  getAllAssets() {
    const result = [];
    if (!this._baseline || !this._inventory) return result;

    const inventoryMap = this._buildInventoryMap();

    for (const criticality of ['CRITICAL', 'HIGH', 'MEDIUM']) {
      const bGroup = this._baseline.assets[criticality];
      if (!bGroup) continue;
      for (const [id, bEntry] of Object.entries(bGroup)) {
        const inv = inventoryMap[id] || {};
        result.push({
          id,
          criticality,
          path: bEntry.path,
          canonical_path: bEntry.canonical_path || null,
          sha256: bEntry.sha256,
          size_bytes: bEntry.size_bytes,
          mtime_unix: bEntry.mtime_unix,
          perm: bEntry.perm,
          owner: bEntry.owner,
          group: bEntry.group,
          is_symlink: bEntry.is_symlink || false,
          monitor_hash:  inv.monitor_hash  !== false,
          monitor_perm:  inv.monitor_perm  !== false,
          monitor_owner: inv.monitor_owner !== false,
          expected_perm:  inv.expected_perm  || bEntry.perm,
          expected_owner: inv.expected_owner || bEntry.owner,
          auditd_key: inv.auditd_key || null,
          note: bEntry.note || null,
        });
      }
    }
    return result;
  }

  getHealth() {
    const assets = this._baseline
      ? Object.values(this._baseline.assets).flatMap(g => Object.values(g))
      : [];
    const createdAt = this._baseline ? new Date(this._baseline.created_at) : null;
    const ageDays   = createdAt
      ? Math.floor((Date.now() - createdAt.getTime()) / 86400000)
      : null;
    return {
      baseline_exists:   fs.existsSync(this._baselinePath),
      baseline_valid:    this.isValid(),
      baseline_id:       this._baseline ? this._baseline.baseline_id : null,
      created_at:        this._baseline ? this._baseline.created_at : null,
      age_days:          ageDays,
      assets_total:      assets.length,
      assets_critical:   Object.keys(this._baseline?.assets?.CRITICAL || {}).length,
      assets_high:       Object.keys(this._baseline?.assets?.HIGH     || {}).length,
      assets_medium:     Object.keys(this._baseline?.assets?.MEDIUM   || {}).length,
      staleness_warning: ageDays !== null && ageDays > 90,
    };
  }

  // ── internals ────────────────────────────────────────────────────────────
  _loadJson(filePath, label) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`IntegrityBaselineManager: ${label} não encontrado em ${filePath}`);
    }
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      throw new Error(`IntegrityBaselineManager: ${label} corrompido — ${e.message}`);
    }
  }

  _validate() {
    if (!this._baseline) throw new Error('baseline não carregado');
    if (this._baseline.schema_version !== BASELINE_SCHEMA_VERSION) {
      throw new Error(`baseline schema_version incompatível: ${this._baseline.schema_version}`);
    }
    if (!this._baseline.assets || typeof this._baseline.assets !== 'object') {
      throw new Error('baseline.assets ausente ou inválido');
    }
    if (!this._baseline.assets.CRITICAL || Object.keys(this._baseline.assets.CRITICAL).length === 0) {
      throw new Error('baseline não contém activos CRITICAL');
    }
  }

  _buildInventoryMap() {
    const map = {};
    if (!this._inventory) return map;
    for (const criticality of ['CRITICAL', 'HIGH', 'MEDIUM_GROUPS']) {
      const group = this._inventory.assets[criticality];
      if (!Array.isArray(group)) continue;
      for (const item of group) {
        map[item.id] = item;
      }
    }
    return map;
  }
}

module.exports = IntegrityBaselineManager;
