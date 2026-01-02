const express = require('express');
const router = express.Router();
const sizeController = require('../controllers/sizeController');
const { checkAuthenticated } = require('../middleware/authMiddleware');

// Size routes
router.get('/sizes', checkAuthenticated, sizeController.getAllSizes);
router.post('/sizes', checkAuthenticated, sizeController.addSize);
router.post('/deletesize', checkAuthenticated, sizeController.deleteSize);

module.exports = router;
