'use strict';

module.exports = { fuse: (ent) => ({ level: ent?.urgent ? 'high' : 'normal' }) };
