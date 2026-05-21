/**
 * Phase Z.16 — summary: respeita pool pré-composição do backend.
 */

import { isTerminalGovernanceLocked } from './terminalGovernanceGuard.js';

export function applyTerminalSummaryLock(summaryPayload, dashboardMe) {
  if (!isTerminalGovernanceLocked(dashboardMe)) return summaryPayload;
  if (dashboardMe._terminal_narrative_pool) {
    return { ...summaryPayload, _terminal_locked: true };
  }
  return summaryPayload;
}
