import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { api, clearToken, setToken } from '../api/http';

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

  const login = async (email, senha) => {
    const r = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha })
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
