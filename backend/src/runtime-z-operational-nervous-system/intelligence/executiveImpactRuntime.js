'use strict';

module.exports = { impact: (ent) => ({ executive: !!ent?.urgent, assistive_only: true }) };
