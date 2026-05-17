/**
 * Helpers de navegação lateral — hotfix estabilidade (híbrido legacy + publication).
 * Sem dependências React; testável em Node (--experimental-vm-modules).
 */

/** @param {string} itemPath */
function splitMenuPath(itemPath) {
  const raw = String(itemPath || '');
  const qIdx = raw.indexOf('?');
  if (qIdx === -1) {
    const pathname = raw.replace(/\/+$/, '') || '/';
    return { pathname, searchParams: null };
  }
  const pathname = raw.slice(0, qIdx).replace(/\/+$/, '') || '/';
  const qs = raw.slice(qIdx + 1);
  return { pathname, searchParams: new URLSearchParams(qs) };
}

/**
 * Active state seguro para itens com query (?view=) vs pathname-only.
 * @param {string} itemPath
 * @param {string} locPathname
 * @param {string} locSearch — location.search, ex. ?view=governance
 */
export function isSidebarMenuItemActive(itemPath, locPathname, locSearch) {
  const pathNorm = String(locPathname || '').replace(/\/+$/, '') || '/';
  const { pathname: itemPn, searchParams: itemSp } = splitMenuPath(itemPath);
  if (itemPn !== pathNorm) return false;
  const have = new URLSearchParams(String(locSearch || '').replace(/^\?/, ''));
  if (!itemSp || [...itemSp.keys()].length === 0) {
    return !have.get('view');
  }
  for (const [k, v] of itemSp.entries()) {
    if (have.get(k) !== v) return false;
  }
  return true;
}

/**
 * Chave estável para React reconciliation (evita colisão quando vários itens partilham path+query).
 * @param {object} item
 * @param {number} index
 */
export function sidebarNavItemKey(item, index) {
  if (!item || item.settingsBack) return 'settings-back';
  if (item.settingsAnchor && item.hash) return `settings-${item.hash}`;
  if (item._quality_manifest_id) return `qnav-${item._quality_manifest_id}`;
  if (item._module_id) return `ctx-${item._module_id}`;
  if (item.path) return `p-${item.path}`;
  return `idx-${index}`;
}

/**
 * Deduplica entradas do menu sem fundir itens legacy/contextuais distintos no mesmo path canónico.
 * QUALITY: vários manifest ids podem apontar para a mesma URL — mantém o primeiro por id estável.
 *
 * @param {Array<object>} items
 */
export function dedupeSidebarMenuItems(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    if (item.settingsBack || item.settingsAnchor) {
      out.push(item);
      continue;
    }
    const key =
      item._quality_manifest_id
        ? `q:${item._quality_manifest_id}`
        : item._module_id
          ? `c:${item._module_id}`
          : (item.path || '').replace(/\/+$/, '') || '/';
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
