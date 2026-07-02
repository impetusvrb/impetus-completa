'use strict';

const billingEngine = require('../nexusBillingEngine');

/**
 * Registra consumo IA via Nexus Billing Engine v4 (transacção atómica).
 * Fallback para legacy se engine desligado.
 */
async function registrarUsoViaEngine(input, usage = {}) {
  if (!billingEngine.isEnabled()) return null;
  return billingEngine.chargeConsumption(input, usage);
}

module.exports = { registrarUsoViaEngine };
