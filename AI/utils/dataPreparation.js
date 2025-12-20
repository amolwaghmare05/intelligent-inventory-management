/**
 * Data preparation utilities for AI/ML features
 * These functions help transform raw database data into formats suitable for TensorFlow.js
 */

const moment = require('moment');

/**
 * Extract daily sales data from database results
 * @param {Array} dbResults - Database query results
 * @returns {Array} Formatted daily sales data
 */
function extractDailySales(dbResults) {
  return dbResults.map(row => ({
    date: moment(row.TransactionDate, 'DD/MM/YYYY').toDate(),
    amount: parseFloat(row.Amount)
  }));
}

/**
 * Aggregate sales data by day
 * @param {Array} salesData - Raw sales data
 * @returns {Array} Sales aggregated by day
 */
function aggregateDailySales(salesData) {
  const aggregated = {};
  
  salesData.forEach(sale => {
    const dateKey = moment(sale.date).format('YYYY-MM-DD');
    if (!aggregated[dateKey]) {
      aggregated[dateKey] = 0;
    }
    aggregated[dateKey] += sale.amount;
  });
  
  return Object.keys(aggregated).map(date => ({
    date: new Date(date),
    sales: aggregated[date]
  })).sort((a, b) => a.date - b.date);
}

/**
 * Fill missing dates in time series data
 * @param {Array} data - Time series data
 * @param {Number} fillValue - Value to use for missing dates
 * @returns {Array} Complete time series with no gaps
 */
function fillMissingDates(data, fillValue = 0) {
  if (data.length === 0) return [];
  
  const result = [];
  const startDate = moment(data[0].date);
  const endDate = moment(data[data.length - 1].date);
  const existingDates = new Set(data.map(d => moment(d.date).format('YYYY-MM-DD')));
  
  for (let m = moment(startDate); m.isSameOrBefore(endDate); m.add(1, 'days')) {
    const dateStr = m.format('YYYY-MM-DD');
    if (existingDates.has(dateStr)) {
      const existingData = data.find(d => moment(d.date).format('YYYY-MM-DD') === dateStr);
      result.push(existingData);
    } else {
      result.push({
        date: m.toDate(),
        sales: fillValue
      });
    }
  }
  
  return result;
}

/**
 * Normalize data for ML processing
 * @param {Array} data - Data to normalize
 * @param {String} valueKey - Key of the value to normalize
 * @returns {Object} Normalized data and normalization parameters
 */
function normalizeData(data, valueKey = 'sales') {
  const values = data.map(d => d[valueKey]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  // Handle case where min equals max (no variation in data)
  const range = max - min || 1;
  
  const normalizedData = data.map(d => ({
    ...d,
    [valueKey]: (d[valueKey] - min) / range
  }));
  
  return {
    data: normalizedData,
    min,
    max,
    range
  };
}

/**
 * Prepare time series data in sliding window format for LSTM/RNN models
 * @param {Array} data - Time series data
 * @param {Number} windowSize - Size of the sliding window
 * @param {String} valueKey - Key containing the target values
 * @returns {Object} Inputs and outputs for training
 */
function prepareTimeSeriesData(data, windowSize, valueKey = 'sales') {
  const inputs = [];
  const outputs = [];
  
  // Validate data
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array');
  }
  
  // Ensure all values are numeric
  const validData = data.map(d => {
    const value = parseFloat(d[valueKey]);
    if (isNaN(value)) {
      throw new Error(`Invalid numeric value found: ${d[valueKey]}`);
    }
    return { ...d, [valueKey]: value };
  });
  
  for (let i = 0; i <= validData.length - windowSize - 1; i++) {
    const window = validData.slice(i, i + windowSize).map(d => d[valueKey]);
    if (window.length !== windowSize) {
      throw new Error(`Invalid window size: expected ${windowSize}, got ${window.length}`);
    }
    inputs.push(window);
    outputs.push([validData[i + windowSize][valueKey]]);
  }
  
  // Validate inputs structure for tensor3d
  if (inputs.length === 0) {
    throw new Error('No input windows generated');
  }
  
  if (!inputs.every(window => 
    Array.isArray(window) && 
    window.length === windowSize && 
    window.every(v => typeof v === 'number' && !isNaN(v))
  )) {
    throw new Error('Invalid input window structure');
  }
  
  return { inputs, outputs };
}

/**
 * Denormalize predictions back to original scale
 * @param {Number|Array} normalizedValue - Normalized value(s)
 * @param {Number} min - Minimum value from normalization
 * @param {Number} range - Range from normalization
 * @returns {Number|Array} - Denormalized value(s)
 */
function denormalizeValue(normalizedValue, min, range) {
  if (Array.isArray(normalizedValue)) {
    return normalizedValue.map(v => v * range + min);
  }
  return normalizedValue * range + min;
}

/**
 * Generate date features for advanced models
 * @param {Date} date - Date to extract features from
 * @returns {Object} - Extracted features
 */
function extractDateFeatures(date) {
  const momentDate = moment(date);
  return {
    dayOfWeek: momentDate.day(), // 0-6
    dayOfMonth: momentDate.date() - 1, // 0-30
    month: momentDate.month(), // 0-11
    quarter: Math.floor(momentDate.month() / 3), // 0-3
    year: momentDate.year(),
    isWeekend: [0, 6].includes(momentDate.day()) ? 1 : 0,
    isMonthStart: momentDate.date() <= 7 ? 1 : 0,
    isMonthEnd: momentDate.date() >= 23 ? 1 : 0
  };
}

module.exports = {
  extractDailySales,
  aggregateDailySales,
  fillMissingDates,
  normalizeData,
  prepareTimeSeriesData,
  denormalizeValue,
  extractDateFeatures
}; 