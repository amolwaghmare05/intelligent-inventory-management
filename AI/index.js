/**
 * AI Module Integration
 * This file exports all AI features for integration with the main application
 */

const salesForecastModel = require('./models/salesForecastModel');
const chatbot = require('../chatbot');

/**
 * Initialize AI features
 * @param {Object} app - Express application
 * @param {Object} connection - MySQL connection
 */
function initAI(app, connection) {
  console.log('Initializing AI features...');
  
  // Create directories for saved models
  const fs = require('fs');
  const path = require('path');
  const modelsDir = path.join(__dirname, 'saved-models');
  
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
    console.log(`Created models directory: ${modelsDir}`);
  }
  
  // Initialize chatbot
  chatbot.initChatbot(app, connection);
  
  // Add API routes for AI features
  setupAPIRoutes(app, connection);
  
  console.log('AI features initialized successfully');
  return {
    trainSalesForecastModel: () => trainModel(connection),
    predictSales: (days) => salesForecastModel.predictSales(connection, days)
  };
}

/**
 * Setup API routes for AI features
 * @param {Object} app - Express application
 * @param {Object} connection - MySQL connection
 */
function setupAPIRoutes(app, connection) {
  // Authentication middleware
  function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: 'Authentication required' });
  }

  // Route to train the sales forecasting model
  app.post('/api/ai/train-sales-model', checkAuthenticated, async (req, res) => {
    try {
      console.log('Starting sales model training...');
      const trainingResult = await salesForecastModel.trainSalesForecastModel(connection, req.body);
      res.json({
        success: true,
        message: 'Sales forecasting model trained successfully',
        result: trainingResult
      });
    } catch (error) {
      console.error('Error training sales model:', error);
      res.status(500).json({
        success: false,
        message: 'Error training sales forecasting model',
        error: error.message
      });
    }
  });
  
  // Route to get sales predictions
  app.get('/api/ai/sales-forecast', checkAuthenticated, async (req, res) => {
    try {
      const days = parseInt(req.query.days || '7', 10);
      console.log(`Generating sales forecast for next ${days} days...`);
      
      const predictions = await salesForecastModel.predictSales(connection, days);
      
      res.json({
        success: true,
        message: `Sales forecast for next ${days} days`,
        predictions
      });
    } catch (error) {
      console.error('Error generating sales forecast:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating sales forecast',
        error: error.message
      });
    }
  });
  
  // Additional AI routes can be added here
}

/**
 * Train the sales forecasting model
 * @param {Object} connection - MySQL connection
 * @returns {Promise<Object>} Training results
 */
async function trainModel(connection) {
  try {
    console.log('Starting sales model training...');
    return await salesForecastModel.trainSalesForecastModel(connection);
  } catch (error) {
    console.error('Error training model:', error);
    throw error;
  }
}

/**
 * Get top selling items with their sales data
 * @param {Object} connection - MySQL connection
 * @param {number} limit - Number of items to return
 * @returns {Promise<Array>} Array of top selling items
 */
async function getTopSellingItems(connection, limit = 5) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        ItemName,
        Brand,
        Category,
        COUNT(*) as totalSales,
        SUM(CAST(Amount AS DECIMAL(10,2))) as revenue
      FROM ordersdb 
      GROUP BY ItemName, Brand, Category
      ORDER BY totalSales DESC, revenue DESC
      LIMIT ?
    `;

    connection.query(query, [limit], (err, results) => {
      if (err) {
        console.error('Error fetching top selling items:', err);
        reject(err);
      } else {
        // Convert revenue to number type before returning
        const processedResults = results.map(item => ({
          ...item,
          revenue: parseFloat(item.revenue) || 0
        }));
        resolve(processedResults);
      }
    });
  });
}

module.exports = {
  initAI,
  getTopSellingItems
}; 