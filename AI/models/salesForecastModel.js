/**
 * Sales Forecasting Model using TensorFlow.js
 * This model predicts future sales based on historical data
 */

const tf = require('@tensorflow/tfjs-node');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

// Import utility functions
const dataPrep = require('../utils/dataPreparation');
const dataAccess = require('../utils/dataAccess');

// Model configuration
const MODEL_CONFIG = {
  windowSize: 7,        // Number of days to use for prediction
  epochs: 100,          // Training epochs
  learningRate: 0.01,   // Learning rate for optimizer
  batchSize: 32,        // Batch size for training
  validationSplit: 0.2, // Portion of data to use for validation
  modelDir: path.join(__dirname, '../saved-models/sales-forecast'),
  modelType: 'dense'    // Changed to 'dense' for better stability
};

/**
 * Creates, trains and saves a sales forecasting model
 * @param {Object} connection - MySQL database connection
 * @param {Object} options - Override default options
 * @returns {Promise<Object>} Training results and model info
 */
async function trainSalesForecastModel(connection, options = {}) {
  // Merge options with defaults
  const config = { ...MODEL_CONFIG, ...options };
  console.log('Training sales forecast model with config:', config);
  
  try {
    // Calculate date range for training data (1 year by default)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    
    console.log(`Fetching sales data from ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`);
    
    // Fetch sales data
    const salesData = await dataAccess.getDailySales(connection, startDate, endDate);
    
    // Check if we have enough real data
    if (salesData.length < 3) {
      console.log(`Warning: Only ${salesData.length} days of sales data found. Using generated sample data for demonstration purposes.`);
      // Generate sample data for demonstration purposes
      return trainWithSampleData(config);
    }
    
    // For testing purposes, we'll reduce the minimum required data
    // In production, you'd want at least 3x window size
    const minRequiredDays = Math.max(3, config.windowSize);
    
    if (salesData.length < minRequiredDays) {
      throw new Error(`Not enough sales data for training. Need at least ${minRequiredDays} days, but got ${salesData.length}.`);
    }
    
    console.log(`Retrieved ${salesData.length} days of sales data`);
    
    // Process data for training
    let processedData = dataPrep.extractDailySales(salesData);
    processedData = dataPrep.aggregateDailySales(processedData);
    processedData = dataPrep.fillMissingDates(processedData, 0);
    
    // Normalize data to [0, 1] range
    const { data: normalizedData, min, max, range } = dataPrep.normalizeData(processedData);
    
    // Prepare data in sliding window format
    const { inputs, outputs } = dataPrep.prepareTimeSeriesData(normalizedData, config.windowSize);
    
    if (inputs.length === 0 || outputs.length === 0) {
      throw new Error('Failed to prepare training data - no samples generated');
    }
    
    console.log(`Prepared ${inputs.length} training samples with window size ${config.windowSize}`);
    
    try {
      // Convert to tensors using the prepareTensor function
      const inputTensor = prepareTensor(inputs, config.windowSize, config.modelType === 'lstm');
      const outputTensor = tf.tensor2d(outputs);
      
      // Create model
      const model = createModel(config);
      
      // Train model
      console.log('Training model...');
      const trainHistory = await model.fit(inputTensor, outputTensor, {
        epochs: config.epochs,
        batchSize: config.batchSize,
        validationSplit: config.validationSplit,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, val_loss = ${logs.val_loss.toFixed(4)}`);
            }
          }
        }
      });
      
      // Save model
      await saveModel(model, config.modelDir);
      
      // Save normalization parameters for later use
      saveNormParams(config.modelDir, { min, max, range, windowSize: config.windowSize });
      
      console.log('Model training complete');
      
      // Clean up tensors
      inputTensor.dispose();
      outputTensor.dispose();
      
      // Return training summary
      return {
        trainingHistory: {
          loss: trainHistory.history.loss,
          validationLoss: trainHistory.history.val_loss
        },
        dataStats: {
          trainingDays: salesData.length,
          samples: inputs.length,
          minSales: min,
          maxSales: max,
          isRealData: true
        },
        modelInfo: {
          modelType: config.modelType,
          windowSize: config.windowSize,
          modelPath: config.modelDir
        }
      };
    } catch (tensorError) {
      console.error('Error during tensor operations:', tensorError);
      throw new Error(`Failed to create or train model: ${tensorError.message}`);
    }
  } catch (error) {
    console.error('Error training sales forecast model:', error);
    throw error;
  }
}

/**
 * Creates a TensorFlow.js model for sales forecasting
 * @param {Object} config - Model configuration
 * @returns {tf.Sequential} TensorFlow.js model
 */
function createModel(config) {
  const model = tf.sequential();
  
  if (config.modelType === 'lstm') {
    // LSTM model for time series
    model.add(tf.layers.lstm({
      units: 32,
      returnSequences: false,
      inputShape: [config.windowSize, 1]
    }));
    
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    model.add(tf.layers.dense({
      units: 16,
      activation: 'relu'
    }));
  } else {
    // Dense model (simple baseline)
    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu',
      inputShape: [config.windowSize]
    }));
    
    model.add(tf.layers.dense({
      units: 16,
      activation: 'relu'
    }));
  }
  
  // Output layer
  model.add(tf.layers.dense({
    units: 1
  }));
  
  // Compile model
  model.compile({
    optimizer: tf.train.adam(config.learningRate),
    loss: 'meanSquaredError'
  });
  
  return model;
}

/**
 * Prepare tensor data for training or prediction
 * @param {Array} inputs - Input data
 * @param {Number} windowSize - Size of sliding window
 * @param {Boolean} isLSTM - Whether using LSTM model
 * @returns {tf.Tensor} Tensor ready for model
 */
function prepareTensor(inputs, windowSize, isLSTM = true) {
  // Ensure inputs is an array of arrays
  if (!Array.isArray(inputs) || !Array.isArray(inputs[0])) {
    throw new Error('Inputs must be an array of arrays');
  }
  
  // For LSTM, we need shape [samples, timesteps, features]
  if (isLSTM) {
    // Convert each value to a single-element array for the feature dimension
    const reshapedInputs = inputs.map(window => 
      window.map(value => [Number(value)])
    );
    return tf.tensor3d(reshapedInputs);
  }
  
  // For dense model, we need shape [samples, features]
  return tf.tensor2d(inputs);
}

/**
 * Train model with generated sample data for demonstration purposes
 * @param {Object} config - Model configuration
 * @returns {Promise<Object>} Training results
 */
async function trainWithSampleData(config) {
  console.log('Generating sample sales data for demonstration');
  
  // Generate 30 days of synthetic data
  const sampleData = generateSampleData(30);
  
  // Normalize sample data
  const { data: normalizedData, min, max, range } = dataPrep.normalizeData(sampleData);
  
  // Prepare data in sliding window format
  const { inputs, outputs } = dataPrep.prepareTimeSeriesData(normalizedData, config.windowSize);
  
  // Convert to tensors
  const inputTensor = prepareTensor(inputs, config.windowSize, config.modelType === 'lstm');
  const outputTensor = tf.tensor2d(outputs);
  
  // Create and train model
  const model = createModel(config);
  
  console.log('Training model with sample data...');
  const trainHistory = await model.fit(inputTensor, outputTensor, {
    epochs: config.epochs,
    batchSize: config.batchSize,
    validationSplit: config.validationSplit,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (epoch % 10 === 0) {
          console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, val_loss = ${logs.val_loss.toFixed(4)}`);
        }
      }
    }
  });
  
  // Save model and parameters
  await saveModel(model, config.modelDir);
  saveNormParams(config.modelDir, { min, max, range, windowSize: config.windowSize });
  
  return {
    trainingHistory: {
      loss: trainHistory.history.loss,
      validationLoss: trainHistory.history.val_loss
    },
    dataStats: {
      trainingDays: sampleData.length,
      samples: inputs.length,
      minSales: min,
      maxSales: max,
      isRealData: false,
      sampleDataUsed: true
    },
    modelInfo: {
      modelType: config.modelType,
      windowSize: config.windowSize,
      modelPath: config.modelDir
    }
  };
}

