/**
 * FIN-EVOLVE-2.3 — What-if observability events (additive to finance channel).
 */
import { FINANCE_EVENTS, emitFinanceWhatIf } from '../../observability/financeObservability.js';
import { FIN_EVOLVE_23_PHASE } from '../scenario-engine/whatIfConstants.js';

export function trackWhatIfStarted(meta = {}) {
  emitFinanceWhatIf(FINANCE_EVENTS.WHATIF_STARTED, meta);
}

export function trackWhatIfParameterChanged(meta = {}) {
  emitFinanceWhatIf(FINANCE_EVENTS.WHATIF_PARAMETER_CHANGED, meta);
}

export function trackWhatIfCalculated(meta = {}) {
  emitFinanceWhatIf(FINANCE_EVENTS.WHATIF_CALCULATED, meta);
}

export function trackWhatIfDiscarded(meta = {}) {
  emitFinanceWhatIf(FINANCE_EVENTS.WHATIF_DISCARDED, meta);
}

export const WHATIF_OBSERVABILITY_EVENTS = Object.freeze([
  'finance.whatif.started',
  'finance.whatif.parameter.changed',
  'finance.whatif.calculated',
  'finance.whatif.discarded'
]);

export function validateWhatIfObservability() {
  const issues = [];
  for (const ev of WHATIF_OBSERVABILITY_EVENTS) {
    if (!Object.values(FINANCE_EVENTS).includes(ev)) {
      issues.push(`missing FINANCE_EVENTS entry for ${ev}`);
    }
  }
  return { valid: issues.length === 0, issues, phase: FIN_EVOLVE_23_PHASE };
}
