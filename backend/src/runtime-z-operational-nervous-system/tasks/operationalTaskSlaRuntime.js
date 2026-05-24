'use strict';

module.exports = { computeSla: (task) => ({ hours: task?.sla_hours || null, breached: false, assistive_only: true }) };
