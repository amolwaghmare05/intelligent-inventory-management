const Order = require('../models/Order');
const Stock = require('../models/Stock');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Size = require('../models/Size');
const { validationResult } = require('express-validator');

// View all orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.getAll();

    // Group orders by transaction ID
    const groupedOrders = {};
    orders.forEach(order => {
      if (!groupedOrders[order.TransactionID]) {
        groupedOrders[order.TransactionID] = {
          transactionId: order.TransactionID,
          date: order.TransactionDate,
          time: order.TransactionTime,
          customerNumber: order.CustomerNumber,
          items: []
        };
      }

      groupedOrders[order.TransactionID].items.push({
        itemId: order.ItemID,
        itemName: order.ItemName,
        category: order.Category,
        brand: order.Brand,
        size: order.Size,
        amount: order.Amount
      });
    });

    res.render('orders.ejs', {
      orders: Object.values(groupedOrders),
      is_filter_applied: false,
      selected_item: null,
      month_name: null,
      year: null,
      display_content: []
    });
  } catch (err) {
    console.error('Error fetching orders:', err);
    req.flash('error', 'Failed to fetch orders');
    res.redirect('/dashboard');
  }
};

// Submit a new order (bill)
exports.submitBill = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array().map(err => err.msg).join(', '));
      return res.redirect('/bill');
    }

    const {
      customernumber,
      ...items
    } = req.body;

    // Extract item IDs
    const itemIds = [];
    const itemKeys = Object.keys(items).filter(key => key.startsWith('itemid'));

    if (itemKeys.length === 0) {
      req.flash('error', 'At least one item is required');
      return res.redirect('/bill');
    }

    // Create transaction ID
    const now = new Date();
    const transactionId = `SHW${now.getDate()}${now.getMonth() + 1}${now.getFullYear()}${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
    const transactionDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    const transactionTime = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

    // Process each item
    for (const key of itemKeys) {
      const index = key.replace('itemid', '');
      const itemId = items[`itemid${index}`];

      if (!itemId) continue;

      itemIds.push(itemId);

      // Get stock item details
      const stockItem = await Stock.getById(itemId);

      if (!stockItem) {
        req.flash('error', `Item with ID ${itemId} not found`);
        return res.redirect('/bill');
      }

      // Create order data
      const orderData = {
        transactionId,
        itemId,
        itemName: stockItem.ItemName,
        category: stockItem.Category,
        brand: stockItem.Brand,
        size: stockItem.Size,
        amount: stockItem.Amount,
        transactionDate,
        transactionTime,
        customerNumber: customernumber,
        tDay: now.getDate(),
        tMonth: now.getMonth() + 1,
        tYear: now.getFullYear()
      };

      // Save order
      const order = new Order(orderData);
      await order.save();

      // Delete item from stock
      await Stock.delete(itemId);
    }

    req.flash('success', 'Order submitted successfully');
    res.redirect('/orders');
  } catch (err) {
    console.error('Error submitting order:', err);
    req.flash('error', 'Failed to submit order');
    res.redirect('/bill');
  }
};

// Delete an order
exports.deleteOrder = async (req, res) => {
  try {
    const { deleteid } = req.body;

    if (!deleteid) {
      req.flash('error', 'Order ID is required');
      return res.redirect('/orders');
    }

    await Order.delete(deleteid);

    req.flash('success', 'Order deleted successfully');
    res.redirect('/orders');
  } catch (err) {
    console.error('Error deleting order:', err);
    req.flash('error', 'Failed to delete order');
    res.redirect('/orders');
  }
};

// Filter orders by date
exports.filterOrders = async (req, res) => {
  try {
    const {
      exampleRadios,
      month,
      year,
      day
    } = req.body;

    let orders = [];
    let totalSales = { Amount: 0, Count: 0 };

    if (exampleRadios === 'day') {
      if (!day || !month || !year) {
        req.flash('error', 'Day, month and year are required for daily filter');
        return res.redirect('/orders');
      }

      // Filter by day, month, year
      orders = await Order.getByMonthYear(month, year);
      orders = orders.filter(order => order.TDay == day);

      // Calculate total sales
      totalSales.Amount = orders.reduce((sum, order) => sum + parseFloat(order.Amount), 0);
      totalSales.Count = orders.length;
    } else if (exampleRadios === 'month') {
      if (!month || !year) {
        req.flash('error', 'Month and year are required for monthly filter');
        return res.redirect('/orders');
      }

      // Filter by month, year
      orders = await Order.getByMonthYear(month, year);
      totalSales = await Order.getTotalSalesByMonthYear(month, year);
    } else if (exampleRadios === 'year') {
      if (!year) {
        req.flash('error', 'Year is required for yearly filter');
        return res.redirect('/orders');
      }

      // Filter by year
      orders = await Order.getByMonthYear(null, year);
      totalSales = await Order.getTotalSalesByYear(year);
    }

    // Group orders by transaction ID
    const groupedOrders = {};
    orders.forEach(order => {
      if (!groupedOrders[order.TransactionID]) {
        groupedOrders[order.TransactionID] = {
          transactionId: order.TransactionID,
          date: order.TransactionDate,
          time: order.TransactionTime,
          customerNumber: order.CustomerNumber,
          items: []
        };
      }

      groupedOrders[order.TransactionID].items.push({
        itemId: order.ItemID,
        itemName: order.ItemName,
        category: order.Category,
        brand: order.Brand,
        size: order.Size,
        amount: order.Amount
      });
    });

    res.render('orders.ejs', {
      orders: Object.values(groupedOrders),
      is_filter_applied: true,
      filter_type: exampleRadios,
      filter_day: day,
      filter_month: month,
      filter_year: year,
      total_amount: totalSales.Amount,
      total_count: totalSales.Count
    });
  } catch (err) {
    console.error('Error filtering orders:', err);
    req.flash('error', 'Failed to filter orders');
    res.redirect('/orders');
  }
};

// Show sales filter page
exports.showSalesFilter = async (req, res) => {
  try {
    res.render('sales_filter.ejs', {
      is_paramater_set: false,
      filter_type: 'None',
      display_content: {},
      total_items: {},
      time_type: null,
      filter_month: null,
      filter_year: null
    });
  } catch (err) {
    console.error('Error showing sales filter:', err);
    req.flash('error', 'Failed to show sales filter');
    res.redirect('/dashboard');
  }
};

// Filter sales data
exports.filterSales = async (req, res) => {
  try {
    const {
      exampleRadios,
      month,
      year
    } = req.body;

    let salesData = [];
    let totalSales = { Amount: 0, Count: 0 };

    if (exampleRadios === 'month') {
      if (!month || !year) {
        req.flash('error', 'Month and year are required for monthly filter');
        return res.redirect('/sales_filter');
      }

      // Get sales stats by month and year
      salesData = await Order.getStatsByMonthYear(month, year);
      totalSales = await Order.getTotalSalesByMonthYear(month, year);
    } else if (exampleRadios === 'year') {
      if (!year) {
        req.flash('error', 'Year is required for yearly filter');
        return res.redirect('/sales_filter');
      }

      // Get sales stats by year
      salesData = await Order.getStatsByMonthYear(null, year);
      totalSales = await Order.getTotalSalesByYear(year);
    }

    res.render('sales_filter.ejs', {
      is_paramater_set: true,
      filter_type: exampleRadios,
      filter_month: month,
      filter_year: year,
      display_content: salesData,
      total_items: totalSales,
      time_type: exampleRadios
    });
  } catch (err) {
    console.error('Error filtering sales:', err);
    req.flash('error', 'Failed to filter sales');
    res.redirect('/sales_filter');
  }
};

// Show billing page
exports.showBilling = async (req, res) => {
  try {
    const categories = await Category.getAll();
    const brands = await Brand.getAll();
    const sizes = await Size.getAll();

    res.render('bill.ejs', {
      category: categories,
      brand: brands,
      size: sizes
    });
  } catch (err) {
    console.error('Error showing billing page:', err);
    req.flash('error', 'Failed to show billing page');
    res.redirect('/dashboard');
  }
};
