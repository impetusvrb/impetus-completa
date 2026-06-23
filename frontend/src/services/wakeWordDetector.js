/**
 * Detecção leve de wake word via Web Speech API (sem custo de API).
 * Matching estrito: apenas «ok/okay impetus» (ver wakeWordMatch.js).
 */
import { logWakeRecognition, matchesWakePhrase } from './wakeWordMatch';

export class WakeWordDetector {
  constructor(onDetected) {
    this.onDetected = onDetected;
    this.recognition = null;
    this.isRunning = false;
    this.restartTimer = null;
  }

  start() {
    if (typeof window !== 'undefined' && !window.isSecureContext) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const scheduleRestart = (delay = 220) => {
      if (this.restartTimer) clearTimeout(this.restartTimer);
      if (!this.isRunning) return;
      this.restartTimer = setTimeout(() => {
        this.restartTimer = null;
        if (this.isRunning) run();
      }, delay);
    };

    const run = () => {
      if (!this.isRunning) return;
      try {
        this.recognition?.abort?.();
      } catch (_) {}
      try {
        this.recognition?.stop();
      } catch (_) {}
      this.recognition = null;

      this.recognition = new SR();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'pt-BR';
      this.recognition.maxAlternatives = 3;

      this.recognition.onresult = (event) => {
        let combined = '';
        for (let i = 0; i < event.results.length; i++) {
          combined += `${event.results[i][0]?.transcript || ''} `;
        }
        const matched = matchesWakePhrase(combined);
        logWakeRecognition(combined, matched);
        if (matched) {
          if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = null;
          }
          this.isRunning = false;
          try {
            this.recognition?.abort?.();
          } catch (_) {}
          try {
            this.recognition?.stop();
          } catch (_) {}
          this.recognition = null;
          this.onDetected?.();
        }
      };

      this.recognition.onend = () => {
        scheduleRestart(200);
      };

      this.recognition.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          this.isRunning = false;
          return;
        }
        scheduleRestart(e.error === 'no-speech' ? 120 : 380);
      };

      try {
        this.recognition.start();
      } catch (_) {
        scheduleRestart(500);
      }
    };

    this.isRunning = true;
    run();
  }

  stop() {
    this.isRunning = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    try {
      this.recognition?.abort?.();
    } catch (_) {}
    try {
      this.recognition?.stop();
    } catch (_) {}
    this.recognition = null;
  }
}
