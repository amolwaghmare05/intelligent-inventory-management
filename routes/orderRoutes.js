const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { checkAuthenticated } = require('../middleware/authMiddleware');
const { check } = require('express-validator');

// Order routes
router.get('/orders', checkAuthenticated, orderController.getAllOrders);
router.post('/orders', checkAuthenticated, orderController.filterOrders);
router.post('/deleteorder', checkAuthenticated, orderController.deleteOrder);

// Billing routes
router.get('/bill', checkAuthenticated, orderController.showBilling);
router.get('/billing', checkAuthenticated, orderController.showBilling); // Add route for /billing
router.post('/bill', checkAuthenticated, [
  check('customernumber')
    .trim()
    .notEmpty().withMessage('Customer number is required')
    .isLength({ min: 10, max: 10 }).withMessage('Customer number must be 10 digits')
    .matches(/^[0-9]+$/).withMessage('Customer number must contain only digits')
], orderController.submitBill);
router.post('/billing', checkAuthenticated, [
  check('customernumber')
    .trim()
    .notEmpty().withMessage('Customer number is required')
    .isLength({ min: 10, max: 10 }).withMessage('Customer number must be 10 digits')
    .matches(/^[0-9]+$/).withMessage('Customer number must contain only digits')
], orderController.submitBill);

// Sales filter routes
router.get('/sales_filter', checkAuthenticated, orderController.showSalesFilter);
router.post('/sales_filter', checkAuthenticated, orderController.filterSales);

module.exports = router;
