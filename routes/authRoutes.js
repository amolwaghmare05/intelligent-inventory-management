const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const { checkAuthenticated, checkNotAuthenticated } = require('../middleware/authMiddleware');

// Login routes
router.get('/login', checkNotAuthenticated, authController.showLogin);
router.post('/login', checkNotAuthenticated, authController.login);

// Register routes
router.get('/register', checkNotAuthenticated, authController.showRegister);
router.post('/register', checkNotAuthenticated, [
  // Input validation
  check('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  check('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  check('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character'),
  check('password-confirm')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
], authController.register);

// Logout route
router.delete('/logout', authController.logout);

// Admin route to hash all plain-text passwords
router.get('/admin/hash-passwords', checkAuthenticated, authController.hashPasswords);

module.exports = router;
