import { useEffect, useState } from 'react';
import { sz5Api } from './sz5Api';

export default function Sz5ConversationContinuityCard({ message, threadId }) {
  const [answer, setAnswer] = useState(null);

  useEffect(() => {
    if (!message) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await sz5Api.query({ query: message, thread_id: threadId });
        if (!cancelled) setAnswer(data.answer || null);
      } catch {
        if (!cancelled) setAnswer(null);
      }
    })();
    return () => { cancelled = true; };
  }, [message, threadId]);

  if (!answer?.found) return null;

  return (
    <div className="impetus-card" style={{ padding: '10px', borderLeft: '3px solid var(--cyan)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cyan)', letterSpacing: '1px' }}>CONTINUIDADE SZ5</div>
      <p style={{ margin: '6px 0 0', color: 'var(--text-primary)', fontSize: '13px' }}>{answer.answer_pt}</p>
    </div>
  );
}
