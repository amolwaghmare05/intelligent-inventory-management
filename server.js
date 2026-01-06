const { app } = require('./app');
const dotenv = require('dotenv');
const User = require('./models/User');

// Load environment variables
dotenv.config();

// Initialize admin user in database before starting server
async function initializeAdmin() {
  if (process.env.login_id && process.env.login_password) {
    try {
      // Check if admin already exists in database
      const existingAdmin = await User.findByEmail(process.env.login_id);
      
      if (existingAdmin) {
        console.log('✓ Admin user already exists in database:', process.env.login_id);
      } else {
        // Create admin user in database
        const hashedPassword = await User.hashPassword(process.env.login_password);
        await User.create('Admin', process.env.login_id, hashedPassword);
        console.log('✓ Admin user created in database:', process.env.login_id);
      }
    } catch (error) {
      console.error('Error initializing admin user:', error);
      throw error;
    }
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
