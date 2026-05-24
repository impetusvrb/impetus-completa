'use strict';

module.exports = { detect: (ctx) => (Date.now() - new Date(ctx?.last_message_at || Date.now()).getTime() > 6e6) };
