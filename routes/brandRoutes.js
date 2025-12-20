const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');
const { checkAuthenticated } = require('../middleware/authMiddleware');

// Brand routes
router.get('/brands', checkAuthenticated, brandController.getAllBrands);
router.post('/brands', checkAuthenticated, brandController.addBrand);
router.post('/deletebrand', checkAuthenticated, brandController.deleteBrand);

module.exports = router;
