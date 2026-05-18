'use strict';

/**
 * Score de complexidade operacional do tenant (0–100).
 * @param {object} ctx
 */
function scoreOperationalComplexity(ctx = {}) {
  const domains = Number(ctx.active_domains) || 3;
  const users = Number(ctx.active_users) || 10;
  const plants = Number(ctx.plant_count) || 1;
  const modules = Array.isArray(ctx.licensed_modules) ? ctx.licensed_modules.length : 3;

  let score = 20 + domains * 8 + Math.min(30, users) + plants * 5 + modules * 4;
  score = Math.max(0, Math.min(100, score));
  return {
    score,
    factors: { domains, users, plants, modules }
  };
}

module.exports = { scoreOperationalComplexity };
