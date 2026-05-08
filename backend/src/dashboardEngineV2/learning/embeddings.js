'use strict';

/**
 * Embeddings (PREPARAÇÃO ESTRUTURAL) — esqueleto para futura geração e
 * persistência de embeddings de utilizadores e widgets.
 *
 * Esta camada NÃO chama nenhum modelo. Define apenas:
 *   - `buildUserContextDocument(user, identity)` — texto canónico do
 *     utilizador (para futuro embedding).
 *   - `buildWidgetDocument(widgetId)` — texto canónico do widget.
 *   - registry vazio para futuro store de embeddings.
 *
 * Quando o IMPETUS implementar IA adaptativa, basta plugar:
 *   `embeddings.setProvider({ embed: async (text) => Float32Array })`
 */

const _state = {
  provider: null,
  storage: new Map() // chave → { vector, meta, generated_at }
};

function setProvider(provider) {
  _state.provider = provider && typeof provider.embed === 'function' ? provider : null;
}

function clearStorage() {
  _state.storage.clear();
}

function buildUserContextDocument(user, identity) {
  const parts = [];
  if (user?.role) parts.push(`role:${user.role}`);
  if (user?.job_title) parts.push(`cargo:${user.job_title}`);
  if (identity?.area) parts.push(`area:${identity.area}`);
  if (identity?.function_type) parts.push(`funcao:${identity.function_type}`);
  if (identity?.primary_axis) parts.push(`eixo_primario:${identity.primary_axis}`);
  if (Array.isArray(identity?.axes_priority)) parts.push(`eixos:${identity.axes_priority.join(',')}`);
  if (Array.isArray(identity?.capabilities)) parts.push(`capabilities:${identity.capabilities.join(',')}`);
  if (Number.isFinite(user?.hierarchy_level)) parts.push(`hierarquia:${user.hierarchy_level}`);
  return parts.join(' | ');
}

function buildWidgetDocument(widgetId) {
  return `widget:${widgetId}`;
}

/**
 * Gera (e guarda) embedding do utilizador. Sem provider, devolve null.
 */
async function embedUser(user, identity) {
  if (!_state.provider) return null;
  const doc = buildUserContextDocument(user, identity);
  const vector = await _state.provider.embed(doc);
  const key = `user:${user?.id || 'anon'}`;
  const entry = { vector, meta: { doc, user_id: user?.id ?? null }, generated_at: Date.now() };
  _state.storage.set(key, entry);
  return entry;
}

async function embedWidget(widgetId) {
  if (!_state.provider) return null;
  const doc = buildWidgetDocument(widgetId);
  const vector = await _state.provider.embed(doc);
  const key = `widget:${widgetId}`;
  const entry = { vector, meta: { doc, widget_id: widgetId }, generated_at: Date.now() };
  _state.storage.set(key, entry);
  return entry;
}

function get(key) {
  return _state.storage.get(key) || null;
}

module.exports = {
  setProvider,
  clearStorage,
  buildUserContextDocument,
  buildWidgetDocument,
  embedUser,
  embedWidget,
  get,
  _state
};
