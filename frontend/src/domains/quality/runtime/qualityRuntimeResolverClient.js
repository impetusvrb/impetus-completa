/**
 * Cliente enterprise modular — resolve runtime dual (backend /api/internal/quality-universal/runtime/resolve).
 */

const DEFAULT_PREFIX = '/api/internal/quality-universal';

export async function resolveQualityRuntimeClient(api, opts = {}) {
  const prefix = opts.prefix || DEFAULT_PREFIX;
  const body = {
    company_id: opts.companyId,
    user: opts.user,
    functional_area: opts.functionalArea,
    client_hints: opts.clientHints || {}
  };
  const authHeaders = opts.getAuthHeaders ? await opts.getAuthHeaders() : {};
  const res = await api.post(`${prefix}/runtime/resolve`, body, { headers: authHeaders });
  return res.data?.resolved ?? res.data;
}

export default { resolveQualityRuntimeClient };
