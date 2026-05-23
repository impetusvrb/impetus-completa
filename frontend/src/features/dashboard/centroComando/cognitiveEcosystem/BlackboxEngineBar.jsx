import React, { useState, useEffect } from 'react';

export default function BlackboxEngineBar({ blackbox }) {
  const [logIdx, setLogIdx] = useState(0);
  const [hiddenIdx, setHiddenIdx] = useState(0);
  const engines = blackbox?.engines || [];
  const logs = blackbox?.background_log || [];
  const hidden = blackbox?.hidden_processes || [];

  useEffect(() => {
    if (!logs.length) return undefined;
    const t = setInterval(() => setLogIdx((i) => (i + 1) % logs.length), 2800);
    return () => clearInterval(t);
  }, [logs.length]);

  useEffect(() => {
    if (!hidden.length) return undefined;
    const t = setInterval(() => setHiddenIdx((i) => (i + 1) % hidden.length), 4500);
    return () => clearInterval(t);
  }, [hidden.length]);

  return (
    <div className="cog-blackbox cog-blackbox--deep" aria-label="Blackbox cognitivo">
      <div className="cog-blackbox__engines">
        {engines.map((e) => (
          <span
            key={e.id}
            className={`cog-blackbox__chip cog-blackbox__chip--${String(e.status).toLowerCase()}`}
          >
            <span className="cog-blackbox__dot" />
            {e.label}: <strong>{e.status}</strong>
          </span>
        ))}
      </div>
      {logs.length > 0 && (
        <p className="cog-blackbox__log">
          <span className="cog-blackbox__log-tag">BG</span>
          {logs[logIdx]}
        </p>
      )}
      {hidden.length > 0 && (
        <p className="cog-blackbox__hidden">
          <span className="cog-blackbox__log-tag">PROC</span>
          {hidden[hiddenIdx]}
        </p>
      )}
    </div>
  );
}
