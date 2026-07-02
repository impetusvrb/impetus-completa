/**
 * Cache de visible_modules por sessão — evita menu "piscar" entre carregamentos e falhas 503.
 */
const CACHE_KEY = 'impetus_menu_stability_v1';

function readStoredUserId() {
  try {
    const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    return u?.id || null;
  } catch {
    return null;
  }
}

export function readMenuStabilityCache(userId = readStoredUserId()) {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (userId && data.userId && data.userId !== userId) return [];
    return Array.isArray(data.modules) ? data.modules : [];
  } catch {
    return [];
  }
}

export function writeMenuStabilityCache(modules, userId = readStoredUserId()) {
  try {
    if (!userId || !Array.isArray(modules) || modules.length === 0) return;
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ userId, modules, at: Date.now() })
    );
  } catch {
    /* ignore quota */
  }
}

export function clearMenuStabilityCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
