import React, { useState, useEffect } from 'react';

export default function BlackboxEngineBar({ blackbox }) {
  const [logIdx, setLogIdx] = useState(0);
  const engines = blackbox?.engines || [];
  const logs = blackbox?.background_log || [];

  useEffect(() => {
    if (!logs.length) return undefined;
    const t = setInterval(() => setLogIdx((i) => (i + 1) % logs.length), 3200);
    return () => clearInterval(t);
  }, [logs.length]);

  return (
    <div className="cog-blackbox" aria-label="Motor cognitivo em segundo plano">
      <div className="cog-blackbox__engines">
        {engines.map((e) => (
          <span key={e.id} className={`cog-blackbox__chip cog-blackbox__chip--${e.status.toLowerCase()}`}>
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
    </div>
  );
}
