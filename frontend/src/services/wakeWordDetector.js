/**
 * Detecção leve de wake word via Web Speech API (sem custo de API).
 */
export class WakeWordDetector {
  constructor(onDetected) {
    this.onDetected = onDetected;
    this.recognition = null;
    this.isRunning = false;
    this.retryCount = 0;
    this.maxRetries = 5;
  }

  start() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const run = () => {
      if (!this.isRunning) return;
      this.recognition = new SR();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'pt-BR';
      this.recognition.maxAlternatives = 3;

      this.recognition.onresult = (event) => {
        const norm = (x) =>
          String(x || '')
            .toLowerCase()
            .replace(/,/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const transcripts = Array.from(event.results).map((r) => norm(r[0].transcript));
        const wakeWords = [
          'ok impetus',
          'oi impetus',
          'olá impetus',
          'ola impetus',
          'hey impetus',
          'ok impetis',
          'ok impetos',
          'impetus'
        ];
        const detected = transcripts.some((t) => wakeWords.some((w) => t.includes(w)));
        if (detected) {
          try {
            this.recognition.stop();
          } catch (_) {}
          this.onDetected?.();
        }
      };

      this.recognition.onend = () => {
        if (this.isRunning && this.retryCount < this.maxRetries) {
          this.retryCount++;
          setTimeout(() => {
            if (this.isRunning) {
              try {
                run();
              } catch (_) {}
            }
          }, 400);
        }
      };

      this.recognition.onerror = (e) => {
        if (e.error === 'not-allowed') {
          this.isRunning = false;
        }
      };

      try {
        this.recognition.start();
      } catch (_) {
        this.retryCount++;
      }
    };

    this.isRunning = true;
    this.retryCount = 0;
    run();
  }

  stop() {
    this.isRunning = false;
    try {
      this.recognition?.stop();
    } catch (_) {}
    this.recognition = null;
  }
}
