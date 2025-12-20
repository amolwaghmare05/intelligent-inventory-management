const db = require('../config/database');

class Stock {
  constructor(stock) {
    this.itemId = stock.itemId;
    this.itemName = stock.itemName;
    this.category = stock.category;
    this.brand = stock.brand;
    this.size = stock.size;
    this.amount = stock.amount;
    this.stockDate = stock.stockDate;
    this.stockTime = stock.stockTime;
    this.tDay = stock.tDay;
    this.tMonth = stock.tMonth;
    this.tYear = stock.tYear;
  }

  // Get all stock items
  static getAll() {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM stockdb ORDER BY TYear DESC, TMonth DESC, TDay DESC, StockTime DESC', (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
  }

  // Get stock item by ID
  static getById(itemId) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM stockdb WHERE ItemID = ?', [itemId], (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results[0]);
      });
    });
  }

  // Get stock items by category
  static getByCategory(category) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM stockdb WHERE Category = ?', [category], (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
  }

  // Get stock items by brand
  static getByBrand(brand) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM stockdb WHERE Brand = ?', [brand], (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
  }

  // Create a new stock item
  save() {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO stockdb 
        (ItemID, ItemName, Category, Brand, Size, Amount, StockDate, StockTime, TDay, TMonth, TYear) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const values = [
        this.itemId,
        this.itemName,
        this.category,
        this.brand,
        this.size,
        this.amount,
        this.stockDate,
        this.stockTime,
        this.tDay,
        this.tMonth,
        this.tYear
      ];

      db.query(query, values, (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  }

  // Update a stock item
  update() {
    return new Promise((resolve, reject) => {
      const query = `UPDATE stockdb SET 
        ItemName = ?, 
        Category = ?, 
        Brand = ?, 
        Size = ?, 
        Amount = ?, 
        StockDate = ?, 
        StockTime = ?, 
        TDay = ?, 
        TMonth = ?, 
        TYear = ? 
        WHERE ItemID = ?`;
      
      const values = [
        this.itemName,
        this.category,
        this.brand,
        this.size,
        this.amount,
        this.stockDate,
        this.stockTime,
        this.tDay,
        this.tMonth,
        this.tYear,
        this.itemId
      ];

      db.query(query, values, (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  }

  // Delete a stock item
  static delete(itemId) {
    return new Promise((resolve, reject) => {
      db.query('DELETE FROM stockdb WHERE ItemID = ?', [itemId], (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  }

  // Get stock statistics by brand
  static getStatsByBrand() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT Brand, COUNT(*) AS Count, SUM(Amount) AS Amount FROM stockdb GROUP BY Brand';
      db.query(query, (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
  }

  // Get stock statistics by category
  static getStatsByCategory() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT Category, COUNT(*) AS Count, SUM(Amount) AS Amount FROM stockdb GROUP BY Category';
      db.query(query, (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
  }

  // Get total stock count
  static getTotalCount() {
    return new Promise((resolve, reject) => {
      db.query('SELECT COUNT(*) AS Count FROM stockdb', (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results[0].Count);
      });
    });
  }
}

module.exports = Stock;
