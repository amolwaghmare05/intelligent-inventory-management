const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');
const { checkAuthenticated } = require('../middleware/authMiddleware');

// Top selling prediction route
router.get('/top-selling-prediction', checkAuthenticated, predictionController.showTopSellingPrediction);

module.exports = router;
