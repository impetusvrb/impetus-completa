'use strict';

module.exports = { prepare: (wf) => ({ workflow_id: wf?.id, approval_required: true }) };
