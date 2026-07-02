/**
 * Fases de boot do /app sem exigir Provider no topo da árvore.
 * Onda 1: /dashboard/me (useVisibleModules)
 * Onda 2: notificações, cognitive pulse, live dashboard, menus
 * Onda 3: manutenção, pulse RH, prefs de voz
 */
import { useEffect, useState } from 'react';
import { markWaveReady } from './dashboardBootMetrics';

let globalPhase = 1;
let wave1Signaled = false;
const listeners = new Set();

function emit(phase) {
  globalPhase = phase;
  listeners.forEach((fn) => {
    try {
      fn(phase);
    } catch (_) { /* ignore */ }
  });
}

function schedulePhase3() {
  const advance = () => {
    if (globalPhase >= 3) return;
    markWaveReady(3);
    emit(3);
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(advance, { timeout: 1800 });
  } else {
    setTimeout(advance, 1400);
  }
}

/** Chamado quando /dashboard/me (onda 1) conclui. */
export function notifyDashboardWave1Ready() {
  if (wave1Signaled) return;
  wave1Signaled = true;
  markWaveReady(1);
  setTimeout(() => {
    if (globalPhase < 2) {
      markWaveReady(2);
      emit(2);
      schedulePhase3();
    }
  }, 80);
}

export function getDashboardBootPhase() {
  return globalPhase;
}

export function useDashboardBoot() {
  const [phase, setPhase] = useState(globalPhase);

  useEffect(() => {
    const onPhase = (p) => setPhase(p);
    listeners.add(onPhase);
    setPhase(globalPhase);
    return () => listeners.delete(onPhase);
  }, []);

  return { phase, wave1Ready: globalPhase >= 1 };
}

export function useDashboardBootAtLeast(minPhase) {
  const { phase } = useDashboardBoot();
  return phase >= minPhase;
}

/** Compat: Provider opcional (no-op). */
export function DashboardBootProvider({ children }) {
  return children;
}
