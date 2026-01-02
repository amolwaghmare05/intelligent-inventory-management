const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { checkAuthenticated } = require('../middleware/authMiddleware');

// Stock routes
router.get('/stocks', checkAuthenticated, stockController.getAllStocks);
router.post('/stocks', checkAuthenticated, stockController.addStock);
router.get('/viewstocks', checkAuthenticated, stockController.viewStocks);
router.post('/deletestock', checkAuthenticated, stockController.deleteStock);
router.get('/stock_filter', checkAuthenticated, stockController.showStockFilter);
router.post('/stock_filter', checkAuthenticated, stockController.filterStocks);

module.exports = router;
