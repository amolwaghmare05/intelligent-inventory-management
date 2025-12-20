const Stock = require('../models/Stock');
const Order = require('../models/Order');

// Show dashboard
exports.showDashboard = async (req, res) => {
  try {
    // Get stock statistics
    const totalStockCount = await Stock.getTotalCount();
    const stockByBrand = await Stock.getStatsByBrand();
    const stockByCategory = await Stock.getStatsByCategory();

    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get sales statistics for current month
    const monthlySales = await Order.getTotalSalesByMonthYear(currentMonth, currentYear);

    // Get top selling items
    const topSellingItems = await Order.getTopSellingItems(5);

    res.render('index.ejs', {
      name: req.user.name,
      totalStockCount,
      stockByBrand,
      stockByCategory,
      monthlySales: monthlySales || { Amount: 0, Count: 0 },
      topSellingItems,
      currentMonth,
      currentYear,
      // Add missing variables needed by index.ejs
      total_sales: [{ TotalItemsOrdered: monthlySales ? monthlySales.Amount : 0 }],
      ord_num: [{ NumberOfProducts: monthlySales ? monthlySales.Count : 0 }],
      stock_num: [{ NumberOfProducts: totalStockCount || 0 }],
      total_stock: [{ TotalItemsOrdered: stockByBrand.reduce((sum, item) => sum + parseFloat(item.Amount || 0), 0) }]
    });
  } catch (err) {
    console.error('Error loading dashboard:', err);
    req.flash('error', 'Failed to load dashboard data');
    res.render('index.ejs', {
      name: req.user.name,
      totalStockCount: 0,
      stockByBrand: [],
      stockByCategory: [],
      monthlySales: { Amount: 0, Count: 0 },
      topSellingItems: [],
      currentMonth: 0,
      currentYear: 0,
      // Add missing variables needed by index.ejs
      total_sales: [{ TotalItemsOrdered: 0 }],
      ord_num: [{ NumberOfProducts: 0 }],
      stock_num: [{ NumberOfProducts: 0 }],
      total_stock: [{ TotalItemsOrdered: 0 }]
    });
  }
};
