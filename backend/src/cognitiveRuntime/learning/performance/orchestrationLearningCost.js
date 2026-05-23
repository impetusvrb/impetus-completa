'use strict';

function measureLearningCost(store = {}) {
  const n = (store.snapshots || []).length;
  return { orchestration_learning_cost: n * 3 + 5, acceptable: n < 500 };
}

module.exports = { measureLearningCost };
