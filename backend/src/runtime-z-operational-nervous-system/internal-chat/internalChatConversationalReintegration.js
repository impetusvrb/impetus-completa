'use strict';

module.exports = {
  postThreadReintegration: (...args) =>
    require('./internalChatOperationalRuntime').postThreadReintegration(...args),
  buildReintegrationMessage: (...args) =>
    require('./internalChatOperationalRuntime').buildReintegrationMessage(...args)
};
