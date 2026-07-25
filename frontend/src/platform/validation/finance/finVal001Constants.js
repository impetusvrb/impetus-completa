/**
 * FIN-VAL-001 — Finance Operational Validation
 * Principle: VALIDATE BEFORE EXPAND
 * No new product features — certify what Release 2.0–2.2 already delivered.
 */
export const FIN_VAL_001_PHASE = 'FIN-VAL-001';
export const FIN_VAL_001_PRINCIPLE = 'VALIDATE BEFORE EXPAND';
export const FIN_VAL_001_SCOPE = Object.freeze({
  implementsFeatures: false,
  opensWhatIf: false,
  opensPrediction: false,
  validationOnly: true
});

export const VALIDATION_STATUS = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  WARN: 'WARN',
  SKIP: 'SKIP'
});
