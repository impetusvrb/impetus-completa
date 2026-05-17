'use strict';

const { filterManifestByAudience } = require('./domainVisibilityEngine.cjs');

/**
 * @param {Array<object>} baseMenu
 * @param {Array<object>} manifestItems — { id, label, path, iconRef? }
 * @param {string} audienceBand
 * @param {object} [opts]
 * @param {function(string):boolean} [opts.itemVisible] extra predicate per item id
 */
function mergeDomainMenuItems(baseMenu, manifestItems, audienceBand, opts = {}) {
  const pred = typeof opts.itemVisible === 'function' ? opts.itemVisible : () => true;
  const items = filterManifestByAudience(manifestItems, audienceBand).filter((m) => pred(m.id));
  return { items, count: items.length };
}

module.exports = { mergeDomainMenuItems, filterManifestByAudience };
