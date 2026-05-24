'use strict';

module.exports = { prepareEscalation: (wf) => ({ prepared: true, workflow_id: wf?.id, approval_required: true, auto_execution: false }) };
