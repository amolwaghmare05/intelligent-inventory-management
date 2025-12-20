const db = require('../config/database');

class Brand {
  constructor(brand) {
    this.brand = brand;
  }

  // Get all brands
  static getAll() {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM branddb', (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
  }

  // Get brand by name
  static getByName(brandName) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM branddb WHERE Brand = ?', [brandName], (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results[0]);
      });
    });
  }

  // Create a new brand
  save() {
    return new Promise((resolve, reject) => {
      db.query('INSERT INTO branddb (Brand) VALUES (?)', [this.brand], (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  }

  // Delete a brand
  static delete(brandName) {
    return new Promise((resolve, reject) => {
      db.query('DELETE FROM branddb WHERE Brand = ?', [brandName], (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  }
}

module.exports = Brand;
