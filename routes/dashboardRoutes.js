const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { checkAuthenticated } = require('../middleware/authMiddleware');

// Dashboard route
router.get('/dashboard', checkAuthenticated, dashboardController.showDashboard);

module.exports = router;
