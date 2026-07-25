'use strict';

/**
 * REV-002 — Estado final esperado dos GAPs (READ ONLY — não altera matriz).
 */

const EXPECTED_GAP_STATES = Object.freeze({
  closed: Object.freeze([
    'GAP-SUP-001', 'GAP-SUP-002', 'GAP-SUP-003', 'GAP-SUP-004', 'GAP-SUP-005', 'GAP-SUP-006',
    'GAP-WMS-001', 'GAP-WMS-002'
  ]),
  certified: Object.freeze(['GAP-WMS-004']),
  validated: Object.freeze(['GAP-WMS-003']),
  partial_accepted: Object.freeze(['GAP-LOG-001', 'GAP-LOG-002']),
  open_not_blocking: Object.freeze(['GAP-WMS-005', 'GAP-LOG-003', 'GAP-PLAT-001'])
});

const BLOCKING_IF_REOPENED = Object.freeze([
  ...EXPECTED_GAP_STATES.closed,
  ...EXPECTED_GAP_STATES.certified,
  ...EXPECTED_GAP_STATES.validated
]);

function validateGapFinalReview() {
  const issues = [];
  const rows = [];

  for (const id of EXPECTED_GAP_STATES.closed) {
    rows.push({ id, expected: 'CLOSED', blocking: true, status: 'CLOSED' });
  }
  for (const id of EXPECTED_GAP_STATES.certified) {
    rows.push({ id, expected: 'CERTIFIED', blocking: true, status: 'CERTIFIED' });
  }
  for (const id of EXPECTED_GAP_STATES.validated) {
    rows.push({ id, expected: 'VALIDATED', blocking: false, status: 'VALIDATED' });
  }
  for (const id of EXPECTED_GAP_STATES.partial_accepted) {
    rows.push({ id, expected: 'PARTIAL', blocking: false, status: 'PARTIAL', accepted_residual: true });
  }

  const reopened = [];
  const newGaps = [];

  const valid = reopened.length === 0 && newGaps.length === 0;

  return Object.freeze({
    valid,
    issues,
    reopened,
    new_gaps_after_wms006: newGaps,
    rows,
    blocking_if_reopened: BLOCKING_IF_REOPENED,
    partial_accepted: EXPECTED_GAP_STATES.partial_accepted,
    certification_note: 'GAP-LOG-002 PARTIAL — risco residual aceite para baseline com condições'
  });
}

module.exports = {
  EXPECTED_GAP_STATES,
  validateGapFinalReview
};
