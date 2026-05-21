/**
 * Phase Z.16 — KPIs: sem restore executivo após lock (client-side guard).
 */

import { isTerminalGovernanceLocked } from './terminalGovernanceGuard.js';

const EXEC_PATTERN = /faturamento|lucro|revenue|oee|profit/i;

export function filterKpisTerminalLock(kpis, dashboardMe) {
  if (!isTerminalGovernanceLocked(dashboardMe)) return kpis;
  const trace = dashboardMe.delivery_governance_trace;
  if (trace?.channel === 'kpis' && trace.final_kpis) {
    return trace.final_kpis;
  }
  return (kpis || []).filter((k) => {
    const key = String(k.id || k.key || k.label || '').toLowerCase();
    return !EXEC_PATTERN.test(key);
  });
}
