const db = require('../config/database');

class Size {
  constructor(size) {
    this.size = size;
  }

  // Get all sizes
  static getAll() {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM sizedb', (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
  }

  // Get size by name
  static getByName(sizeName) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM sizedb WHERE Size = ?', [sizeName], (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results[0]);
      });
    });
  }

  // Create a new size
  save() {
    return new Promise((resolve, reject) => {
      db.query('INSERT INTO sizedb (Size) VALUES (?)', [this.size], (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  }

  // Delete a size
  static delete(sizeName) {
    return new Promise((resolve, reject) => {
      db.query('DELETE FROM sizedb WHERE Size = ?', [sizeName], (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  }
}

module.exports = Size;
