'use strict';
/**
 * IntegrityRuntime — INT-01B
 * Ponto de entrada para integração no server.js.
 * Carregamento condicional via INTEGRITY_SENSOR_ENABLED.
 * Watchdog interno para detecção de falha do próprio sensor.
 *
 * SHADOW MODE: INTEGRITY_SENSOR_ENABLED=false — módulo carregado mas não activo.
 */

let _engine  = null;
let _watchdog = null;

function init() {
  const enabled = process.env.INTEGRITY_SENSOR_ENABLED === 'true';

  if (!enabled) {
    // Shadow Mode / fase de transição — não iniciar o motor
    // Log silencioso para confirmar carregamento do módulo
    if (process.env.INTEGRITY_SENSOR_VERBOSE === 'true') {
      console.log('[INTEGRITY_SENSOR] SHADOW_MODE=true — INTEGRITY_SENSOR_ENABLED=false; motor não activo.');
    }
    return;
  }

  try {
    const IntegrityEngine = require('./IntegrityEngine');
    _engine = new IntegrityEngine();
    _engine.start();

    const staleness = 2 * parseInt(process.env.INTEGRITY_HASH_CHECK_INTERVAL || '300', 10) * 1000;
    _watchdog = setInterval(() => _checkWatchdog(staleness), staleness);

    console.log('[INTEGRITY_SENSOR] Motor de integridade iniciado. SHADOW_MODE=true');
  } catch (e) {
    console.warn('[INTEGRITY_SENSOR_BOOT]', e && e.message ? e.message : e);
    // Falha do sensor nunca derruba o servidor
  }
}

function _checkWatchdog(maxAge) {
  if (!_engine) return;
  // Se houver mais de maxAge desde o start e nenhuma verificação registada,
  // emitir evento de sensor down via bus
  try {
    const state    = _engine.getState();
    const hashStats = state.stats.hash_checker;
    if (hashStats.checks === 0 && Date.now() - new Date(state.started_at).getTime() > maxAge) {
      _engine.getEventBus().emit({
        event_type:       'INTEGRITY_SENSOR_DOWN',
        severity:         'HIGH',
        asset_path:       '(sensor)',
        asset_id:         null,
        asset_criticality: null,
        sensor_component: 'Watchdog',
        detail:           'HashChecker não completou nenhuma verificação no intervalo esperado',
        confidence:       'HIGH',
      });
    }
  } catch { /* watchdog silencioso */ }
}

function getEngine() { return _engine; }

function shutdown() {
  if (_watchdog) { clearInterval(_watchdog); _watchdog = null; }
  if (_engine)   { _engine.stop(); _engine = null; }
}

// Cleanup em SIGTERM/SIGINT
process.on('exit', shutdown);

module.exports = { init, getEngine, shutdown };
