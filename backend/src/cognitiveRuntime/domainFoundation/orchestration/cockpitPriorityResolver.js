'use strict';

function resolveCockpitPriorities(blocks = [], opts = {}) {
  const maxVisible = opts.max_visible ?? 6;
  const visible = [];
  const deferred = [];

  for (let i = 0; i < blocks.length; i++) {
    if (i < maxVisible) {
      visible.push({ ...blocks[i], visibility: 'primary', priority_rank: i });
    } else {
      deferred.push({ ...blocks[i], visibility: 'deferred', priority_rank: i });
    }
  }

  return { visible, deferred, total: blocks.length };
}

module.exports = { resolveCockpitPriorities };
