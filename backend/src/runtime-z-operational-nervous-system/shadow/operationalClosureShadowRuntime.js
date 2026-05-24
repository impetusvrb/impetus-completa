'use strict';

module.exports = { diff: (a, b) => ({ delta: (a?.tasks?.length||0) - (b?.tasks?.length||0), shadow: true }) };
