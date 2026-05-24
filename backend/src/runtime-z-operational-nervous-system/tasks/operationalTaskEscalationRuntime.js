'use strict';

module.exports = { prepare: (task) => ({ task_id: task?.id, depth_max: 3, approval_required: true }) };
