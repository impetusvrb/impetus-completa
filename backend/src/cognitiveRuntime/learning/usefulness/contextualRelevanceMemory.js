'use strict';

function rememberContextualRelevance(store = {}, domain = '', score = 0) {
  const key = `relevance_${domain}`;
  const history = store[key] || [];
  return { domain, history: [...history, { score, at: new Date().toISOString() }].slice(-20) };
}

module.exports = { rememberContextualRelevance };
