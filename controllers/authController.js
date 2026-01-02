const passport = require('passport');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Show login page
exports.showLogin = (req, res) => {
  res.render('login.ejs');
};

// Process login
exports.login = (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
};

// Show register page
exports.showRegister = (req, res) => {
  res.render('register.ejs', { errors: [], name: '', email: '' });
};

// Process registration
exports.register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('register.ejs', { 
        errors: errors.array(),
        name: req.body.name,
        email: req.body.email
      });
    }
    
    // If validation passes, hash the password and create the user
    const hashedPassword = await User.hashPassword(req.body.password);
    
    // Add user to the users array (in a real app, this would be a database operation)
    global.users.push({
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword
    });
    
    req.flash('success', 'Registration successful! You can now log in.');
    res.redirect('/login');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error', 'An error occurred during registration');
    res.redirect('/register');
  }
};

// Logout
exports.logout = (req, res) => {
  req.logOut();
  res.redirect('/login');
};

// Hash all plain-text passwords (admin only)
exports.hashPasswords = async (req, res) => {
  try {
    // Only allow admin users to access this route
    if (req.user.email !== process.env.login_id) {
      req.flash('error', 'You do not have permission to access this page');
      return res.redirect('/dashboard');
    }
    
    // Get all users with plain-text passwords
    const usersWithPlainTextPasswords = global.users.filter(
      user => !User.isPasswordHashed(user.password)
    );
    
    if (usersWithPlainTextPasswords.length === 0) {
      req.flash('info', 'All passwords are already hashed');
      return res.redirect('/dashboard');
    }
    
    // Hash each plain-text password
    let updatedCount = 0;
    for (const user of usersWithPlainTextPasswords) {
      const hashedPassword = await User.hashPassword(user.password);
      user.password = hashedPassword;
      updatedCount++;
    }
    
    req.flash('success', `Successfully hashed ${updatedCount} passwords`);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error hashing passwords:', error);
    req.flash('error', 'An error occurred while hashing passwords');
    res.redirect('/dashboard');
  }
};
