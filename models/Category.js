const db = require('../config/database');

class Category {
  constructor(category) {
    this.category = category;
  }

  // Get all categories
  static getAll() {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM categorydb', (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
  }

  // Get category by name
  static getByName(categoryName) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM categorydb WHERE Category = ?', [categoryName], (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results[0]);
      });
    });
  }

  // Create a new category
  save() {
    return new Promise((resolve, reject) => {
      db.query('INSERT INTO categorydb (Category) VALUES (?)', [this.category], (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  }

  // Delete a category
  static delete(categoryName) {
    return new Promise((resolve, reject) => {
      db.query('DELETE FROM categorydb WHERE Category = ?', [categoryName], (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  }
}

module.exports = Category;
