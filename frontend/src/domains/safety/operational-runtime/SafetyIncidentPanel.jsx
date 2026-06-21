import React, { useState, useEffect, useCallback } from 'react';
import { safeUUID } from '../../../utils/safeUuid.js';
import { safetyOperational as sstApi, dashboard } from '../../../services/api.js';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };
const labelH = { ...mono, color: 'var(--text-tertiary)', marginBottom: 6 };

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, flex: '1 1 160px' }}>
      <div style={labelH}>{label}</div>
      <div style={{ fontSize: 24, color: color || 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{value ?? '—'}</div>
      {sub ? <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

const KIND_LABELS = {
  incident: 'Incidente',
  near_miss: 'Quase-acidente',
  training_expired: 'Treinamento vencido'
};

export function SafetyIncidentPanel({ companyId }) {
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    kind: 'incident',
    title: '',
    message: '',
    location: '',
    severity: 'media'
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [sumRes, evRes] = await Promise.all([
        sstApi.getEventsSummary(),
        sstApi.listEvents({ limit: 15 })
      ]);
      setSummary(sumRes.data?.summary || null);
      setEvents(evRes.data?.events || []);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || 'Falha ao carregar SST');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    setErr('');
    try {
      await sstApi.registerEvent({
        kind: form.kind,
        title: form.title.trim(),
        message: form.message.trim() || form.title.trim(),
        location: form.location.trim() || undefined,
        severity: form.severity,
        correlation_id: safeUUID()
      });
      setForm({ kind: 'incident', title: '', message: '', location: '', severity: 'media' });
      await load();
    } catch (ex) {
      setErr(ex?.response?.data?.error || ex.message || 'Erro ao registrar');
    } finally {
      setSubmitting(false);
    }
  };

  const resolve = async (id) => {
    try {
      await dashboard.operationalBrain.resolveAlert(id);
      await load();
    } catch (ex) {
      setErr(ex?.response?.data?.error || 'Erro ao resolver alerta');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ ...mono, color: 'var(--cyan)' }}>Incidentes · Quase-acidentes · Treinamentos</div>

      {loading && !summary ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Carregando…</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <KpiCard label="Incidentes abertos" value={summary?.incidents ?? 0} color="var(--red)" />
          <KpiCard label="Quase-acidentes" value={summary?.near_misses ?? 0} color="var(--amber)" />
          <KpiCard label="Treinamentos vencidos" value={summary?.training_alerts ?? 0} color="var(--amber)" />
          <KpiCard label="Total SST activo" value={summary?.total ?? 0} sub="operational_alerts" />
        </div>
      )}

      <form className="impetus-card" style={{ padding: '1rem', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 10 }} onSubmit={submit}>
        <div style={labelH}>Registrar evento SST</div>
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
          placeholder="Título / resumo"
          value={form.title}
          onChange={(ev) => setForm((f) => ({ ...f, title: ev.target.value }))}
          required
          style={{ borderRadius: 4 }}
        />
        <textarea
          className="impetus-input"
          placeholder="Descrição"
          rows={3}
          value={form.message}
          onChange={(ev) => setForm((f) => ({ ...f, message: ev.target.value }))}
          style={{ borderRadius: 4, resize: 'vertical' }}
        />
        <input
          className="impetus-input"
          placeholder="Local (linha, setor…)"
          value={form.location}
          onChange={(ev) => setForm((f) => ({ ...f, location: ev.target.value }))}
          style={{ borderRadius: 4 }}
        />
        <button type="submit" className="btn-primary" style={{ minHeight: 44, borderRadius: 4, alignSelf: 'flex-start' }} disabled={submitting}>
          {submitting ? 'Registando…' : 'Registar evento'}
        </button>
      </form>

      {err ? <p style={{ color: 'var(--amber)', fontSize: 12, margin: 0 }}>{err}</p> : null}

      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ ...mono, color: 'var(--text-secondary)' }}>Eventos recentes</span>
          <button type="button" className="btn-ghost" style={{ minHeight: 32, borderRadius: 4, fontSize: 11 }} onClick={load} disabled={loading}>
            Actualizar
          </button>
        </div>
        {events.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>Nenhum evento SST pendente.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {events.map((ev) => (
              <li
                key={ev.id}
                style={{
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{ev.titulo}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                    {ev.tipo_alerta} · {ev.severidade} · {ev.created_at ? new Date(ev.created_at).toLocaleString('pt-BR') : '—'}
                  </div>
                </div>
                <button type="button" className="btn-ghost" style={{ minHeight: 32, borderRadius: 4, fontSize: 11 }} onClick={() => resolve(ev.id)}>
                  Resolver
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default SafetyIncidentPanel;
