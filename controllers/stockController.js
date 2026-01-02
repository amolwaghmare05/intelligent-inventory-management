const Stock = require('../models/Stock');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Size = require('../models/Size');

// Get all stock items
exports.getAllStocks = async (req, res) => {
  try {
    const stocks = await Stock.getAll();
    const categories = await Category.getAll();
    const brands = await Brand.getAll();
    const sizes = await Size.getAll();

    res.render('stocks.ejs', {
      category: categories,
      brand: brands,
      size: sizes
    });
  } catch (err) {
    console.error('Error fetching stocks:', err);
    req.flash('error', 'Failed to fetch stocks');
    res.redirect('/dashboard');
  }
};

// View all stock items
exports.viewStocks = async (req, res) => {
  try {
    const stocks = await Stock.getAll();
    const brands = await Brand.getAll();
    const categories = await Category.getAll();
    const sizes = await Size.getAll();

    res.render('viewstocks.ejs', {
      all_stocks: stocks, // Renamed to match the variable name in the template
      stocks,
      brands,
      categories,
      sizes,
      filter_type: 'None'
    });
  } catch (err) {
    console.error('Error fetching stocks:', err);
    req.flash('error', 'Failed to fetch stocks');
    res.redirect('/dashboard');
  }
};

// Add a new stock item
exports.addStock = async (req, res) => {
  try {
    const {
      itemid,
      itemname,
      category,
      brand,
      size,
      amount
    } = req.body;

    // Validate input
    if (!itemid || !itemname || !category || !brand || !size || !amount) {
      req.flash('error', 'All fields are required');
      return res.redirect('/stocks');
    }

    // Create date and time
    const now = new Date();
    const stockDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    const stockTime = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

    const stockData = {
      itemId: itemid,
      itemName: itemname,
      category,
      brand,
      size,
      amount,
      stockDate,
      stockTime,
      tDay: now.getDate(),
      tMonth: now.getMonth() + 1,
      tYear: now.getFullYear()
    };

    const stock = new Stock(stockData);
    await stock.save();

    req.flash('success', 'Stock added successfully');
    res.redirect('/viewstocks');
  } catch (err) {
    console.error('Error adding stock:', err);
    req.flash('error', 'Failed to add stock');
    res.redirect('/stocks');
  }
};

// Delete a stock item
exports.deleteStock = async (req, res) => {
  try {
    const { deleteid } = req.body;

    if (!deleteid) {
      req.flash('error', 'Stock ID is required');
      return res.redirect('/viewstocks');
    }

    await Stock.delete(deleteid);

    req.flash('success', 'Stock deleted successfully');
    res.redirect('/viewstocks');
  } catch (err) {
    console.error('Error deleting stock:', err);
    req.flash('error', 'Failed to delete stock');
    res.redirect('/viewstocks');
  }
};

// Filter stocks by brand or category
exports.filterStocks = async (req, res) => {
  try {
    const { exampleRadios1: filterType } = req.body;

    if (filterType === 'brand') {
      const brandStats = await Stock.getStatsByBrand();
      const totalItems = await Stock.getTotalCount();

      res.render('stock_filter.ejs', {
        filter_type: filterType,
        display_content: brandStats,
        total_items: [{ Count: totalItems }]
      });
    } else if (filterType === 'category') {
      const categoryStats = await Stock.getStatsByCategory();
      const totalItems = await Stock.getTotalCount();

      res.render('stock_filter.ejs', {
        filter_type: filterType,
        display_content: categoryStats,
        total_items: [{ Count: totalItems }]
      });
    } else {
      res.render('stock_filter.ejs', {
        filter_type: 'None',
        display_content: {},
        total_items: {}
      });
    }
  } catch (err) {
    console.error('Error filtering stocks:', err);
    req.flash('error', 'Failed to filter stocks');
    res.redirect('/stock_filter');
  }
};

// Show stock filter page
exports.showStockFilter = (req, res) => {
  res.render('stock_filter.ejs', {
    filter_type: 'None',
    display_content: {},
    total_items: {}
  });
};
