import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { api, clearToken, setToken } from '../api/http';
import { getAdminDeviceId, getDeviceLabel } from '../utils/deviceId';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('impetus_admin_token');
    if (!t) {
      setLoading(false);
      return;
    }
    api('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, senha, botPayload = {}) => {
    const r = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        senha,
        device_id: getAdminDeviceId(),
        device_label: getDeviceLabel(),
        ...botPayload
      })
    });
    if (r.mfa_required && r.mfa_challenge_token) {
      return r;
    }
    setToken(r.token);
    setUser(r.user);
    return r;
  };

  const verifyMfa = async (mfa_challenge_token, code) => {
    const r = await api('/auth/login/mfa-verify', {
      method: 'POST',
      body: JSON.stringify({
        mfa_challenge_token,
        code,
        device_id: getAdminDeviceId(),
        device_label: getDeviceLabel()
      })
    });
    setToken(r.token);
    setUser(r.user);
    return r;
  };

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch (_) {}
    clearToken();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      verifyMfa,
      logout,
      isAuthenticated: !!user
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth');
  return ctx;
}
