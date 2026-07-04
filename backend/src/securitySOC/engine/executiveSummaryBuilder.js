'use strict';

/**
 * SEC-07 — Executive Summary determinístico (sem IA generativa).
 */

function buildExecutiveSummary(data, indicators, socStatus) {
  const lines = [];
  const open = data.sec02?.open || [];
  const closed = data.sec02?.closed || [];
  const pending = data.sec05?.pending || [];
  const integrity = data.sec04?.lastReport;
  const responses = data.sec06?.history || [];

  if (open.length === 0) {
    lines.push('Nenhum incidente activo.');
  } else {
    lines.push(`${open.length} incidente(s) activo(s) — severidade máxima: ${maxSeverity(open)}.`);
  }

  if (closed.length > 0) {
    lines.push(`${closed.length} incidente(s) encerrado(s) na janela recente.`);
  }

  if (integrity?.integrityStatus === 'INTEGRITY_OK') {
    lines.push('Integridade preservada.');
  } else if (integrity?.integrityStatus === 'DEGRADED') {
    lines.push('Integridade degradada — revisão recomendada.');
  } else if (integrity?.integrityStatus === 'COMPROMISED') {
    lines.push('Integridade comprometida — acção humana urgente.');
  } else {
    lines.push('Estado de integridade indeterminado (SEC-04 off ou sem check).');
  }

  if (integrity?.hashValidation?.passed) {
    lines.push('Baseline íntegra.');
  } else if (integrity?.hashValidation) {
    lines.push(`Baseline: ${integrity.hashValidation.drift || 0} drift(s), ${integrity.hashValidation.missing || 0} ausente(s).`);
  }

  const criticalPending = pending.filter((n) => n.severity === 'CRITICAL');
  if (criticalPending.length === 0 && pending.length === 0) {
    lines.push('Nenhuma acção crítica pendente.');
  } else if (criticalPending.length > 0) {
    lines.push(`${criticalPending.length} notificação(ões) CRITICAL pendente(s).`);
  } else {
    lines.push(`${pending.length} notificação(ões) pendente(s).`);
  }

  if (responses.length > 0) {
    const latest = responses[0];
    lines.push(`Última resposta orchestrada: ${latest.currentMode} (${latest.executionStatus}).`);
  }

  lines.push(`Estado SOC: ${socStatus}. Score global: ${indicators.overall_security_score}.`);

  return lines.join(' ');
}

function maxSeverity(incidents) {
  const order = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  let max = 'INFO';
  for (const i of incidents) {
    if (order.indexOf(i.severity) > order.indexOf(max)) max = i.severity;
  }
  return max;
}

module.exports = { buildExecutiveSummary, maxSeverity };
