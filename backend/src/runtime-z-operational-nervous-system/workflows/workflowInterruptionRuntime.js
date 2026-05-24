'use strict';

module.exports = { detect: (ctx) => ({ interrupted: !!ctx?.pending }) };
