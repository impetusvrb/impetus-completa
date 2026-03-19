/**
 * IMPETUS - ManuIA 3D Vision - Chamada Claude API
 * Em prod: usa proxy backend /api/vision que injeta a chave server-side
 */
const ENDPOINT =
  import.meta.env.VITE_VISION_ENDPOINT ||
  import.meta.env.REACT_APP_VISION_ENDPOINT ||
  '/api/vision';

export async function callClaude({ system, messages, maxTokens = 1500 }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('impetus_token');
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system,
        messages
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || err?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.content && Array.isArray(data.content)) {
      const text = data.content.map((c) => c.text || '').join('');
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      try {
        return JSON.parse(cleaned);
      } catch {
        return { mainMessage: text, steps: [], parts: [], webSources: [] };
      }
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}
