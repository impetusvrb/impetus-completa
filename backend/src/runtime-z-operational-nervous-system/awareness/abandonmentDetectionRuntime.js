'use strict';

module.exports = { detect: (wf) => wf?.closure_state === 'open' && !wf?.owner_id };