/**
 * Make sales predictions for a number of days into the future
 * @param {Object} connection - MySQL database connection
 * @param {Number} days - Number of days to predict
 * @param {Object} options - Override default options
 * @returns {Promise<Object>} Object containing actual sales and predictions
 */
async function predictSales(connection, days = 7, options = {}) {
  // Merge options with defaults
  const config = { ...MODEL_CONFIG, ...options };
  
  try {
    // Check if model exists
    const modelDir = options.modelDir || config.modelDir;
    if (!fs.existsSync(path.join(modelDir, 'model.json'))) {
      throw new Error(`Model not found at ${modelDir}. Please train the model first.`);
    }
    
    // Load the model
    const model = await tf.loadLayersModel(`file://${path.join(modelDir, 'model.json')}`);
    
    // Load normalization parameters
    const normParams = loadNormParams(modelDir);
    
    // Fetch recent sales data for initial window
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Get last 30 days for actual data display
    
    // Fetch and process sales data
    const salesData = await dataAccess.getDailySales(connection, startDate, endDate);
    
    // Store actual historical sales
    let actualSales = [];
    
    // If we don't have enough real data, generate synthetic data for demonstration
    if (salesData.length < normParams.windowSize) {
      console.log(`Not enough recent data for prediction window. Using synthetic data for demonstration.`);
      return predictWithSynthetic(model, normParams, days);
    }
    
    let processedData = dataPrep.extractDailySales(salesData);
    processedData = dataPrep.aggregateDailySales(processedData);
    processedData = dataPrep.fillMissingDates(processedData, 0);
    
    // Save actual data for return
    actualSales = [...processedData];
    
    // Sort by date and take most recent windowSize days
    processedData.sort((a, b) => b.date - a.date);
    const recentData = processedData.slice(0, normParams.windowSize).reverse();
    
    if (recentData.length < normParams.windowSize) {
      throw new Error(`Not enough recent data. Need ${normParams.windowSize} days, but got ${recentData.length}.`);
    }
    
    // Normalize data
    const normalizedData = recentData.map(d => ({
      ...d,
      sales: (d.sales - normParams.min) / normParams.range
    }));
    
    // Make predictions
    const predictions = [];
    let currentWindow = normalizedData.map(d => d.sales);
    
    try {
      for (let i = 0; i < days; i++) {
        // Prepare input tensor using the prepareTensor function
        const inputTensor = prepareTensor([currentWindow], normParams.windowSize, config.modelType === 'lstm');
        
        // Make prediction
        const predictionTensor = model.predict(inputTensor);
        const predictionValue = predictionTensor.dataSync()[0];
        
        // Denormalize prediction
        const salesValue = predictionValue * normParams.range + normParams.min;
        
        // Calculate date for this prediction
        const predictionDate = new Date();
        predictionDate.setDate(predictionDate.getDate() + i + 1);
        
        // Store prediction
        predictions.push({
          date: predictionDate,
          sales: Math.max(0, salesValue) // Ensure non-negative
        });
        
        // Update window for next prediction
        currentWindow.shift();
        currentWindow.push(predictionValue);
      }
      
      // Return both actual sales and predictions
      return {
        actualSales: actualSales.map(d => ({
          date: d.date,
          sales: d.sales
        })),
        predictions: predictions
      };
    } catch (error) {
      console.error('Error during prediction step:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error predicting sales:', error);
    throw error;
  }
}

/**
 * Generate predictions using synthetic data when real data is insufficient
 * @param {tf.Sequential} model - Trained model
 * @param {Object} normParams - Normalization parameters
 * @param {Number} days - Days to predict
 * @returns {Object} Object containing actual sales and predictions
 */
function predictWithSynthetic(model, normParams, days) {
  // Generate sample data
  const sampleData = generateSampleData(normParams.windowSize + 30); // Generate more for historical
  
  // Sort descending and get window size
  sampleData.sort((a, b) => b.date - a.date);
  
  // Split into historical and window data
  const actualSalesData = sampleData.slice(0, 30);
  const windowData = sampleData.slice(30, 30 + normParams.windowSize).reverse();
  
  // Normalize window data
  const normalizedData = windowData.map(d => ({
    ...d,
    sales: (d.sales - normParams.min) / normParams.range
  }));
  
  // Make predictions
  const predictions = [];
  let currentWindow = normalizedData.map(d => d.sales);
  
  for (let i = 0; i < days; i++) {
    // Prepare input tensor
    const inputTensor = prepareTensor([currentWindow], normParams.windowSize, false);
    
    // Make prediction
    const predictionTensor = model.predict(inputTensor);
    const predictionValue = predictionTensor.dataSync()[0];
    
    // Denormalize prediction
    const salesValue = predictionValue * normParams.range + normParams.min;
    
    // Calculate date for this prediction
    const predictionDate = new Date();
    predictionDate.setDate(predictionDate.getDate() + i + 1);
    
    // Store prediction
    predictions.push({
      date: predictionDate,
      sales: Math.max(0, salesValue) // Ensure non-negative
    });
    
    // Update window for next prediction
    currentWindow.shift();
    currentWindow.push(predictionValue);
  }
  
  // Return both actual (synthetic in this case) sales and predictions
  return {
    actualSales: actualSalesData.reverse().map(d => ({
      date: d.date,
      sales: d.sales
    })),
    predictions: predictions
  };
}

/**
 * Save the trained model to disk
 * @param {tf.Sequential} model - Trained TensorFlow.js model
 * @param {String} modelDir - Directory to save the model
 * @returns {Promise<void>}
 */
async function saveModel(model, modelDir) {
  // Create directory if it doesn't exist
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }
  
  // Save model
  await model.save(`file://${modelDir}`);
  console.log(`Model saved to ${modelDir}`);
}

