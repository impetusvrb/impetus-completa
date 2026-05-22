import React, { useEffect, useRef } from 'react';

const TICK_MESSAGES = [
  'IA processando correlação intersetorial…',
  'Scanner comportamental em execução…',
  'Sincronização operacional atualizada…',
  'Memória de padrões consultada…'
];

export default function LiveOperationalFeed({ items = [], localTick = 0 }) {
  const listRef = useRef(null);
  const displayItems = [...items];

  if (localTick > 0 && displayItems.length) {
    const msg = TICK_MESSAGES[localTick % TICK_MESSAGES.length];
    const now = new Date();
    displayItems.unshift({
      id: `tick-${localTick}`,
      time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      severity: 'low',
      message: msg,
      type: 'ia'
    });
  }

  useEffect(() => {
    const el = listRef.current;
    if (!el) return undefined;
    const scroll = () => {
      if (el.scrollHeight > el.clientHeight) {
        el.scrollTop = (el.scrollTop + 1) % (el.scrollHeight - el.clientHeight + 1);
      }
    };
    const id = setInterval(scroll, 80);
    return () => clearInterval(id);
  }, [displayItems.length]);

  return (
    <section className="cog-feed cog-feed--dense" aria-label="Feed operacional vivo">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// FEED OPERACIONAL VIVO</span>
        <span className="cog-panel__live">STREAM</span>
        <span className="cog-panel__count">{displayItems.length} eventos</span>
      </header>
      <ul className="cog-feed__list" ref={listRef}>
        {displayItems.map((ev) => (
          <li
            key={ev.id}
            className={`cog-feed__item cog-feed__item--${ev.severity || 'low'} ${ev.synthetic ? 'cog-feed__item--syn' : ''}`}
          >
            <span className="cog-feed__time">[{ev.time}]</span>
            <span className="cog-feed__type">{ev.type || 'ops'}</span>
            <span className="cog-feed__msg">{ev.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
