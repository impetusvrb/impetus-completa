'use strict';

function getOperationalVisibilityMinimums(tier = 'operational') {
  const map = {
    executive: { min_modules: 4, strategic: ['dashboard', 'biblioteca', 'ai'] },
    operational: { min_modules: 4, toolkit: ['dashboard', 'operational', 'proaction', 'settings'] },
    coordination: { min_modules: 3, toolkit: ['dashboard', 'operational', 'settings'] }
  };
  return map[tier] || map.coordination;
}

module.exports = { getOperationalVisibilityMinimums };
