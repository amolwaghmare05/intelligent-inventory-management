const bcrypt = require('bcrypt');
const db = require('../config/database');

class User {
  constructor(user) {
    this.id = user.id;
    this.name = user.name;
    this.email = user.email;
    this.password = user.password;
  }

  // Create a new user in database
  static async create(name, email, hashedPassword) {
    return new Promise((resolve, reject) => {
      const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
      db.query(query, [name, email, hashedPassword], (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            id: results.insertId,
            name,
            email,
            password: hashedPassword
          });
        }
      });
    });
  }

  // Find user by email
  static async findByEmail(email) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE email = ?';
      db.query(query, [email], (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results.length > 0 ? results[0] : null);
        }
      });
    });
  }

  // Find user by ID
  static async findById(id) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE id = ?';
      db.query(query, [id], (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results.length > 0 ? results[0] : null);
        }
      });
    });
  }

  // Get all users
  static async findAll() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT id, name, email, created_at FROM users ORDER BY created_at DESC';
      db.query(query, (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });
  }

  // Hash password
  static async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  // Compare password
  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Check if password is already hashed
  static isPasswordHashed(password) {
    return password.startsWith('$2b$') || password.startsWith('$2a$');
  }
}

module.exports = User;
