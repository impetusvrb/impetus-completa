/**
 * Saudação contextual Anam — hora local do browser + nome do utilizador Impetus.
 */

export function getStoredUserDisplayName() {
  try {
    const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    return String(u?.name || u?.full_name || u?.nome || u?.display_name || '').trim();
  } catch {
    return '';
  }
}

export function getStoredUserFirstName() {
  const full = getStoredUserDisplayName();
  if (full) return full.split(/\s+/)[0] || '';
  try {
    const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    const email = String(u?.email || '').trim();
    if (email.includes('@')) return email.split('@')[0];
  } catch (_) {}
  return '';
}

/** @returns {'manha'|'tarde'|'noite'} */
export function getTimePeriod(localHour = new Date().getHours()) {
  const h = Number(localHour);
  if (h >= 5 && h < 12) return 'manha';
  if (h >= 12 && h < 18) return 'tarde';
  return 'noite';
}

export function getTimeOfDayGreeting(localHour = new Date().getHours()) {
  const period = getTimePeriod(localHour);
  if (period === 'manha') return 'Bom dia';
  if (period === 'tarde') return 'Boa tarde';
  return 'Boa noite';
}

export function buildAnamOpeningLine(opts = {}) {
  const hour = opts.localHour ?? new Date().getHours();
  const greeting = getTimeOfDayGreeting(hour);
  const firstName = String(opts.userFirstName ?? getStoredUserFirstName()).trim();
  if (firstName) {
    return `${greeting}, ${firstName}. Como posso ajudar?`;
  }
  return `${greeting}. Como posso ajudar?`;
}

export function getAnamSessionContextPayload() {
  const userDisplayName = getStoredUserDisplayName() || getStoredUserFirstName();
  let timezone = 'America/Sao_Paulo';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone;
  } catch (_) {}
  return {
    userDisplayName,
    localHour: new Date().getHours(),
    timezone
  };
}
