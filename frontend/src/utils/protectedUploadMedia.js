import { useEffect, useState } from 'react';

function apiRootPrefix() {
  const api = import.meta.env.VITE_API_URL || '/api';
  if (api.startsWith('http')) return api.replace(/\/$/, '');
  if (typeof window === 'undefined') return '/api';
  const base = window.location.origin;
  const path = api.startsWith('/') ? api : `/${api}`;
  return `${base}${path}`.replace(/\/$/, '');
}

export function toAbsoluteAssetUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const api = import.meta.env.VITE_API_URL || '/api';
  const API_BASE = api.startsWith('http')
    ? api.replace(/\/api\/?$/, '')
    : typeof window !== 'undefined'
      ? window.location.origin
      : '';
  return API_BASE + url;
}

export function isUploadsAssetUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('/uploads/')) return true;
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    return u.pathname.startsWith('/uploads/');
  } catch {
    return false;
  }
}

export function uploadsPathForApi(absOrRel) {
  if (absOrRel.startsWith('/uploads/')) return absOrRel.split('?')[0];
  try {
    const u = new URL(absOrRel);
    return u.pathname.split('?')[0];
  } catch {
    return absOrRel;
  }
}

export async function fetchUploadAsBlobUrl(absOrRel, { signal } = {}) {
  const abs = absOrRel.startsWith('http') ? absOrRel : toAbsoluteAssetUrl(absOrRel);
  const path = uploadsPathForApi(abs);
  if (!path.startsWith('/uploads/')) throw new Error('not_uploads');
  const token = localStorage.getItem('impetus_token');
  const url = `${apiRootPrefix()}/media/file?path=${encodeURIComponent(path)}`;
  const r = await fetch(url, {
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!r.ok) throw new Error(`media_${r.status}`);
  const blob = await r.blob();
  return URL.createObjectURL(blob);
}

/**
 * URL pronta para <img>/<video> — para /uploads/* usa Bearer via blob (rota pública desativada).
 */
function immediatePublicSrc(rawUrl) {
  if (!rawUrl) return null;
  if (isUploadsAssetUrl(rawUrl)) return null;
  try {
    const abs = rawUrl.startsWith('http') ? rawUrl : toAbsoluteAssetUrl(rawUrl);
    return abs ? encodeURI(abs) : null;
  } catch {
    return rawUrl.startsWith('http') ? rawUrl : toAbsoluteAssetUrl(rawUrl);
  }
}

export function useProtectedMediaSrc(rawUrl) {
  const [src, setSrc] = useState(() => immediatePublicSrc(rawUrl));

  useEffect(() => {
    let blobUrl;
    let cancelled = false;

    if (!rawUrl) {
      setSrc(null);
      return undefined;
    }

    if (!isUploadsAssetUrl(rawUrl)) {
      setSrc(immediatePublicSrc(rawUrl));
      return undefined;
    }

    setSrc(null);
    const abs = rawUrl.startsWith('http') ? rawUrl : toAbsoluteAssetUrl(rawUrl);
    fetchUploadAsBlobUrl(abs)
      .then((u) => {
        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }
        blobUrl = u;
        setSrc(u);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [rawUrl]);

  return src;
}
