/**
 * URLs de media protegidas (uploads autenticados) — expõe object URL com Authorization.
 */

import { useEffect, useState } from 'react';

function toAbsoluteUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t) return null;
  if (t.startsWith('http') || t.startsWith('blob:') || t.startsWith('data:')) return t;
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}${t.startsWith('/') ? '' : '/'}${t}`;
}

export function useProtectedMediaSrc(rawUrl) {
  const [src, setSrc] = useState(() => {
    if (!rawUrl) return null;
    const u = toAbsoluteUrl(rawUrl);
    if (u && (u.startsWith('blob:') || u.startsWith('data:'))) return u;
    return null;
  });

  useEffect(() => {
    if (!rawUrl) {
      setSrc(null);
      return undefined;
    }
    const abs = toAbsoluteUrl(rawUrl);
    if (!abs) {
      setSrc(null);
      return undefined;
    }
    if (abs.startsWith('blob:') || abs.startsWith('data:')) {
      setSrc(abs);
      return undefined;
    }

    let revoked = false;
    let objectUrl = null;

    const run = async () => {
      try {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('impetus_token') : null;
        const res = await fetch(abs, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!revoked) setSrc(objectUrl);
      } catch {
        if (!revoked) setSrc(abs);
      }
    };
    run();

    return () => {
      revoked = true;
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          /* ignore */
        }
      }
    };
  }, [rawUrl]);

  return src;
}
