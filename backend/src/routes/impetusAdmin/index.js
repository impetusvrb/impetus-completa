'use strict';

const express = require('express');
const auth = require('./auth');
const dashboard = require('./dashboard');
const companies = require('./companies');
const logs = require('./logs');
const users = require('./users');
const incidents = require('./incidents');
const supportRecovery = require('./supportRecovery');
const securityDashboard = require('./securityDashboard');

const router = express.Router();

router.use('/auth', auth);
router.use('/dashboard', dashboard);
router.use('/companies', companies);
router.use('/logs', logs);
router.use('/users', users);
router.use('/incidents', incidents);
router.use('/support-recovery', supportRecovery);
router.use('/security-dashboard', securityDashboard);
router.use('/device-trust', require('./deviceTrust'));

module.exports = router;
