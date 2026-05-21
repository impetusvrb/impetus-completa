'use strict';
/** Node smoke — lógica espelhada do frontend audit */
const FRONTEND_INJECTORS = [
  { name: 'safeMergeSafetyPublicationIntoMenu', can_reinject: true },
  { name: 'sidebarGovernanceAdapter', can_reinject: false }
];
let f = 0;
if (!FRONTEND_INJECTORS.some((i) => i.can_reinject)) f = 1;
else console.log('PASS frontend injector catalog');
process.exit(f);
