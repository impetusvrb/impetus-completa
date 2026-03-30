/**
 * Motor de decisão de alerta — entrada: evento + contexto; saída: destino e intensidade.
 */
'use strict';

const availability = require('./manuiaAvailabilityService');

function mapSeverityToAlertLevel(severity) {
  const s = String(severity || 'medium').toLowerCase();
  if (s === 'critical' || s === 'critica') return 'critical';
  if (s === 'high' || s === 'alta') return 'urgent';
  if (s === 'low' || s === 'baixa') return 'silent';
  return 'normal';
}

function decideAlertDelivery(input) {
  const eventType = String(input.eventType || 'generic');
  const sev = input.severity || 'medium';
  let alertLevel = input.alertLevel || mapSeverityToAlertLevel(sev);

  if (/stock_low|inventory/.test(eventType) && alertLevel === 'normal') {
    alertLevel = 'silent';
  }
  if (/machine_stopped|emergency|plc_critical/.test(eventType)) {
    alertLevel = 'critical';
  }

  const delivery = availability.shouldDeliverNow({
    prefs: input.prefs,
    alertLevel,
    now: input.now || new Date(),
    userOnCall: !!input.userOnCall
  });

  return {
    alertLevel,
    delivery,
    escalation: delivery.deliver ? null : { suggest: 'supervisor_or_on_call', eventType }
  };
}

module.exports = { decideAlertDelivery, mapSeverityToAlertLevel };
