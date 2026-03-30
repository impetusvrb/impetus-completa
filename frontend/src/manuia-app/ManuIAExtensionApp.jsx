/**
 * ManuIA — app de extensão da manutenção (mobile-first, PWA-ready).
 * Reutiliza: página ManuIA (embedded), API manutencao-ia + /manutencao-ia/app/*
 */
import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  LayoutDashboard,
  Bell,
  ClipboardList,
  Wrench,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { manuiaApp } from '../services/api';
import { useManuiaPush } from './hooks/useManuiaPush';
import './ManuIAExtensionApp.css';

const ManuIA = lazy(() => import('../pages/ManuIA'));

const VIEWS = {
  dashboard: 'dashboard',
  alerts: 'alerts',
  orders: 'orders',
  tools: 'tools',
  settings: 'settings'
};

export default function ManuIAExtensionApp() {
  const [view, setView] = useState(VIEWS.dashboard);
  const [dash, setDash] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [orders, setOrders] = useState([]);
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const { requestPermission, subscribeAndRegister } = useManuiaPush();

  useEffect(() => {
    let link = document.querySelector('link[rel="manifest"][data-manuia-app]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manuia-app-manifest.json';
      link.setAttribute('data-manuia-app', '1');
      document.head.appendChild(link);
    }
    const theme = document.querySelector('meta[name="theme-color"]');
    if (!theme) {
      const m = document.createElement('meta');
      m.name = 'theme-color';
      m.content = '#0d8a5b';
      document.head.appendChild(m);
    }
    return () => {
      if (link?.parentNode) link.parentNode.removeChild(link);
    };
  }, []);

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const dRes = await manuiaApp.getDashboard().catch(() => ({ data: {} }));
      const d = dRes.data || {};
      setDash(d);
      setInbox(Array.isArray(d.recent_inbox) ? d.recent_inbox : []);
      setOrders(Array.isArray(d.recent_work_orders) ? d.recent_work_orders : []);
      let pr = d.preferences || null;
      if (!pr) {
        const pRes = await manuiaApp.getPreferences().catch(() => ({ data: {} }));
        pr = pRes.data?.data ?? null;
      }
      setPrefs(pr);
      const iRes = await manuiaApp.getInbox({ limit: 40 }).catch(() => ({ data: {} }));
      if (iRes.data?.items?.length) setInbox(iRes.data.items);
      const oRes = await manuiaApp.getWorkOrders({ limit: 30 }).catch(() => ({ data: {} }));
      if (oRes.data?.items?.length) setOrders(oRes.data.items);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const savePrefs = async (patch) => {
    try {
      const r = await manuiaApp.putPreferences(patch);
      setPrefs(r.data?.data || patch);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message);
    }
  };

  const ack = async (id) => {
    try {
      await manuiaApp.ackInbox(id);
      await load();
    } catch (_) {
      /* ignore */
    }
  };

  const markAttending = async (id) => {
    try {
      await manuiaApp.patchInboxAttendance(id, { attendance_status: 'in_progress' });
      await load();
    } catch (_) {
      /* ignore */
    }
  };

  return (
    <div className="manuia-app">
      <header className="manuia-app__top">
        <div className="manuia-app__brand">
          <LayoutDashboard size={22} color="#3ecf8e" />
          <div>
            <h1>ManuIA Campo</h1>
            <span>Extensão de manutenção · Impetus</span>
          </div>
        </div>
        <button
          type="button"
          className="manuia-app__btn manuia-app__btn--ghost"
          style={{ minHeight: 40, padding: '0 12px', fontSize: 12 }}
          onClick={async () => {
            setErr('');
            await requestPermission();
            const r = await subscribeAndRegister();
            if (!r?.ok) {
              setErr(
                r?.reason === 'no_vapid'
                  ? 'Push não configurado no servidor (MANUIA_VAPID_*).'
                  : r?.detail || r?.reason || 'Não foi possível ativar o push.'
              );
            }
          }}
        >
          Ativar push
        </button>
      </header>

      <main className="manuia-app__body">
        {loading && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8b9aab' }}>
                <Loader2 size={18} className="manuia-spinner-sm" />{' '}
            Carregando…
          </p>
        )}
        {err && (
          <p style={{ color: '#f87171', fontSize: 14 }}>
            <AlertTriangle size={16} style={{ verticalAlign: 'text-bottom' }} /> {err}
          </p>
        )}

        {view === VIEWS.dashboard && !loading && (
          <>
            <div className="manuia-app__card-grid" style={{ marginBottom: 16 }}>
              <div className="manuia-app__stat">
                <strong>{dash?.summary?.inbox_unread ?? 0}</strong>
                <span>Alertas não lidos</span>
              </div>
              <div className="manuia-app__stat">
                <strong>{dash?.summary?.work_orders_open ?? 0}</strong>
                <span>OS em aberto</span>
              </div>
              <div className="manuia-app__stat">
                <strong>{dash?.summary?.machines_count ?? 0}</strong>
                <span>Máquinas ManuIA</span>
              </div>
              <div className="manuia-app__stat">
                <strong>{dash?.summary?.on_call ? 'Sim' : 'Não'}</strong>
                <span>Plantão agora</span>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#8b9aab', lineHeight: 1.5 }}>
              Use as abas abaixo para alertas, ordens de serviço e ferramentas de diagnóstico. As notificações inteligentes e
              políticas de silêncio são aplicadas no servidor conforme o seu perfil e horário.
            </p>
          </>
        )}

        {view === VIEWS.alerts && (
          <div className="manuia-app__list">
            <h2 style={{ fontSize: '1rem', margin: '0 0 10px' }}>Alertas</h2>
            {inbox.length === 0 && <p style={{ color: '#8b9aab' }}>Nenhum alerta na caixa.</p>}
            {inbox.map((n) => (
              <div
                key={n.id}
                className={`manuia-app__row ${
                  n.alert_level === 'critical'
                    ? 'manuia-app__row--critical'
                    : n.alert_level === 'urgent'
                      ? 'manuia-app__row--urgent'
                      : ''
                }`}
              >
                <span className="manuia-app__pill">{n.alert_level || 'normal'}</span>
                {n.attendance_status && n.attendance_status !== 'open' && (
                  <span className="manuia-app__pill" style={{ marginLeft: 6 }}>
                    {n.attendance_status}
                  </span>
                )}
                <strong style={{ fontSize: 15 }}>{n.title}</strong>
                {n.body && <span style={{ fontSize: 13, color: '#b8c5d4' }}>{n.body}</span>}
                {(!n.attendance_status || n.attendance_status === 'open') && (
                  <button
                    type="button"
                    className="manuia-app__btn manuia-app__btn--ghost"
                    style={{ marginTop: 8, marginRight: 8 }}
                    onClick={() => markAttending(n.id)}
                  >
                    Em atendimento
                  </button>
                )}
                {!n.acknowledged_at && (
                  <button type="button" className="manuia-app__btn manuia-app__btn--primary" style={{ marginTop: 8 }} onClick={() => ack(n.id)}>
                    <CheckCircle2 size={16} style={{ verticalAlign: 'middle' }} /> Confirmar recebimento
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {view === VIEWS.orders && (
          <div className="manuia-app__list">
            <h2 style={{ fontSize: '1rem', margin: '0 0 10px' }}>Minhas ordens de serviço</h2>
            {orders.length === 0 && <p style={{ color: '#8b9aab' }}>Nenhuma OS atribuída a você.</p>}
            {orders.map((w) => (
              <div key={w.id} className="manuia-app__row">
                <span className="manuia-app__pill">{w.status}</span>
                <strong>{w.title}</strong>
                <span style={{ fontSize: 13, color: '#8b9aab' }}>
                  {w.machine_name || '—'} · {w.priority || 'normal'}
                </span>
              </div>
            ))}
          </div>
        )}

        {view === VIEWS.tools && (
          <div className="manuia-app--embedded" style={{ margin: '-14px -16px 0' }}>
            <Suspense
              fallback={
                <p style={{ padding: 24, color: '#8b9aab' }}>
                  <Loader2 size={18} className="manuia-spinner-sm" /> Abrindo ferramentas…
                </p>
              }
            >
              <ManuIA embedded />
            </Suspense>
          </div>
        )}

        {view === VIEWS.settings && prefs && (
          <div className="manuia-app__list">
            <h2 style={{ fontSize: '1rem', margin: '0 0 12px' }}>Silêncio e plantão</h2>
            <div className="manuia-app__field" style={{ marginBottom: 12 }}>
              <label>Máximo de interrupção permitido</label>
              <select
                value={prefs.max_interruption_level || 'urgent'}
                onChange={(e) => savePrefs({ max_interruption_level: e.target.value })}
              >
                <option value="silent">Só silencioso (central)</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgente</option>
                <option value="critical_only">Apenas críticos (com som)</option>
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={!!prefs.on_call}
                onChange={(e) => savePrefs({ on_call: e.target.checked })}
              />
              Estou de plantão agora
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={prefs.allow_critical_outside_hours !== false}
                onChange={(e) => savePrefs({ allow_critical_outside_hours: e.target.checked })}
              />
              Permitir alertas críticos fora do expediente
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={!!prefs.allow_urgent_outside_hours}
                onChange={(e) => savePrefs({ allow_urgent_outside_hours: e.target.checked })}
              />
              Permitir urgentes fora do expediente
            </label>
          </div>
        )}

        {view === VIEWS.settings && !prefs && !loading && (
          <p style={{ color: '#8b9aab' }}>Preferências indisponíveis. Execute a migration do backend (manuia_extension_app).</p>
        )}
      </main>

      <nav className="manuia-app__nav" aria-label="Navegação principal">
        <button
          type="button"
          className={view === VIEWS.dashboard ? 'manuia-app__nav--active' : ''}
          onClick={() => setView(VIEWS.dashboard)}
        >
          <LayoutDashboard size={22} />
          Início
        </button>
        <button
          type="button"
          className={view === VIEWS.alerts ? 'manuia-app__nav--active' : ''}
          onClick={() => setView(VIEWS.alerts)}
        >
          <Bell size={22} />
          Alertas
        </button>
        <button
          type="button"
          className={view === VIEWS.orders ? 'manuia-app__nav--active' : ''}
          onClick={() => setView(VIEWS.orders)}
        >
          <ClipboardList size={22} />
          OS
        </button>
        <button
          type="button"
          className={view === VIEWS.tools ? 'manuia-app__nav--active' : ''}
          onClick={() => setView(VIEWS.tools)}
        >
          <Wrench size={22} />
          Ferramentas
        </button>
        <button
          type="button"
          className={view === VIEWS.settings ? 'manuia-app__nav--active' : ''}
          onClick={() => setView(VIEWS.settings)}
        >
          <Settings size={22} />
          Ajustes
        </button>
      </nav>
    </div>
  );
}
