'use strict';

function deliverConsole(notification) {
  const line = `[SEC-05][${notification.severity}] ${notification.title} — ${notification.summary}`;
  console.log(line);
  return { channel: 'console', status: 'delivered', at: new Date().toISOString() };
}

module.exports = { deliverConsole };
