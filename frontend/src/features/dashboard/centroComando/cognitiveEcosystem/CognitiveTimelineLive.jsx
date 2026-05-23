import React, { useState } from 'react';

export default function CognitiveTimelineLive({ timeline }) {
  const [replay, setReplay] = useState(false);
  if (!timeline?.events?.length) return null;
  const events = replay ? [...timeline.events].reverse() : timeline.events;

  return (
    <section className="cog-ctl-timeline" aria-label="Timeline cognitiva viva">
      <header className="cog-panel__head">
        <span className="cog-panel__tag">// {timeline.label?.toUpperCase() || 'TIMELINE COGNITIVA'}</span>
        <button
          type="button"
          className="cog-ctl-timeline__replay"
          onClick={() => setReplay((r) => !r)}
        >
          {replay ? 'AO VIVO' : 'REPLAY'}
        </button>
      </header>
      <div className="cog-ctl-timeline__track">
        {events.map((ev) => (
          <div key={ev.id} className={`cog-ctl-timeline__node cog-ctl-timeline__node--${ev.impact}`}>
            <span className="cog-ctl-timeline__time">{ev.time}</span>
            <span className="cog-ctl-timeline__title">{ev.title}</span>
            {ev.detail && <span className="cog-ctl-timeline__detail">{ev.detail}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
