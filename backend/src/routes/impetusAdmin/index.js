'use strict';

const express = require('express');
const auth = require('./auth');
const dashboard = require('./dashboard');
const companies = require('./companies');
const logs = require('./logs');
const users = require('./users');
const incidents = require('./incidents');

const router = express.Router();

router.use('/auth', auth);
router.use('/dashboard', dashboard);
router.use('/companies', companies);
router.use('/logs', logs);
router.use('/users', users);
router.use('/incidents', incidents);

module.exports = router;
