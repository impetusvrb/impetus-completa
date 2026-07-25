import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/http';

export default function Login() {
  const { login, verifyMfa, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mfaPending, setMfaPending] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [botMode, setBotMode] = useState('loading');
  const [challengeToken, setChallengeToken] = useState('');
  const [challengeQuestion, setChallengeQuestion] = useState('');
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);

  const loadHumanCheck = useCallback(async () => {
    try {
      const cfg = await api('/auth/bot-config');
      if (!cfg.humanCheckEnabled || cfg.mode === 'disabled') {
        setBotMode('disabled');
        return;
      }
      if (cfg.mode === 'turnstile' && cfg.siteKey) {
        setBotMode('turnstile');
        setTurnstileSiteKey(cfg.siteKey);
        setTurnstileToken('');
        return;
      }
      const ch = await api('/auth/human-check');
      setBotMode('challenge');
      setChallengeToken(ch.challengeToken || '');
      setChallengeQuestion(ch.question || '');
      setChallengeAnswer('');
    } catch (e) {
      setBotMode('error');
      setErr(e.message || 'Não foi possível carregar a verificação de segurança.');
    }
  }, []);

  const fallbackToChallenge = useCallback(async () => {
    try {
      const ch = await api('/auth/human-check');
      setBotMode('challenge');
      setTurnstileSiteKey('');
      setTurnstileToken('');
      setChallengeToken(ch.challengeToken || '');
      setChallengeQuestion(ch.question || '');
      setChallengeAnswer('');
      setErr('');
    } catch (e) {
      setBotMode('error');
      setErr(e.message || 'Verificação indisponível. Recarregue a página.');
    }
  }, []);

  useEffect(() => {
    loadHumanCheck();
  }, [loadHumanCheck]);

  useEffect(() => {
    if (botMode !== 'turnstile' || !turnstileSiteKey || !turnstileRef.current) return undefined;

    let fallbackTimer;

    const renderWidget = () => {
      if (!window.turnstile || !turnstileRef.current) return;
      if (widgetIdRef.current != null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (_) {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: turnstileSiteKey,
        theme: 'dark',
        callback: (token) => {
          clearTimeout(fallbackTimer);
          setTurnstileToken(token);
        },
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => {
          setTurnstileToken('');
          fallbackToChallenge();
        }
      });
      fallbackTimer = setTimeout(() => fallbackToChallenge(), 12000);
    };

    if (window.turnstile) {
      renderWidget();
      return () => clearTimeout(fallbackTimer);
    }

    const existing = document.querySelector('script[data-impetus-turnstile]');
    if (existing) {
      const onErr = () => fallbackToChallenge();
      existing.addEventListener('load', renderWidget);
      existing.addEventListener('error', onErr);
      fallbackTimer = setTimeout(() => fallbackToChallenge(), 12000);
      return () => {
        existing.removeEventListener('load', renderWidget);
        existing.removeEventListener('error', onErr);
        clearTimeout(fallbackTimer);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.impetusTurnstile = '1';
    script.onload = renderWidget;
    script.onerror = () => fallbackToChallenge();
    document.head.appendChild(script);
    fallbackTimer = setTimeout(() => fallbackToChallenge(), 12000);
    return () => {
      script.onload = null;
      script.onerror = null;
      clearTimeout(fallbackTimer);
    };
  }, [botMode, turnstileSiteKey, fallbackToChallenge]);

  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const botReady =
    botMode === 'disabled' ||
    botMode === 'loading' ||
    (botMode === 'challenge' && challengeToken && challengeAnswer.trim() !== '') ||
    (botMode === 'turnstile' && !!turnstileToken);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');

    if (botMode === 'challenge' && !challengeAnswer.trim()) {
      setErr('Responda à verificação anti-robô.');
      return;
    }
    if (botMode === 'turnstile' && !turnstileToken) {
      setErr('Complete a verificação anti-robô.');
      return;
    }

    setSubmitting(true);
    try {
      const r = await login(email.trim(), senha, {
        challengeToken: botMode === 'challenge' ? challengeToken : undefined,
        challengeAnswer: botMode === 'challenge' ? challengeAnswer.trim() : undefined,
        turnstileToken: botMode === 'turnstile' ? turnstileToken : undefined,
        _hp: honeypot
      });
      if (r.mfa_required && r.mfa_challenge_token) {
        setMfaPending({ token: r.mfa_challenge_token, preview: r.user_preview });
        return;
      }
      navigate('/', { replace: true });
    } catch (e2) {
      const code = e2.data?.code;
      if (code === 'ADMIN_DEVICE_PENDING') {
        setErr('Dispositivo pendente de aprovação. Peça a um super administrador para autorizar em Dispositivos autorizados.');
      } else if (code === 'ADMIN_IP_NOT_AUTHORIZED') {
        setErr(e2.message || 'IP ou rede não autorizada para esta conta.');
      } else {
        setErr(e2.message || 'Falha no login');
      }
      if (botMode === 'challenge') await loadHumanCheck();
      if (botMode === 'turnstile' && window.turnstile && widgetIdRef.current != null) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch (_) {
          /* ignore */
        }
        setTurnstileToken('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitMfa = async (e) => {
    e.preventDefault();
    if (!mfaPending?.token || !mfaCode.trim()) return;
    setErr('');
    setSubmitting(true);
    try {
      await verifyMfa(mfaPending.token, mfaCode.trim());
      navigate('/', { replace: true });
    } catch (e2) {
      setErr(e2.message || 'Código 2FA inválido');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(0, 212, 255, 0.12), transparent 55%), var(--bg0)'
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', letterSpacing: 1 }}>IMPETUS Admin</h1>
        <p className="muted" style={{ marginBottom: '1.5rem' }}>
          {mfaPending ? 'Confirme o código do autenticador' : 'Acesso restrito à equipe interna'}
        </p>
        {mfaPending ? (
          <form onSubmit={submitMfa}>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              {mfaPending.preview?.email || email}
            </p>
            <label className="label">Código 2FA (6 dígitos)</label>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              required
              autoFocus
            />
            {err && <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginTop: 10 }}>{err}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={submitting}>
              {submitting ? 'A verificar…' : 'Confirmar'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => {
                setMfaPending(null);
                setMfaCode('');
                setErr('');
              }}
            >
              Voltar
            </button>
          </form>
        ) : (
        <form onSubmit={submit}>
          <label className="label">E-mail</label>
          <input
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="label" style={{ marginTop: 12 }}>
            Senha
          </label>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          {botMode === 'challenge' && (
            <div
              style={{
                marginTop: 14,
                padding: '12px 14px',
                border: '1px solid var(--line)',
                borderRadius: 4,
                background: 'rgba(0, 212, 255, 0.04)'
              }}
            >
              <div
                className="label"
                style={{ marginBottom: 8, color: 'var(--cyan)', letterSpacing: 1.5 }}
              >
                VERIFICAÇÃO — NÃO É UM ROBÔ
              </div>
              <p className="muted" style={{ margin: '0 0 10px', fontSize: '0.85rem' }}>
                {challengeQuestion}
              </p>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Resposta"
                value={challengeAnswer}
                onChange={(e) => setChallengeAnswer(e.target.value)}
                required
              />
            </div>
          )}

          {botMode === 'turnstile' && (
            <div style={{ marginTop: 14 }}>
              <div
                className="label"
                style={{ marginBottom: 8, color: 'var(--cyan)', letterSpacing: 1.5 }}
              >
                VERIFICAÇÃO — NÃO É UM ROBÔ
              </div>
              <div ref={turnstileRef} />
            </div>
          )}

          {botMode === 'loading' && (
            <p className="muted" style={{ marginTop: 14, fontSize: '0.85rem' }}>
              A carregar verificação de segurança…
            </p>
          )}

          {/* Honeypot — bots preenchem; humanos não veem */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
            aria-hidden="true"
          />

          {err && (
            <p style={{ color: 'var(--red)', fontSize: '0.9rem', marginTop: 10 }}>{err}</p>
          )}
          <button
            type="submit"
            className="btn btn--primary"
            style={{ width: '100%', marginTop: 18 }}
            disabled={submitting || botMode === 'loading' || botMode === 'error' || !botReady}
          >
            {submitting ? 'Autenticando…' : 'Entrar'}
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
