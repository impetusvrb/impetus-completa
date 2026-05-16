'use strict';
const ALLOWED=['count','percent','celsius','kg','ton','kwh','ppm','ms','min','h'];
module.exports={ALLOWED,normalizeUnit:u=>{const x=String(u||'').toLowerCase();return ALLOWED.includes(x)?x:null;}};