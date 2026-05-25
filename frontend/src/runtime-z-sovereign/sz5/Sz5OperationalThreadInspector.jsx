import { useEffect, useState } from 'react';
import { sz5Api } from './sz5Api';

export default function Sz5OperationalThreadInspector() {
  const [threads, setThreads] = useState([]);

  useEffect(() => {
    sz5Api.memory().then((d) => setThreads((d.memory || []).slice(0, 20))).catch(() => setThreads([]));
  }, []);

  return (
    <section className="impetus-card" style={{ padding: '12px' }}>
      <header style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)', fontSize: '11px', letterSpacing: '2px' }}>
        THREAD INSPECTOR
      </header>
      <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none' }}>
        {threads.map((t) => (
          <li key={t.message_id} style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '4px 0' }}>
            {t.thread_id} · {t.index_record?.workflow_type || '—'}
          </li>
        ))}
      </ul>
    </section>
  );
}
