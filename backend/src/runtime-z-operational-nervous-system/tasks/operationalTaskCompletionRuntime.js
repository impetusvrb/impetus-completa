'use strict';

module.exports = { closePrepared: (task) => ({ task_id: task?.id, completion_state: 'pending_hitl', auto_execution: false }) };
