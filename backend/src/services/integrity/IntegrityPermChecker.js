'use strict';
/**
 * IntegrityPermChecker — INT-01B / INT-LIM-003
 * Verifica owner (UID), group (GID) e mode bits dos activos críticos.
 * Compara com expected_perm, expected_owner e expected_group do asset_inventory.json.
 */

const fs = require('fs');

class IntegrityPermChecker {
  constructor(eventBus, baselineManager, options = {}) {
    this._bus      = eventBus;
    this._bm       = baselineManager;
    this._interval = parseInt(process.env.INTEGRITY_PERM_CHECK_INTERVAL || '120', 10) * 1000;
    this._timer    = null;
    this._running  = false;
    this._stats    = { checks: 0, violations: 0, errors: 0 };
  }

  start() {
    if (this._running) return;
    this._running = true;
    setTimeout(() => this._checkAll(), 5000); // offset para não colidir com HashChecker
    this._timer = setInterval(() => this._checkAll(), this._interval);
  }

  stop() {
    this._running = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  getStats() { return { ...this._stats }; }

  _checkAll() {
    const assets = this._bm.getAllAssets().filter(a => a.monitor_perm || a.monitor_owner);
    this._stats.checks++;

    for (const asset of assets) {
      try {
        this._checkAsset(asset);
      } catch (e) {
        this._stats.errors++;
      }
    }
  }

  _checkAsset(asset) {
    const effectivePath = asset.canonical_path || asset.path;
    if (!fs.existsSync(effectivePath)) return; // ausência tratada pelo HashChecker

    let stat;
    try {
      stat = fs.statSync(effectivePath);
    } catch (e) {
      return;
    }

    // Mode bits: octal string  e.g. "644"
    if (asset.monitor_perm && asset.expected_perm) {
      const actualPerm = (stat.mode & 0o7777).toString(8);
      // Normaliza para 3 dígitos (644, 600, 755, 640)
      const expected   = String(asset.expected_perm).padStart(3, '0');
      const actual3    = actualPerm.slice(-3);
      if (actual3 !== expected) {
        this._stats.violations++;
        this._bus.emit({
          event_type:       'INTEGRITY_PERM_CHANGED',
          severity:         asset.criticality === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          asset_path:       asset.path,
          asset_id:         asset.id,
          asset_criticality: asset.criticality,
          sensor_component: 'PermChecker',
          perm_previous:    expected,
          perm_current:     actual3,
          detail:           `permissão alterada: esperado=${expected} actual=${actual3}`,
          confidence:       'HIGH',
        });
      }
    }

    // Owner (UID)
    if (asset.monitor_owner && asset.expected_owner) {
      // Resolve expected owner UID
      const actualUid = stat.uid;
      const expectedOwner = asset.expected_owner; // e.g. "root"
      const expectedUid   = resolveUid(expectedOwner);

      if (expectedUid !== null && actualUid !== expectedUid) {
        this._stats.violations++;
        this._bus.emit({
          event_type:       'INTEGRITY_OWNER_CHANGED',
          severity:         'CRITICAL',
          asset_path:       asset.path,
          asset_id:         asset.id,
          asset_criticality: asset.criticality,
          sensor_component: 'PermChecker',
          changed_attribute: 'UID',
          owner_previous:   expectedOwner,
          owner_current:    `uid:${actualUid}`,
          detail:           `owner alterado: esperado=${expectedOwner}(uid=${expectedUid}) actual=uid:${actualUid}`,
          confidence:       'HIGH',
        });
      }
    }

    // Group (GID) — INT-LIM-003
    if (asset.monitor_owner && asset.expected_group) {
      const actualGid      = stat.gid;
      const expectedGroup  = asset.expected_group; // e.g. "root"
      const expectedGid    = resolveGid(expectedGroup);

      if (expectedGid !== null && actualGid !== expectedGid) {
        this._stats.violations++;
        this._bus.emit({
          event_type:        'INTEGRITY_OWNER_CHANGED',
          severity:          'CRITICAL',
          asset_path:        asset.path,
          asset_id:          asset.id,
          asset_criticality: asset.criticality,
          sensor_component:  'PermChecker',
          changed_attribute: 'GID',
          group_previous:    expectedGroup,
          group_current:     `gid:${actualGid}`,
          owner_previous:    expectedGroup,
          owner_current:     `gid:${actualGid}`,
          detail:            `group alterado: esperado=${expectedGroup}(gid=${expectedGid}) actual=gid:${actualGid}`,
          confidence:        'HIGH',
        });
      }
    }
  }
}

// Cache simples de UID resolution
const _uidCache = new Map();
function resolveUid(name) {
  if (_uidCache.has(name)) return _uidCache.get(name);
  try {
    const { execSync } = require('child_process');
    const uid = parseInt(execSync(`id -u ${name}`, { stdio: 'pipe' }).toString().trim(), 10);
    _uidCache.set(name, uid);
    return uid;
  } catch {
    _uidCache.set(name, null);
    return null;
  }
}

// Cache simples de GID resolution — INT-LIM-003
const _gidCache = new Map();
function resolveGid(name) {
  if (_gidCache.has(name)) return _gidCache.get(name);
  try {
    const { execSync } = require('child_process');
    // getent group <name> → name:password:gid:members
    const line = execSync(`getent group ${name}`, { stdio: 'pipe' }).toString().trim();
    const gid = parseInt(line.split(':')[2], 10);
    _gidCache.set(name, isNaN(gid) ? null : gid);
    return _gidCache.get(name);
  } catch {
    _gidCache.set(name, null);
    return null;
  }
}

module.exports = IntegrityPermChecker;
