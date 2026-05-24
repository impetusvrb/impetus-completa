'use strict';

module.exports = { bindTaskToThread: (t, thread) => ({ task_id: t?.id, thread_id: thread, bound: true }) };
