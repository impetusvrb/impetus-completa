/**
 * Alertas por voz — prioridades P1–P4, anti-repetição, integração com TTS do hook.
 */
import { pickAlertFollowupPhrase } from '../constants/voiceResponses';

const spokenAt = new Map();

function priorityRank(p) {
  const x = String(p || 'P3').toUpperCase();
  if (x === 'P1') return 1;
  if (x === 'P2') return 2;
  if (x === 'P3') return 3;
  return 4;
}

function minRank(minP) {
  return priorityRank(minP || 'P2');
}

export function alertAlreadySpoken(id) {
  const t = spokenAt.get(String(id));
  return t && Date.now() - t < 5 * 60 * 1000;
}

export function markAlertAsSpoken(id) {
  spokenAt.set(String(id), Date.now());
  if (spokenAt.size > 200) {
    const now = Date.now();
    for (const [k, v] of spokenAt) {
      if (now - v > 5 * 60 * 1000) spokenAt.delete(k);
    }
  }
}

/**
 * @param {object} alert - { id, priority, title, message, ... }
 * @param {object} opts
 * @param {boolean} opts.alertsEnabled
 * @param {string} opts.alertMinPriority - P1|P2|P3|P4
 * @param {function} opts.speakText - async (text) => void
 * @param {function} opts.stopSpeaking
 * @param {function} opts.stopVoiceCapture
 * @param {function} [opts.formatAlert] - async (alert) => string
 */
export async function handleVoiceAlert(alert, opts) {
  if (!opts?.alertsEnabled) return;
  if (!alert || priorityRank(alert.priority) >= 4) return;
  if (priorityRank(alert.priority) > minRank(opts.alertMinPriority)) return;
  const id = alert.id ?? alert.alert_id ?? JSON.stringify(alert).slice(0, 120);
  if (alertAlreadySpoken(id)) return;

  if (alert.priority === 'P1' || alert.priority === 'P2') {
    opts.stopSpeaking?.();
    opts.stopVoiceCapture?.();
  }

  let message = alert.voiceMessage;
  if (!message && opts.formatAlert) {
    try {
      message = await opts.formatAlert(alert);
    } catch (_) {
      message = null;
    }
  }
  if (!message) {
    message = `Atenção: ${alert.title || alert.message || 'Alerta operacional'}.`;
  }

  const sentiment =
    alert.priority === 'P1' || alert.priority === 'P2'
      ? 'urgente'
      : alert.priority === 'P3'
        ? 'negativo'
        : 'neutro';

  markAlertAsSpoken(id);
  await opts.speakText(message, { sentimentContext: { sentiment } });

  if (alert.priority === 'P1') {
    await new Promise((r) => setTimeout(r, 600));
    await opts.speakText(pickAlertFollowupPhrase(), { sentimentContext: { sentiment } });
  }
}
