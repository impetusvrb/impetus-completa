/**
 * Armazenamento offline qualidade — namespacing obrigatório por tenant (company_id).
 * Não utiliza localStorage para dados sensíveis.
 */
import { get, set, del, keys } from 'idb-keyval';

const BASE = 'impetus:quality_op:idb:v1';

function assertCompany(companyId) {
  if (!companyId || String(companyId).length < 30) {
    throw new Error('qualityOfflineStorage: company_id UUID obrigatório');
  }
}

function k(companyId, suffix) {
  return `${BASE}:${companyId}:${suffix}`;
}

export async function qStoreSet(companyId, suffix, value) {
  assertCompany(companyId);
  await set(k(companyId, suffix), value);
}

export async function qStoreGet(companyId, suffix) {
  assertCompany(companyId);
  return get(k(companyId, suffix));
}

export async function qStoreDel(companyId, suffix) {
  assertCompany(companyId);
  await del(k(companyId, suffix));
}

export async function qStoreKeysForTenant(companyId) {
  assertCompany(companyId);
  const prefix = `${BASE}:${companyId}:`;
  const all = await keys();
  return all.filter((x) => String(x).startsWith(prefix));
}
