'use strict';

module.exports = { suggestFollowup: (task) => ({ text: task?.title ? `Follow-up: ${task.title}` : null, assistive_only: true }) };
