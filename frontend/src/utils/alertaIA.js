/**
 * Alertas críticos por voz — TTS via OpenAI (rota /dashboard/chat/voice/speak).
 */
const API_BASE = import.meta.env.VITE_API_URL || '/api';

function authHeadersJson() {
  const token = localStorage.getItem('impetus_token');
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function alertaIA(mensagem) {
  if (!mensagem || typeof mensagem !== 'string') return;
  const texto = mensagem.trim().slice(0, 4000);
  if (!texto) return;
  try {
    const res = await fetch(`${API_BASE}/dashboard/chat/voice/speak`, {
      method: 'POST',
      headers: authHeadersJson(),
      body: JSON.stringify({ text: texto, voice: 'nova', speed: 1 })
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    a.onended = () => URL.revokeObjectURL(url);
    a.play().catch(() => URL.revokeObjectURL(url));
  } catch (_) {}
}
