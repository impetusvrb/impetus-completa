'use strict';
module.exports={decide:c=>c&&c.deny?{verdict:'deny'}:c&&c.abstain?{verdict:'abstain'}:{verdict:'allow'}};