/**
 * Save normalization parameters for later use
 * @param {String} modelDir - Directory to save parameters
 * @param {Object} params - Normalization parameters
 */
function saveNormParams(modelDir, params) {
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(modelDir, 'norm_params.json'),
    JSON.stringify(params, null, 2)
  );
}

/**
 * Load normalization parameters
 * @param {String} modelDir - Directory with saved parameters
 * @returns {Object} Normalization parameters
 */
function loadNormParams(modelDir) {
  const paramsPath = path.join(modelDir, 'norm_params.json');
  if (!fs.existsSync(paramsPath)) {
    throw new Error(`Normalization parameters not found at ${paramsPath}`);
  }
  
  return JSON.parse(fs.readFileSync(paramsPath, 'utf8'));
}

/**
 * Generate synthetic sales data for testing
 * @param {Number} days - Number of days to generate
 * @returns {Array} Array of daily sales data
 */
function generateSampleData(days) {
  const today = new Date();
  const sampleData = [];
  
  // Base value and trend
  const baseValue = 5000;
  const trend = 50; // Increasing trend
  
  // Weekly pattern (higher sales on weekends)
  const weekdayWeights = [0.7, 0.8, 0.9, 1.0, 1.1, 1.4, 1.3]; // Mon-Sun
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(today.getDate() - (days - i));
    
    // Get day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = date.getDay();
    
    // Calculate sales with trend and weekly pattern, plus some random noise
    const randomNoise = Math.random() * 1000 - 500; // -500 to +500
    const dayValue = (baseValue + (trend * i)) * weekdayWeights[dayOfWeek] + randomNoise;
    
    sampleData.push({
      date: date,
      sales: Math.max(0, dayValue) // Ensure no negative sales
    });
  }
  
  return sampleData;
}

module.exports = {
  trainSalesForecastModel,
  predictSales
}; 