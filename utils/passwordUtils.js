const bcrypt = require('bcrypt');

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password to hash
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compare a password with a hash
 * @param {string} password - Plain text password to check
 * @param {string} hash - Hashed password to compare against
 * @returns {Promise<boolean>} - True if password matches hash
 */
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Check if a password is already hashed
 * @param {string} password - Password to check
 * @returns {boolean} - True if password is already hashed
 */
function isPasswordHashed(password) {
  return password && (password.startsWith('$2b$') || password.startsWith('$2a$'));
}

module.exports = {
  hashPassword,
  comparePassword,
  isPasswordHashed
};
