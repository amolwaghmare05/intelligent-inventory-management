const express = require('express');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const helmet = require('helmet');
const { check, validationResult } = require('express-validator');

// Load environment variables
dotenv.config();

// Import middleware
const { csrfProtection, loginLimiter, helmetConfig, apiSecurityHeaders } = require('./middleware/securityMiddleware');

// Import database connection
const mysqlConnection = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const brandRoutes = require('./routes/brandRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const sizeRoutes = require('./routes/sizeRoutes');
const stockRoutes = require('./routes/stockRoutes');
const orderRoutes = require('./routes/orderRoutes');
const forecastRoutes = require('./routes/forecastRoutes');
const predictionRoutes = require('./routes/predictionRoutes');

// Import passport config
const initializePassport = require('./config/passport-config');

// Create Express app
const app = express();

// Initialize global users array (in a real app, this would be a database)
global.users = [];

// Add admin user from environment variables
const User = require('./models/User');
(async () => {
  if (process.env.login_id && process.env.login_password) {
    const hashedPassword = await User.hashPassword(process.env.login_password);
    global.users.push({
      id: 'admin',
      name: 'Admin',
      email: process.env.login_id,
      password: hashedPassword
    });
    console.log('Admin user initialized with email:', process.env.login_id);
  }
})();

// Initialize Passport
initializePassport(
  passport,
  email => global.users.find(user => user.email === email),
  id => global.users.find(user => user.id === id)
);

// Set view engine
app.set('view engine', 'ejs');

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// Security middleware
app.use(helmet(helmetConfig));
// Login rate limiter removed to allow unlimited login attempts
app.use('/api', apiSecurityHeaders);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true, // Prevents client-side JS from reading the cookie
    secure: process.env.NODE_ENV === 'production', // Requires HTTPS in production
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // Prevents CSRF attacks
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());

// CSRF protection (must be after session middleware)
app.use(csrfProtection);

// Method override for DELETE requests
app.use(methodOverride('_method'));

// Add CSRF token to all views
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/', brandRoutes);
app.use('/', categoryRoutes);
app.use('/', sizeRoutes);
app.use('/', stockRoutes);
app.use('/', orderRoutes);
app.use('/', forecastRoutes);
app.use('/', predictionRoutes);

// Root route - redirect to login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404.ejs');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error.ejs', { error: err });
});

// Export app and database connection
module.exports = { app, mysqlConnection };
