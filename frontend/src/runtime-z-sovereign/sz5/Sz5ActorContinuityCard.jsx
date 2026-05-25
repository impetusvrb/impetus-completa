import { useEffect, useState } from 'react';
import { sz5Api } from './sz5Api';

export default function Sz5ActorContinuityCard({ actorName }) {
  const [actors, setActors] = useState([]);

  useEffect(() => {
    const q = actorName ? `?name=${encodeURIComponent(actorName)}` : '';
    fetch(`/api/runtime-z-sz5/actors${q}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
    })
      .then((r) => r.json())
      .then((d) => setActors((d.actors || []).slice(0, 10)))
      .catch(() => setActors([]));
  }, [actorName]);

  return (
    <div className="impetus-card" style={{ padding: '10px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cyan)' }}>ACTOR CONTINUITY</div>
      <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none' }}>
        {actors.map((a) => (
          <li key={a.message_id} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {(a.index_record?.actors || []).map((x) => x.name).filter(Boolean).join(', ') || '—'}
          </li>
        ))}
      </ul>
    </div>
  );
}
