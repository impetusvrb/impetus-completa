'use strict';

module.exports = { followup: (wf) => ({ workflow_id: wf?.id, assistive_only: true }) };
