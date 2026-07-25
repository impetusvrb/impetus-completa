'use strict';

const { createMoney } = require('../model/valueObjects');

class SpendAnalysisService {
  aggregateByCategory(requests = []) {
    const map = new Map();
    for (const req of requests) {
      const key = req.categoryId || 'uncategorized';
      const prev = map.get(key) || 0;
      map.set(key, prev + (req.totalAmount?.amount ?? 0));
    }
    return Object.freeze(
      [...map.entries()].map(([categoryId, amount]) => ({
        categoryId,
        spend: createMoney(amount)
      }))
    );
  }

  totalSpend(requests = []) {
    const total = requests.reduce((s, r) => s + (r.totalAmount?.amount ?? 0), 0);
    return createMoney(total);
  }
}

module.exports = { SpendAnalysisService };
