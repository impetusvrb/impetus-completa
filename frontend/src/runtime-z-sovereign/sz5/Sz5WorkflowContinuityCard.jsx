import { useEffect, useState } from 'react';
import { sz5Api } from './sz5Api';

export default function Sz5WorkflowContinuityCard() {
  const [workflows, setWorkflows] = useState([]);

  useEffect(() => {
    fetch('/api/runtime-z-sz5/workflows', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
    })
      .then((r) => r.json())
      .then((d) => setWorkflows((d.workflows || []).slice(0, 12)))
      .catch(() => setWorkflows([]));
  }, []);

  return (
    <div className="impetus-card" style={{ padding: '10px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--green)' }}>WORKFLOWS CONVERSACIONAIS</div>
      <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none' }}>
        {workflows.map((w) => (
          <li key={w.message_id} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {w.index_record?.workflow_type} — {String(w.content_snapshot || '').slice(0, 60)}
          </li>
        ))}
      </ul>
    </div>
  );
}
