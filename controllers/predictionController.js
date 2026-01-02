const Order = require('../models/Order');

// Show top selling prediction page
exports.showTopSellingPrediction = async (req, res) => {
  try {
    // Get top selling items for initial display
    const topSellingItems = await Order.getTopSellingItems(10);
    
    res.render('top_selling_prediction.ejs', {
      topSellingItems,
      name: req.user.name
    });
  } catch (err) {
    console.error('Error showing top selling prediction:', err);
    req.flash('error', 'Failed to show top selling prediction');
    res.redirect('/dashboard');
  }
};
