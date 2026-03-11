const messagingAdapter = require('./messagingAdapter');
  await messagingAdapter.sendMessage(companyId, toSend, message);
}

module.exports = {
  findCEOByWhatsApp,
  processCEOMessage,
  sendCEOResponse,
  logExecutiveAction,
  isExecutiveSessionValid,
  renewExecutiveSession,
  computeDocumentHash,
  VERIFICATION_REQUEST,
  BLOCKED_RESPONSE
};
