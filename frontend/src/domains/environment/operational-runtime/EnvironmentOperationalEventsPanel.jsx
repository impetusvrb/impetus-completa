import React, { useState, useEffect, useCallback } from 'react';
import { safeUUID } from '../../../utils/safeUuid.js';
import { environmentOperational as envApi } from '../../../services/api.js';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };
const labelH = { ...mono, color: 'var(--text-tertiary)', marginBottom: 6 };

const KIND_LABELS = {
  emission: 'Emissão / alerta',
  waste: 'Resíduo / MTR',
  water: 'Amostra água',
  field: 'Ocorrência campo'
};

const EVENT_BY_KIND = {
  emission: 'environment.emission.alert_triggered',
  waste: 'environment.waste.manifest_created',
  water: 'environment.water.sample_collected',
  field: 'environment.field.occurrence_registered'
};

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, flex: '1 1 160px' }}>
      <div style={labelH}>{label}</div>
      <div style={{ fontSize: 24, color: color || 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{value ?? '—'}</div>
      {sub ? <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

function formatEventName(name) {
  if (!name) return '—';
  const parts = String(name).split('.');
  return parts.slice(-2).join(' · ') || name;
}

export function EnvironmentOperationalEventsPanel({ companyId }) {
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [runtime, setRuntime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    kind: 'emission',
    title: '',
    message: '',
    location: ''
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [healthRes, sumRes, evRes] = await Promise.all([
        envApi.health(),
        envApi.getEventsSummary(),
        envApi.listEvents({ limit: 15 })
      ]);
      setRuntime(healthRes.data || null);
      setSummary(sumRes.data?.summary || null);
      setEvents(evRes.data?.events || []);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || 'Falha ao carregar ambiental');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, companyId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    setErr('');
    try {
      await envApi.publishEvent({
        event_name: EVENT_BY_KIND[form.kind],
        correlation_id: safeUUID(),
        payload: {
          title: form.title.trim(),
          message: form.message.trim() || form.title.trim(),
          location: form.location.trim() || undefined,
          company_id: companyId
        }
      });
      setForm({ kind: 'emission', title: '', message: '', location: '' });
      await load();
    } catch (ex) {
      setErr(ex?.response?.data?.error || ex?.response?.data?.reason || ex.message || 'Erro ao publicar evento');
    } finally {
      setSubmitting(false);
    }
  };

  const runtimeOff = runtime && runtime.enabled === false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ ...mono, color: 'var(--cyan)' }}>Eventos ambientais · emissões · resíduos · água</div>

      {runtimeOff ? (
        <p style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          Runtime operacional ambiental desligado (shadow) — publicação pode retornar 503.
        </p>
      ) : null}

      {loading && !summary ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Carregando…</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <KpiCard label="Emissões (30d)" value={summary?.emissions ?? 0} color="var(--amber)" />
          <KpiCard label="Resíduos / MTR" value={summary?.waste ?? 0} color="var(--green)" />
          <KpiCard label="Amostras água" value={summary?.water ?? 0} color="var(--cyan)" />
          <KpiCard label="Total eventos" value={summary?.total ?? 0} sub="industrial_event_outbox" />
        </div>
      )}

      <form className="impetus-card" style={{ padding: '1rem', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10 }} onSubmit={submit}>
        <div style={labelH}>Registrar evento ambiental</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(KIND_LABELS).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={form.kind === k ? 'btn-primary' : 'btn-ghost'}
              style={{ minHeight: 36, borderRadius: 4, fontSize: 12 }}
              onClick={() => setForm((f) => ({ ...f, kind: k }))}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          className="impetus-input"
          placeholder="Título / identificação"
          value={form.title}
          onChange={(ev) => setForm((f) => ({ ...f, title: ev.target.value }))}
          required
        />
        <input
          className="impetus-input"
          placeholder="Local / setor (opcional)"
          value={form.location}
          onChange={(ev) => setForm((f) => ({ ...f, location: ev.target.value }))}
        />
        <textarea
          className="impetus-input"
          placeholder="Descrição / evidência"
          rows={2}
          value={form.message}
          onChange={(ev) => setForm((f) => ({ ...f, message: ev.target.value }))}
        />
        <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', borderRadius: 4 }} disabled={submitting}>
          {submitting ? 'Publicando…' : 'Publicar evento'}
        </button>
      </form>

      {err ? <p style={{ color: 'var(--red)', fontSize: 13 }}>{err}</p> : null}

      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <div style={labelH}>Eventos recentes</div>
        {events.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Sem eventos no período.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {events.map((ev) => (
              <li
                key={ev.id || ev.correlation_id}
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: 8,
                  fontSize: 13
                }}
              >
                <div style={{ ...mono, color: 'var(--text-accent)', fontSize: 10 }}>{formatEventName(ev.event_name)}</div>
                <div style={{ color: 'var(--text-primary)' }}>
                  {ev.payload?.title || ev.payload?.message || ev.correlation_id}
                </div>
                <div style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 10, marginTop: 4 }}>
                  {ev.created_at ? new Date(ev.created_at).toLocaleString('pt-BR') : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default EnvironmentOperationalEventsPanel;
