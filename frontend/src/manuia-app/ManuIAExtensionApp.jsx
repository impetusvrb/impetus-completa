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
  Loader2,
  Sun,
  Moon,
  X,
  ExternalLink
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
  const [lightMode, setLightMode] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem('manuia_app_theme') === 'light'
  );
  const [filterAlertLevel, setFilterAlertLevel] = useState('');
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [occurrence, setOccurrence] = useState(null);
  const [escalateNote, setEscalateNote] = useState('');
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
      let dRes;
      try {
        dRes = await manuiaApp.getDashboard();
      } catch (e) {
        const st = e?.response?.status;
        const code = e?.response?.data?.code;
        if (st === 403 || code === 'MAINTENANCE_PROFILE_REQUIRED') {
          setErr(
            e?.response?.data?.error ||
              'Acesso restrito: o ManuIA Campo exige perfil de manutenção (técnico, supervisor ou coordenador de manutenção). Peça ao administrador para ajustar o cargo ou o dashboard_profile.'
          );
          setDash(null);
          setInbox([]);
          setOrders([]);
          setPrefs(null);
          return;
        }
        dRes = { data: {} };
      }
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
      const inboxParams = { limit: 60 };
      if (filterAlertLevel) inboxParams.alert_level = filterAlertLevel;
      if (filterUnreadOnly) inboxParams.unread_only = 'true';
      const iRes = await manuiaApp.getInbox(inboxParams).catch(() => ({ data: {} }));
      const inboxItems = iRes.data?.items;
      if (Array.isArray(inboxItems)) setInbox(inboxItems);
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
  }, [filterAlertLevel, filterUnreadOnly]);

  useEffect(() => {
    try {
      localStorage.setItem('manuia_app_theme', lightMode ? 'light' : 'dark');
    } catch {
      /* ignore */
    }
  }, [lightMode]);

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
      if (occurrence?.id === id) setOccurrence((o) => (o ? { ...o, attendance_status: 'in_progress' } : null));
      await load();
    } catch (_) {
      /* ignore */
    }
  };

  const openLinkedWorkOrder = (n) => {
    const wo = n?.payload?.work_order_id || n?.work_order_id;
    if (wo) window.location.href = `/diagnostic?context=wo&id=${encodeURIComponent(wo)}`;
    else window.location.href = '/diagnostic';
  };

  const runEscalate = async () => {
    if (!occurrence?.id) return;
    setErr('');
    try {
      await manuiaApp.escalateInbox(occurrence.id, { note: escalateNote });
      setEscalateNote('');
      setOccurrence(null);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || 'Escalação indisponível (verifique MANUIA_MANUAL_ESCALATION_ENABLED).');
    }
  };

  return (
    <div className={`manuia-app${lightMode ? ' manuia-app--light' : ''}`}>
      <header className="manuia-app__top">
        <div className="manuia-app__brand">
          <LayoutDashboard size={22} color="#3ecf8e" />
          <div>
            <h1>ManuIA Campo</h1>
            <span>Extensão de manutenção · Impetus</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="manuia-app__btn manuia-app__btn--ghost"
            style={{ minHeight: 40, minWidth: 40, padding: 8 }}
            title={lightMode ? 'Modo escuro' : 'Modo claro'}
            onClick={() => setLightMode((v) => !v)}
            aria-label="Alternar tema"
          >
            {lightMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>
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
        </div>
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
            <div className="manuia-app__filters" style={{ marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <label style={{ fontSize: 13, color: '#8b9aab', display: 'flex', alignItems: 'center', gap: 6 }}>
                Criticidade
                <select
                  className="manuia-app__select"
                  value={filterAlertLevel}
                  onChange={(e) => setFilterAlertLevel(e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="silent">Silencioso</option>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgente</option>
                  <option value="critical">Crítico</option>
                </select>
              </label>
              <label style={{ fontSize: 13, color: '#8b9aab', display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={filterUnreadOnly}
                  onChange={(e) => setFilterUnreadOnly(e.target.checked)}
                />
                Só não lidos
              </label>
            </div>
            {inbox.length === 0 && <p style={{ color: '#8b9aab' }}>Nenhum alerta na caixa.</p>}
            {inbox.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setOccurrence(n);
                }}
                onClick={() => setOccurrence(n)}
                className={`manuia-app__row manuia-app__row--clickable ${
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
                    onClick={(e) => {
                      e.stopPropagation();
                      markAttending(n.id);
                    }}
                  >
                    Em atendimento
                  </button>
                )}
                {!n.acknowledged_at && (
                  <button
                    type="button"
                    className="manuia-app__btn manuia-app__btn--primary"
                    style={{ marginTop: 8 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      ack(n.id);
                    }}
                  >
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

      {occurrence && (
        <div className="manuia-app__drawer-backdrop" role="presentation" onClick={() => setOccurrence(null)}>
          <div
            className="manuia-app__drawer"
            role="dialog"
            aria-labelledby="manuia-occ-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="manuia-app__drawer-top">
              <h2 id="manuia-occ-title" style={{ margin: 0, fontSize: '1.05rem' }}>
                Ocorrência
              </h2>
              <button type="button" className="manuia-app__btn manuia-app__btn--ghost" onClick={() => setOccurrence(null)} aria-label="Fechar">
                <X size={22} />
              </button>
            </div>
            <div className="manuia-app__drawer-body">
              <span className="manuia-app__pill">{occurrence.alert_level || 'normal'}</span>
              {occurrence.attendance_status && (
                <span className="manuia-app__pill" style={{ marginLeft: 8 }}>
                  {occurrence.attendance_status}
                </span>
              )}
              <p style={{ margin: '12px 0 8px', fontWeight: 600 }}>{occurrence.title}</p>
              {occurrence.body && <p style={{ fontSize: 14, color: '#b8c5d4', lineHeight: 1.45 }}>{occurrence.body}</p>}
              {occurrence.payload && typeof occurrence.payload === 'object' && (
                <pre className="manuia-app__payload-preview">{JSON.stringify(occurrence.payload, null, 2)}</pre>
              )}
              <label style={{ display: 'block', fontSize: 13, color: '#8b9aab', marginTop: 12 }}>
                Nota para supervisão (opcional)
                <textarea
                  className="manuia-app__textarea"
                  rows={2}
                  value={escalateNote}
                  onChange={(e) => setEscalateNote(e.target.value)}
                  style={{ width: '100%', marginTop: 6, borderRadius: 8, padding: 8 }}
                />
              </label>
            </div>
            <div className="manuia-app__drawer-actions">
              <button type="button" className="manuia-app__btn manuia-app__btn--ghost" onClick={() => openLinkedWorkOrder(occurrence)}>
                <ExternalLink size={16} style={{ verticalAlign: 'middle' }} /> Abrir diagnóstico / OS
              </button>
              <button type="button" className="manuia-app__btn manuia-app__btn--primary" onClick={runEscalate}>
                Escalar supervisão
              </button>
            </div>
          </div>
        </div>
      )}

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
