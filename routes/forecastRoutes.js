const express = require('express');
const router = express.Router();
const forecastController = require('../controllers/forecastController');
const { checkAuthenticated } = require('../middleware/authMiddleware');

// Sales forecast route
router.get('/sales-forecast', checkAuthenticated, forecastController.showSalesForecast);

module.exports = router;
