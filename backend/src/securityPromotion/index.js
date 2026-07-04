'use strict';

/**
 * SEC-09 — Enterprise Security Promotion (read-only plan + dashboard).
 */

const engine = require('./engine/securityPromotionEngine');
const plan = require('./config/securityPromotionPlan');

module.exports = {
  plan,
  engine,
  getPromotionPayload: engine.getPromotionPayload,
  buildDashboard: engine.buildDashboard
};
