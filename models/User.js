const bcrypt = require('bcrypt');

class User {
  constructor(user) {
    this.id = user.id;
    this.name = user.name;
    this.email = user.email;
    this.password = user.password;
  }

  // Find user by email
  static findByEmail(email, users) {
    return users.find(user => user.email === email);
  }

  // Find user by ID
  static findById(id, users) {
    return users.find(user => user.id === id);
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
