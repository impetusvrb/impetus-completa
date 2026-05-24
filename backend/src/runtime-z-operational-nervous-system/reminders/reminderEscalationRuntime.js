'use strict';

module.exports = { prepare: (r) => ({ reminder_id: r?.id, approval_required: true }) };
