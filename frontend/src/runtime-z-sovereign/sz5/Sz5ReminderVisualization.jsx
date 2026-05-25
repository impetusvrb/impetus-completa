export default function Sz5ReminderVisualization({ reminders = [] }) {
  if (!reminders.length) return null;
  return (
    <div className="impetus-card" style={{ padding: '10px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--amber)' }}>LEMBRETES OPERACIONAIS</div>
      <ul style={{ margin: '6px 0 0', paddingLeft: '16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
        {reminders.map((r, i) => (
          <li key={i}>{r.summary || r.type}</li>
        ))}
      </ul>
    </div>
  );
}
