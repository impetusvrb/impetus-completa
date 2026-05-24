'use strict';

module.exports = { infer: (ent) => ({ risk: !!ent?.urgent }) };
