const { app } = require('./app');
const dotenv = require('dotenv');
const User = require('./models/User');

// Load environment variables
dotenv.config();

// Initialize admin user before starting server
async function initializeAdmin() {
  if (process.env.login_id && process.env.login_password) {
    const hashedPassword = await User.hashPassword(process.env.login_password);
    global.users = [{
      id: 'admin',
      name: 'Admin',
      email: process.env.login_id,
      password: hashedPassword
    }];
    console.log('✓ Admin user initialized:', process.env.login_id);
  } else {
    console.warn('⚠ Warning: login_id or login_password not set in environment variables');
  }
}

// Set port
const PORT = process.env.PORT || 3000;

// Start server after initializing admin
initializeAdmin().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize admin user:', err);
  process.exit(1);
});
