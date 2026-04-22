/**
 * Configurações do usuário — perfil, segurança, notificações no app, canais de acesso, preferências e sessões.
 * Operação (tarefas, alertas, mensagens) exclusivamente no app IMPETUS; e-mail e WhatsApp só para segurança.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  User,
  Shield,
  Bell,
  KeyRound,
  Smartphone,
  Mail,
  Monitor,
  Palette,
  Loader2,
  Upload,
  Trash2,
  LogOut,
  Settings
} from 'lucide-react';
import Layout from '../components/Layout';
import { CheckboxField } from '../components/FormField';
import { meAccount } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useProtectedMediaSrc } from '../utils/protectedUploadMedia';
import './UserSettings.css';

function UsProfileAvatar({ rawPath }) {
  const src = useProtectedMediaSrc(rawPath || null);
  if (!rawPath || !src) {
    return (
      <div className="us-avatar-placeholder">
        <User size={40} />
      </div>
    );
  }
  return <img src={src} alt="" className="us-avatar-img" />;
}

function syncLocalUser(profile) {
  try {
    const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    const next = {
      ...u,
      name: profile.name,
      email: profile.email,
      phone: profile.phone
    };
    const pic = profile.foto_perfil || profile.avatar_url;
    if (pic) next.avatar_url = pic;
    localStorage.setItem('impetus_user', JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function Badge({ ok, children }) {
  return <span className={`us-badge ${ok ? 'us-badge--ok' : 'us-badge--warn'}`}>{children}</span>;
}

export default function UserSettings() {
  const notify = useNotification();
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [verification, setVerification] = useState(null);
  const [notificationPrefs, setNotificationPrefs] = useState(null);
  const [uiPrefs, setUiPrefs] = useState(null);
  const [profileCompletion, setProfileCompletion] = useState(null);
  const [sessions, setSessions] = useState([]);

  const [form, setForm] = useState({});
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [codeEmail, setCodeEmail] = useState('');
  const [codeWa, setCodeWa] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await meAccount.get();
      if (!data.ok) throw new Error(data.error);
      setProfile(data.profile);
      setVerification(data.verification);
      setNotificationPrefs(data.notification_prefs);
      setUiPrefs(data.ui_prefs);
      setProfileCompletion(data.profile_completion);
      setForm({
        name: data.profile?.name || '',
        phone: data.profile?.phone || '',
        email: data.profile?.email || '',
        whatsapp_number: data.profile?.whatsapp_number || '',
        status_message: data.profile?.status_message || ''
      });
      try {
        const s = await meAccount.getSessions();
        if (s.data?.sessions) setSessions(s.data.sessions);
      } catch {
        setSessions([]);
      }
    } catch (e) {
      const status = e.response?.status;
      const msg =
        status === 404
          ? 'API de conta não encontrada (404). Confira: (1) backend reiniciado com código atual; (2) VITE_API_URL no build do front termina em /api (ex.: http://IP:4000/api); (3) GET /api/health/settings-module no servidor retorna JSON. Migration SQL em users se ainda não aplicada.'
          : e.response?.data?.error || e.message || 'Erro ao carregar configurações';
      setLoadError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  }, [notify.error]);

  useEffect(() => {
    load();
  }, [load]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await meAccount.patchProfile(form);
      if (!data.ok) throw new Error(data.error);
      setProfile(data.profile);
      setVerification(data.verification);
      setProfileCompletion(data.profile_completion);
      syncLocalUser(data.profile);
      notify.success('Perfil atualizado.');
    } catch (e) {
      notify.error(e.response?.data?.error || e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSaving(true);
    try {
      const { data } = await meAccount.uploadPhoto(file);
      if (!data.ok) throw new Error(data.error);
      const pic = data.foto_perfil || data.avatar_url;
      setProfile((p) => ({ ...p, foto_perfil: pic, avatar_url: pic }));
      syncLocalUser({ ...profile, foto_perfil: pic, avatar_url: pic, ...form });
      notify.success('Foto atualizada.');
    } catch (e) {
      notify.error(e.response?.data?.error || e.message || 'Erro no upload');
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = async () => {
    setSaving(true);
    try {
      const { data } = await meAccount.deleteAvatar();
      if (!data.ok) throw new Error(data.error);
      setProfile(data.profile);
      syncLocalUser({ ...data.profile, ...form });
      notify.success('Foto removida.');
    } catch (e) {
      notify.error(e.response?.data?.error || e.message || 'Erro ao remover');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (pwd.next !== pwd.confirm) {
      notify.warning('Nova senha e confirmação não coincidem.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await meAccount.changePassword({
        current_password: pwd.current,
        new_password: pwd.next,
        confirm_password: pwd.confirm
      });
      if (!data.ok) throw new Error(data.error);
      setPwd({ current: '', next: '', confirm: '' });
      notify.success('Senha alterada.');
    } catch (e) {
      notify.error(e.response?.data?.error || e.message || 'Erro ao alterar senha');
    } finally {
      setSaving(false);
    }
  };

  const sendCode = async (channel) => {
    setSaving(true);
    try {
      const { data } = await meAccount.sendVerifyCode(channel);
      if (!data.ok) throw new Error(data.error);
      notify.success(data.message || 'Código enviado.');
      if (data.dev_hint) notify.info(`(dev) Código: ${data.dev_hint}`);
    } catch (e) {
      notify.error(e.response?.data?.error || e.message || 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const confirmCode = async (channel, code) => {
    if (!code?.trim()) return;
    setSaving(true);
    try {
      const { data } = await meAccount.confirmVerifyCode(channel, code.trim());
      if (!data.ok) throw new Error(data.error);
      setVerification(data.verification);
      setProfile(data.profile);
      setProfileCompletion(data.profile_completion);
      if (channel === 'email') setCodeEmail('');
      else setCodeWa('');
      notify.success('Canal verificado.');
    } catch (e) {
      notify.error(e.response?.data?.error || e.message || 'Código inválido');
    } finally {
      setSaving(false);
    }
  };

  const saveNotif = async (patch) => {
    const next = { ...notificationPrefs, ...patch };
    setNotificationPrefs(next);
    try {
      const { data } = await meAccount.patchNotifications(patch);
      if (data.notification_prefs) setNotificationPrefs(data.notification_prefs);
    } catch (e) {
      notify.error(e.response?.data?.error || 'Erro ao salvar notificações');
      load();
    }
  };

  const saveUi = async (patch) => {
    const next = { ...uiPrefs, ...patch };
    setUiPrefs(next);
    try {
      const { data } = await meAccount.patchUi(patch);
      if (data.ui_prefs) setUiPrefs(data.ui_prefs);
      notify.success('Preferências salvas.');
    } catch (e) {
      notify.error(e.response?.data?.error || 'Erro ao salvar');
      load();
    }
  };

  const revokeSession = async (id) => {
    setSaving(true);
    try {
      const { data } = await meAccount.deleteSession(id);
      if (!data.ok) throw new Error(data.error);
      setSessions(data.sessions || []);
      notify.success('Sessão encerrada.');
    } catch (e) {
      notify.error(e.response?.data?.error || e.message || 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const revokeOthers = async () => {
    setSaving(true);
    try {
      const { data } = await meAccount.revokeOtherSessions();
      if (!data.ok) throw new Error(data.error);
      setSessions(data.sessions || []);
      notify.success(data.terminated ? `${data.terminated} sessão(ões) encerradas.` : 'Concluído.');
    } catch (e) {
      notify.error(e.response?.data?.error || e.message || 'Não foi possível encerrar outras sessões');
    } finally {
      setSaving(false);
    }
  };

  const ro = profile?.read_only || {};

  if (loading && !profile) {
    return (
      <Layout>
        <div className="user-settings-page user-settings-page--loading">
          <Loader2 className="us-spin" size={40} />
          <p>Carregando configurações…</p>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="user-settings-page">
          <div className="us-load-error">
            <h2 className="us-load-error__title">Não foi possível carregar as configurações</h2>
            <p className="us-load-error__text">{loadError || 'Erro desconhecido.'}</p>
            <button type="button" className="btn btn-primary" onClick={() => load()}>
              Tentar novamente
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const pic = profile?.foto_perfil || profile?.avatar_url;

  return (
    <Layout>
      <div className="user-settings-page">
        <header className="us-hero">
          <div className="us-hero__icon">
            <Settings size={28} strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="us-hero__title">Configurações</h1>
            <p className="us-hero__subtitle">
              O App IMPETUS centraliza toda a operação da empresa. WhatsApp e e-mail são usados apenas para segurança da
              conta.
            </p>
          </div>
        </header>

        <section id="us-perfil" className="us-card us-card--profile us-section-anchor">
          <div className="us-card__head">
            <User size={22} />
            <div>
              <h2 className="us-card__title">Perfil</h2>
              <p className="us-card__desc">Cargo, departamento e nível são definidos pela gestão do sistema.</p>
            </div>
          </div>
          <div className="us-profile-grid">
            <div className="us-avatar-block">
              <div className="us-avatar-wrap">
                <UsProfileAvatar rawPath={pic} />
              </div>
              <div className="us-avatar-actions">
                <label className="btn btn-secondary us-file-label">
                  <Upload size={16} /> Trocar foto
                  <input type="file" accept="image/jpeg,image/png,image/jpg" className="us-file-input" onChange={onPhoto} disabled={saving} />
                </label>
                {pic && (
                  <button type="button" className="btn btn-link us-link-danger" onClick={removePhoto} disabled={saving}>
                    <Trash2 size={16} /> Remover
                  </button>
                )}
              </div>
              {profileCompletion && (
                <div className="us-completion">
                  <div className="us-completion__top">
                    <span>Perfil {profileCompletion.percent}% completo</span>
                  </div>
                  <div className="us-completion__bar">
                    <div className="us-completion__fill" style={{ width: `${profileCompletion.percent}%` }} />
                  </div>
                  {profileCompletion.missing?.length > 0 && (
                    <ul className="us-completion__missing">
                      {profileCompletion.missing.slice(0, 5).map((m) => (
                        <li key={m}>Falta: {m}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="us-form-grid">
              <label className="form-label">Nome</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <label className="form-label">Telefone</label>
              <input
                className="form-input"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <label className="form-label">E-mail</label>
              <input
                className="form-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              <label className="form-label">WhatsApp (número para verificação de segurança)</label>
              <input
                className="form-input"
                value={form.whatsapp_number}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp_number: e.target.value }))}
                placeholder="DDD + número"
              />
              <label className="form-label">Mensagem de status</label>
              <input
                className="form-input"
                maxLength={280}
                value={form.status_message}
                onChange={(e) => setForm((f) => ({ ...f, status_message: e.target.value }))}
                placeholder="Breve mensagem visível no perfil"
              />
              <div className="us-readonly-grid">
                <div>
                  <span className="us-ro-label">Papel no sistema</span>
                  <div className="us-ro-value">{ro.role || '—'}</div>
                </div>
                <div>
                  <span className="us-ro-label">Cargo</span>
                  <div className="us-ro-value">{ro.job_title || '—'}</div>
                </div>
                <div>
                  <span className="us-ro-label">Departamento</span>
                  <div className="us-ro-value">{ro.department || '—'}</div>
                </div>
                <div>
                  <span className="us-ro-label">Nível / hierarquia</span>
                  <div className="us-ro-value">{ro.hierarchy_level != null ? String(ro.hierarchy_level) : '—'}</div>
                </div>
              </div>
              <div className="us-actions">
                <button type="button" className="btn btn-primary" onClick={saveProfile} disabled={saving}>
                  Salvar perfil
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="us-seguranca" className="us-card us-section-anchor">
          <div className="us-card__head">
            <Shield size={22} />
            <div>
              <h2 className="us-card__title">Segurança</h2>
              <p className="us-muted">
                WhatsApp e e-mail são utilizados apenas para confirmação de acesso, recuperação de senha e segurança da
                conta.
              </p>
            </div>
          </div>
          <div className="us-verify-row">
            <div>
              <span className="us-ro-label">E-mail</span>
              <Badge ok={verification?.email_verified}>{verification?.email_verified ? 'Verificado' : 'Não verificado'}</Badge>
            </div>
            <div>
              <span className="us-ro-label">WhatsApp</span>
              <Badge ok={verification?.whatsapp_verified}>
                {verification?.whatsapp_verified ? 'Verificado' : 'Não verificado'}
              </Badge>
            </div>
          </div>
          <div className="us-pwd-grid">
            <h3 className="us-subtitle">
              <KeyRound size={18} /> Alterar senha
            </h3>
            <input
              type="password"
              className="form-input"
              placeholder="Senha atual"
              value={pwd.current}
              onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
            />
            <input
              type="password"
              className="form-input"
              placeholder="Nova senha (mín. 8 caracteres)"
              value={pwd.next}
              onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
            />
            <input
              type="password"
              className="form-input"
              placeholder="Confirmar nova senha"
              value={pwd.confirm}
              onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
            />
            <button type="button" className="btn btn-primary" onClick={savePassword} disabled={saving}>
              Atualizar senha
            </button>
          </div>
          <div className="us-code-grid">
            <div className="us-code-block">
              <h4 className="us-subtitle-inline">
                <Mail size={16} /> E-mail
              </h4>
              <div className="us-inline-actions">
                <button type="button" className="btn btn-secondary" onClick={() => sendCode('email')} disabled={saving}>
                  Enviar código
                </button>
                <input
                  className="form-input us-code-input"
                  placeholder="Código"
                  value={codeEmail}
                  onChange={(e) => setCodeEmail(e.target.value)}
                />
                <button type="button" className="btn btn-primary" onClick={() => confirmCode('email', codeEmail)} disabled={saving}>
                  Confirmar
                </button>
              </div>
            </div>
            <div className="us-code-block">
              <h4 className="us-subtitle-inline">
                <Smartphone size={16} /> WhatsApp
              </h4>
              <div className="us-inline-actions">
                <button type="button" className="btn btn-secondary" onClick={() => sendCode('whatsapp')} disabled={saving}>
                  Enviar código
                </button>
                <input
                  className="form-input us-code-input"
                  placeholder="Código"
                  value={codeWa}
                  onChange={(e) => setCodeWa(e.target.value)}
                />
                <button type="button" className="btn btn-primary" onClick={() => confirmCode('whatsapp', codeWa)} disabled={saving}>
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="us-notificacoes" className="us-card us-card--accent us-section-anchor">
          <div className="us-card__head">
            <Bell size={22} />
            <div>
              <h2 className="us-card__title">Notificações do app</h2>
              <p className="us-muted">
                Toda a operação do sistema ocorre exclusivamente pelo App IMPETUS, garantindo rastreabilidade, segurança e
                controle. Tarefas, mensagens internas e alertas <strong>não</strong> são enviados por WhatsApp ou e-mail.
              </p>
            </div>
          </div>
          {notificationPrefs && (
            <div className="us-notif-list">
              <CheckboxField
                label="Push no app"
                name="push_enabled"
                checked={!!notificationPrefs.push_enabled}
                onChange={(e) => saveNotif({ push_enabled: e.target.checked })}
              />
              <CheckboxField label="Som" name="sound" checked={!!notificationPrefs.sound} onChange={(e) => saveNotif({ sound: e.target.checked })} />
              <CheckboxField
                label="Vibração (mobile)"
                name="vibration"
                checked={!!notificationPrefs.vibration}
                onChange={(e) => saveNotif({ vibration: e.target.checked })}
              />
              <CheckboxField
                label="Banner"
                name="banner"
                checked={!!notificationPrefs.banner}
                onChange={(e) => saveNotif({ banner: e.target.checked })}
              />
              <CheckboxField
                label="Notificações críticas sempre (mesmo com foco)"
                name="critical_always"
                checked={!!notificationPrefs.critical_always}
                onChange={(e) => saveNotif({ critical_always: e.target.checked })}
              />
              <CheckboxField
                label="Notificações normais"
                name="normal_enabled"
                checked={!!notificationPrefs.normal_enabled}
                onChange={(e) => saveNotif({ normal_enabled: e.target.checked })}
              />
              <CheckboxField
                label="Manter histórico de notificações no app"
                name="notification_history"
                checked={notificationPrefs.notification_history !== false}
                onChange={(e) => saveNotif({ notification_history: e.target.checked })}
              />
              <CheckboxField
                label="Modo foco (silencia normais; críticas seguem a regra acima)"
                name="focus_mode"
                checked={!!notificationPrefs.focus_mode}
                onChange={(e) => saveNotif({ focus_mode: e.target.checked })}
              />
              <CheckboxField
                label="Modo crítico (priorizar notificações críticas no app)"
                name="critical_priority_mode"
                checked={notificationPrefs.critical_priority_mode !== false}
                onChange={(e) => saveNotif({ critical_priority_mode: e.target.checked })}
              />
            </div>
          )}
        </section>

        <section id="us-canais" className="us-card us-section-anchor">
          <div className="us-card__head">
            <KeyRound size={22} />
            <div>
              <h2 className="us-card__title">Canais de confirmação de acesso</h2>
              <p className="us-muted">Somente segurança e verificação — não recebem tarefas nem alertas operacionais.</p>
            </div>
          </div>
          <div className="us-channel-list">
            <div className="us-channel-item">
              <Mail size={20} />
              <div>
                <div className="us-channel-label">E-mail cadastrado</div>
                <div className="us-channel-value">{profile?.email || '—'}</div>
                <div className="us-channel-meta">
                  <Badge ok={verification?.email_verified}>{verification?.email_verified ? 'Verificado' : 'Pendente'}</Badge>
                  {verification?.email_verified_at && (
                    <span className="us-date">Última confirmação: {new Date(verification.email_verified_at).toLocaleString('pt-BR')}</span>
                  )}
                </div>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => sendCode('email')} disabled={saving}>
                Reenviar código
              </button>
            </div>
            <div className="us-channel-item">
              <Smartphone size={20} />
              <div>
                <div className="us-channel-label">WhatsApp cadastrado</div>
                <div className="us-channel-value">{profile?.whatsapp_number || form.whatsapp_number || '—'}</div>
                <div className="us-channel-meta">
                  <Badge ok={verification?.whatsapp_verified}>{verification?.whatsapp_verified ? 'Verificado' : 'Pendente'}</Badge>
                  {verification?.whatsapp_verified_at && (
                    <span className="us-date">Última confirmação: {new Date(verification.whatsapp_verified_at).toLocaleString('pt-BR')}</span>
                  )}
                </div>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => sendCode('whatsapp')} disabled={saving}>
                Reenviar código
              </button>
            </div>
          </div>
        </section>

        <section id="us-preferencias" className="us-card us-section-anchor">
          <div className="us-card__head">
            <Palette size={22} />
            <div>
              <h2 className="us-card__title">Preferências do sistema</h2>
            </div>
          </div>
          {uiPrefs && (
            <div className="us-prefs-grid">
              <label className="form-label">Tema</label>
              <select
                className="form-input"
                value={uiPrefs.theme}
                onChange={(e) => saveUi({ theme: e.target.value })}
              >
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
                <option value="system">Sistema</option>
              </select>
              <label className="form-label">Densidade da interface</label>
              <select
                className="form-input"
                value={uiPrefs.density}
                onChange={(e) => saveUi({ density: e.target.value })}
              >
                <option value="compact">Compacta</option>
                <option value="normal">Normal</option>
                <option value="comfortable">Confortável</option>
              </select>
              <label className="form-label">Idioma</label>
              <select className="form-input" value={uiPrefs.locale} onChange={(e) => saveUi({ locale: e.target.value })}>
                <option value="pt-BR">Português (Brasil)</option>
              </select>
              <CheckboxField
                label="Sons do sistema"
                name="system_sounds"
                checked={!!uiPrefs.system_sounds}
                onChange={(e) => saveUi({ system_sounds: e.target.checked })}
              />
              <CheckboxField
                label="Animações"
                name="animations"
                checked={!!uiPrefs.animations}
                onChange={(e) => saveUi({ animations: e.target.checked })}
              />
            </div>
          )}
        </section>

        <section id="us-dispositivos" className="us-card us-section-anchor">
          <div className="us-card__head">
            <Monitor size={22} />
            <div>
              <h2 className="us-card__title">Dispositivos e sessões</h2>
              <p className="us-muted">Encerre acessos em outros aparelhos. O dispositivo atual aparece destacado.</p>
            </div>
          </div>
          {sessions.length === 0 ? (
            <div className="us-empty">
              <p>Nenhuma sessão ativa listada ou sessões não disponíveis para este tipo de login.</p>
            </div>
          ) : (
            <>
              <ul className="us-session-list">
                {sessions.map((s) => (
                  <li key={s.id} className={`us-session-item ${s.is_current ? 'us-session-item--current' : ''}`}>
                    <div>
                      <div className="us-session-title">
                        {s.device_label || 'Dispositivo'}
                        {s.is_current && <span className="us-pill">Atual</span>}
                      </div>
                      <div className="us-session-meta">
                        Último acesso: {s.last_activity ? new Date(s.last_activity).toLocaleString('pt-BR') : '—'}
                        {s.ip_address && <span> · IP {s.ip_address}</span>}
                      </div>
                    </div>
                    {!s.is_current && (
                      <button type="button" className="btn btn-secondary" onClick={() => revokeSession(s.id)} disabled={saving}>
                        <LogOut size={16} /> Encerrar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <div className="us-actions">
                <button type="button" className="btn btn-secondary" onClick={revokeOthers} disabled={saving}>
                  Encerrar todas as outras sessões
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </Layout>
  );
}
