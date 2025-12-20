/**
 * Data access utilities for AI/ML features
 * These functions interact with the database to fetch required data
 */

/**
 * Get daily sales data for a specific date range
 * @param {Object} connection - MySQL connection
 * @param {Date} startDate - Start date (inclusive)
 * @param {Date} endDate - End date (inclusive)
 * @returns {Promise<Array>} Sales data
 */
function getDailySales(connection, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT TransactionDate, SUM(Amount) as Amount
      FROM ordersdb
      WHERE STR_TO_DATE(TransactionDate, '%d/%m/%Y') 
      BETWEEN ? AND ?
      GROUP BY TransactionDate
      ORDER BY STR_TO_DATE(TransactionDate, '%d/%m/%Y')
    `;
    
    // Format dates for MySQL
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    connection.query(query, [
      formatDate(startDate),
      formatDate(endDate)
    ], (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results);
    });
  });
}

/**
 * Get monthly sales data by category
 * @param {Object} connection - MySQL connection
 * @param {Number} year - Year to filter
 * @returns {Promise<Array>} Sales by category
 */
function getMonthlySalesByCategory(connection, year) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        Category,
        TMonth as Month,
        SUM(Amount) as Amount
      FROM ordersdb
      WHERE TYear = ?
      GROUP BY Category, TMonth
      ORDER BY TMonth, Category
    `;
    
    connection.query(query, [year], (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results);
    });
  });
}

/**
 * Get monthly sales data by brand
 * @param {Object} connection - MySQL connection
 * @param {Number} year - Year to filter
 * @returns {Promise<Array>} Sales by brand
 */
function getMonthlySalesByBrand(connection, year) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        Brand,
        TMonth as Month,
        SUM(Amount) as Amount
      FROM ordersdb
      WHERE TYear = ?
      GROUP BY Brand, TMonth
      ORDER BY TMonth, Brand
    `;
    
    connection.query(query, [year], (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results);
    });
  });
}

/**
 * Get sales data for a specific product
 * @param {Object} connection - MySQL connection
 * @param {String} product - Product name or ID
 * @param {Number} limit - Maximum number of records to return
 * @returns {Promise<Array>} Product sales data
 */
function getProductSales(connection, product, limit = 365) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        TransactionDate,
        Amount,
        ItemName
      FROM ordersdb
      WHERE ItemName = ?
      ORDER BY STR_TO_DATE(TransactionDate, '%d/%m/%Y') DESC
      LIMIT ?
    `;
    
    connection.query(query, [product, limit], (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results);
    });
  });
}

/**
 * Get total sales for each day of week
 * @param {Object} connection - MySQL connection
 * @param {Number} months - Number of months to look back
 * @returns {Promise<Array>} Sales by day of week
 */
function getSalesByDayOfWeek(connection, months = 3) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        DAYOFWEEK(STR_TO_DATE(TransactionDate, '%d/%m/%Y')) as DayOfWeek,
        SUM(Amount) as TotalAmount,
        COUNT(*) as TransactionCount
      FROM ordersdb
      WHERE STR_TO_DATE(TransactionDate, '%d/%m/%Y') >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY DAYOFWEEK(STR_TO_DATE(TransactionDate, '%d/%m/%Y'))
      ORDER BY DayOfWeek
    `;
    
    connection.query(query, [months], (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results);
    });
  });
}

/**
 * Get all products with their sales counts for recommendation system
 * @param {Object} connection - MySQL connection
 * @returns {Promise<Array>} Product sales data
 */
function getAllProductSales(connection) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        ItemName,
        COUNT(*) as SalesCount,
        SUM(Amount) as TotalRevenue
      FROM ordersdb
      GROUP BY ItemName
      ORDER BY SalesCount DESC
    `;
    
    connection.query(query, (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results);
    });
  });
}

module.exports = {
  getDailySales,
  getMonthlySalesByCategory,
  getMonthlySalesByBrand,
  getProductSales,
  getSalesByDayOfWeek,
  getAllProductSales
}; 