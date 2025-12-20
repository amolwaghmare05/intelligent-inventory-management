const Order = require('../models/Order');

// Show sales forecast page
exports.showSalesForecast = async (req, res) => {
  try {
    // Get top selling items for initial display
    const topSellingItems = await Order.getTopSellingItems(10);
    
    res.render('sales_forecast.ejs', {
      topSellingItems,
      name: req.user.name
    });
  } catch (err) {
    console.error('Error showing sales forecast:', err);
    req.flash('error', 'Failed to show sales forecast');
    res.redirect('/dashboard');
  }
};
