'use strict';

/**
 * Resolve intenções implícitas em mensagens curtas/imperativas, herdando
 * contexto da última conversa relevante. Heurístico, mas estável.
 */

const IMPERATIVE_PATTERNS = [
  /^(envi[ae]|enviar|despache|despachar|publique|publicar)\b/i,
  /^(crie|criar|gere|gerar|prepar[ae]|preparar)\b/i,
  /^(notifique|notificar|avis[ae]|avisar)\b/i,
  /^(escal[ae]|escalar|reportar|reporte)\b/i,
  /^(confirm[ae]|confirmar|valid[ae]|validar)\b/i
];

const ANCHOR_KEYWORDS = [
  'comunicado',
  'comunicacao',
  'lista',
  'confirmacao',
  'destinatario',
  'destinatarios',
  'treinamento',
  'evento',
  'reuniao',
  'incidente',
  'capa',
  'nc',
  'auditoria',
  'permit',
  'pta',
  'pt'
];

function normalize(text = '') {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isImperativeShortMessage(text = '') {
  const t = normalize(text);
  if (!t) return false;
  if (t.length > 220) return false;
  return IMPERATIVE_PATTERNS.some((re) => re.test(t));
}

function extractAnchors(text = '') {
  const t = normalize(text);
  return ANCHOR_KEYWORDS.filter((k) => t.includes(k));
}

function resolveImplicitIntent(currentMessage, recentTurns = []) {
  const isImperative = isImperativeShortMessage(currentMessage);
  const anchors = extractAnchors(currentMessage);

  if (!isImperative) {
    return {
      implicit: false,
      reason: 'message_is_self_contained',
      anchors,
      inherited_from: null
    };
  }

  for (let i = recentTurns.length - 1; i >= 0; i--) {
    const turn = recentTurns[i];
    const summary = `${turn.summary || ''} ${turn.intent || ''}`;
    const ctxAnchors = extractAnchors(summary);
    if (ctxAnchors.length || (turn.intent && turn.intent.length > 3)) {
      return {
        implicit: true,
        anchors: Array.from(new Set([...anchors, ...ctxAnchors])),
        inherited_from: {
          turn_id: turn.id,
          ts: turn.ts,
          summary: turn.summary,
          intent: turn.intent
        },
        confidence: Number(
          Math.min(1, 0.45 + ctxAnchors.length * 0.15 + (turn.intent ? 0.2 : 0)).toFixed(3)
        )
      };
    }
  }

  return {
    implicit: true,
    anchors,
    inherited_from: null,
    confidence: 0.25,
    reason: 'no_previous_context_found'
  };
}

module.exports = { resolveImplicitIntent, isImperativeShortMessage, extractAnchors, normalize };
