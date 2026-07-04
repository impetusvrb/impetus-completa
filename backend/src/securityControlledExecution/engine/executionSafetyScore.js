'use strict';

/**
 * SEC-13 — Execution Safety Score (0–100).
 */

function computeExecutionSafetyScore(context) {
  const { executions = [], blocked = [], failures = 0, rollbacksAvailable = 0 } = context;

  let score = 100;
  if (failures > 0) score -= failures * 10;
  if (executions.length > 0) {
    const withRollback = executions.filter((e) => e.rollback).length;
    score -= ((executions.length - withRollback) / executions.length) * 20;
  }
  if (blocked.length > 5) score -= 5;
  score = Math.min(100, Math.max(0, score));
  return { execution_safety_score: score, rollbacksAvailable };
}

module.exports = { computeExecutionSafetyScore };
