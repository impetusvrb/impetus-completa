/**
 * IMPETUS - ManuIA 3D Vision - Painel de chat direito
 * Multi-turn, SpeechRecognition, steps clicáveis, Gerar OS
 */
import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, FileText } from 'lucide-react';
import useSpeechRecognition from '../../../hooks/useSpeechRecognition';
import { sanitizeHtml } from '../../../utils/sanitizeHtml';
import styles from '../styles/Vision3D.module.css';

export default function CopilotChat({
  messages,
  isLoading,
  result,
  onSend,
  onStepClick,
  onReturnPart,
  animatingStep = false,
  partRemovedStep = null,
  onOpenReport,
  onGenerateOS,
  disabled
}) {
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  const { isListening, supported: speechSupported, start: startMic, stop: stopMic } = useSpeechRecognition({
    lang: 'pt-BR',
    onResult: (text) => setInput((prev) => prev + (prev ? ' ' : '') + text)
  });

  useEffect(() => {
    scrollRef.current?.scrollTo?.({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    const t = input.trim();
    if (!t || disabled || isLoading) return;
    setInput('');
    onSend?.(t);
  };

  const renderMessage = (msg, i) => {
    if (msg.role === 'assistant') {
      const html = msg.mainMessage || msg.message || '';
      const steps = msg.steps || [];
      const parts = msg.parts || [];
      const sources = msg.webSources || [];
      return (
        <div key={i} className={styles.msgBubble + ' ' + styles['msgBubble--assistant']}>
          {html && <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />}
          {steps.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {steps.map((s, j) => {
                const partName = s.part || s.title;
                const isActive = partRemovedStep === j;
                const showReturn = partRemovedStep === j;
                return (
                  <div
                    key={j}
                    className={`${styles.stepCard} ${isActive ? styles['stepCard--active'] : ''}`}
                    onClick={() => !animatingStep && !showReturn && onStepClick?.(j, partName)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && !animatingStep && !showReturn && onStepClick?.(j, partName)}
                    style={{ opacity: animatingStep && !showReturn ? 0.6 : 1 }}
                  >
                    <div className={styles.stepCard__title}>{s.title}</div>
                    <div className={styles.stepCard__desc}>{s.desc}</div>
                    {showReturn && (
                      <button
                        type="button"
                        className={styles.stepCard__returnBtn}
                        onClick={(e) => { e.stopPropagation(); onReturnPart?.(); }}
                      >
                        Peça removida — próximo passo
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {parts.length > 0 && (
            <div className={styles.partsGrid} style={{ marginTop: 10 }}>
              {parts.map((p, j) => (
                <div key={j} className={styles.partBadge}>
                  <div className={styles.partBadge__code}>{p.code}</div>
                  <div className={styles.partBadge__stock}>{p.name} — {p.stock || 'ok'}</div>
                </div>
              ))}
            </div>
          )}
          {sources.length > 0 && (
            <div className={styles.sourcesBlock}>
              <div className={styles.sourcesBlock__title}>Fontes</div>
              {sources.slice(0, 5).map((s, j) => (
                <div key={j}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return (
      <div key={i} className={styles.msgBubble + ' ' + styles['msgBubble--user']}>
        {msg.content || msg.text}
      </div>
    );
  };

  const displayMessages = [];
  messages.forEach((m, i) => {
    if (typeof m === 'object' && m.role) {
      if (m.role === 'user') displayMessages.push({ role: 'user', content: m.content || '' });
      else displayMessages.push(m);
    }
  });

  return (
    <div className={styles.chatPanel}>
      <div ref={scrollRef} className={styles.chatMessages}>
        {displayMessages.map(renderMessage)}
        {!result && displayMessages.length === 0 && (
          <div className={styles.msgBubble + ' ' + styles['msgBubble--assistant']}>
            Envie uma foto ou vídeo do equipamento para iniciar o diagnóstico 3D.
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className={styles.chatInputRow}>
        <textarea
          className={styles.chatInput}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite ou fale..."
          rows={2}
          disabled={disabled || isLoading}
        />
        {speechSupported && (
          <button
            type="button"
            className={styles.captureBtn}
            onClick={isListening ? stopMic : startMic}
            disabled={disabled}
            title={isListening ? 'Parar' : 'Voz'}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}
        <button type="submit" className={styles.captureBtn} disabled={!input.trim() || disabled || isLoading}>
          <Send size={18} /> Enviar
        </button>
      </form>
      {result && (
        <button
          type="button"
          className={styles.generateOSBtn}
          onClick={() => (onOpenReport ? onOpenReport() : onGenerateOS?.(result))}
        >
          <FileText size={18} /> Gerar OS
        </button>
      )}
    </div>
  );
}
