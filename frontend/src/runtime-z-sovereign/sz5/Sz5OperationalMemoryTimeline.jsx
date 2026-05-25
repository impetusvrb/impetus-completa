import { useEffect, useState } from 'react';
import { sz5Api } from './sz5Api';

export default function Sz5OperationalMemoryTimeline({ threadId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await sz5Api.timeline(threadId);
        if (!cancelled) setItems(data.timeline || []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [threadId]);

  return (
    <section className="impetus-card" style={{ padding: '12px' }}>
      <header className="screen-header" style={{ marginBottom: '8px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '2px', fontSize: '11px', color: 'var(--cyan)' }}>
          SZ5 · MEMÓRIA OPERACIONAL
        </span>
      </header>
      {loading && <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>A carregar timeline…</p>}
      {!loading && items.length === 0 && (
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>Sem factos indexados neste âmbito.</p>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((it) => (
          <li key={it.message_id} style={{ borderBottom: '1px solid var(--border-subtle)', padding: '8px 0' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)' }}>{it.indexed_at}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{it.workflow_type || '—'} · {it.excerpt}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
