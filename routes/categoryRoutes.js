const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { checkAuthenticated } = require('../middleware/authMiddleware');

// Category routes
router.get('/categories', checkAuthenticated, categoryController.getAllCategories);
router.post('/categories', checkAuthenticated, categoryController.addCategory);
router.post('/deletecategory', checkAuthenticated, categoryController.deleteCategory);

module.exports = router;
