const { app } = require('./app');
const dotenv = require('dotenv');
const User = require('./models/User');
const db = require('./config/database');

// Load environment variables
dotenv.config();

// Create users table if it doesn't exist
async function createUsersTable() {
  return new Promise((resolve, reject) => {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `;
    
    db.query(createTableSQL, (error) => {
      if (error) {
        reject(error);
      } else {
        console.log('✓ Users table ready');
        resolve();
      }
    });
  });
}

// Initialize admin user in database before starting server
async function initializeAdmin() {
  if (process.env.login_id && process.env.login_password) {
    try {
      // First ensure users table exists
      await createUsersTable();
      
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
