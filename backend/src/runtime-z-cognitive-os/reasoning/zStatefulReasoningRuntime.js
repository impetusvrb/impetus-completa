'use strict';

/**
 * Mantém um "trace" leve de raciocínio dentro da janela da memória
 * (não persistente entre processos para evitar acoplamento). Usado para
 * justificar decisões em modo assistive.
 */
const _traces = new Map();
const MAX_TRACE_LEN = 25;

function recordStep(tenantId, step) {
  if (!tenantId) return;
  if (!_traces.has(tenantId)) _traces.set(tenantId, []);
  const arr = _traces.get(tenantId);
  arr.push({ ts: Date.now(), ...step });
  if (arr.length > MAX_TRACE_LEN) arr.shift();
}

function currentTrace(tenantId) {
  return _traces.get(tenantId) || [];
}

function clearTrace(tenantId) {
  _traces.set(tenantId, []);
}

module.exports = { recordStep, currentTrace, clearTrace, MAX_TRACE_LEN };
