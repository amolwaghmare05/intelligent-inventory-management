const db = require('../config/database');

class Order {
  constructor(order) {
    this.transactionId = order.transactionId;
    this.itemId = order.itemId;
    this.itemName = order.itemName;
    this.category = order.category;
    this.brand = order.brand;
    this.size = order.size;
    this.amount = order.amount;
    this.transactionDate = order.transactionDate;
    this.transactionTime = order.transactionTime;
    this.customerNumber = order.customerNumber;
    this.tDay = order.tDay;
    this.tMonth = order.tMonth;
    this.tYear = order.tYear;
  }

  // Get all orders
  static getAll() {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM ordersdb ORDER BY TYear DESC, TMonth DESC, TDay DESC', (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
  }

  // Get order by ID
  static getById(itemId) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM ordersdb WHERE ItemID = ?', [itemId], (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results[0]);
      });
    });
  }

  // Get orders by transaction ID
  static getByTransactionId(transactionId) {
    return new Promise((resolve, reject) => {
      db.query('SELECT * FROM ordersdb WHERE TransactionID = ?', [transactionId], (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
  }

  // Get orders by date range
  static getByDateRange(startDate, endDate) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM ordersdb WHERE TransactionDate BETWEEN ? AND ? ORDER BY TransactionDate DESC';
      db.query(query, [startDate, endDate], (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
  }

  // Get orders by month and year
  static getByMonthYear(month, year) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM ordersdb WHERE TMonth = ? AND TYear = ? ORDER BY TDay DESC';
      db.query(query, [month, year], (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
  }

  // Create a new order
  save() {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO ordersdb 
        (TransactionID, ItemID, ItemName, Category, Brand, Size, Amount, TransactionDate, TransactionTime, CustomerNumber, TDay, TMonth, TYear) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const values = [
        this.transactionId,
        this.itemId,
        this.itemName,
        this.category,
        this.brand,
        this.size,
        this.amount,
        this.transactionDate,
        this.transactionTime,
        this.customerNumber,
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

  // Delete an order
  static delete(itemId) {
    return new Promise((resolve, reject) => {
      db.query('DELETE FROM ordersdb WHERE ItemID = ?', [itemId], (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  }

  // Get sales statistics by month and year
  static getStatsByMonthYear(month, year) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          Brand, 
          Category, 
          COUNT(*) as Count, 
          SUM(Amount) as TotalAmount 
        FROM 
          ordersdb 
        WHERE 
          TMonth = ? AND TYear = ? 
        GROUP BY 
          Brand, Category
        ORDER BY 
          TotalAmount DESC
      `;
      
      db.query(query, [month, year], (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
  }

  // Get total sales for a month and year
  static getTotalSalesByMonthYear(month, year) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT SUM(Amount) as Amount, COUNT(*) as Count FROM ordersdb WHERE TMonth = ? AND TYear = ?';
      db.query(query, [month, year], (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results[0]);
      });
    });
  }

  // Get total sales for a year
  static getTotalSalesByYear(year) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT SUM(Amount) as Amount, COUNT(*) as Count FROM ordersdb WHERE TYear = ?';
      db.query(query, [year], (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results[0]);
      });
    });
  }

  // Get top selling items
  static getTopSellingItems(limit = 10) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          ItemName, 
          Category, 
          Brand, 
          COUNT(*) as Count, 
          SUM(Amount) as TotalAmount 
        FROM 
          ordersdb 
        GROUP BY 
          ItemName, Category, Brand
        ORDER BY 
          Count DESC
        LIMIT ?
      `;
      
      db.query(query, [limit], (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
  }
}

module.exports = Order;
