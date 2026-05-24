'use strict';

module.exports = { detect: (deadline) => deadline && new Date(deadline) < new Date() };
