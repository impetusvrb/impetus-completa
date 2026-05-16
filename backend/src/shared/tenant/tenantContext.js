'use strict';
function requireCompanyId(c){const id=String(c||'').trim();if(!/^[0-9a-f-]{36}$/i.test(id))throw Object.assign(new Error('company_id required'),{code:'TENANT_CONTEXT_INVALID'});return id;}
module.exports={requireCompanyId};
