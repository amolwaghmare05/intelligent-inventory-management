const Size = require('../models/Size');

// Get all sizes
exports.getAllSizes = async (req, res) => {
  try {
    const sizes = await Size.getAll();
    res.render('sizes.ejs', { size: sizes });
  } catch (err) {
    console.error('Error fetching sizes:', err);
    req.flash('error', 'Failed to fetch sizes');
    res.redirect('/dashboard');
  }
};

// Add a new size
exports.addSize = async (req, res) => {
  try {
    const { new: sizeName } = req.body;

    if (!sizeName) {
      req.flash('error', 'Size name is required');
      return res.redirect('/sizes');
    }

    const size = new Size(sizeName);
    await size.save();

    req.flash('success', 'Size added successfully');
    res.redirect('/sizes');
  } catch (err) {
    console.error('Error adding size:', err);
    req.flash('error', 'Failed to add size');
    res.redirect('/sizes');
  }
};

// Delete a size
exports.deleteSize = async (req, res) => {
  try {
    const { deleteid } = req.body;

    if (!deleteid) {
      req.flash('error', 'Size ID is required');
      return res.redirect('/sizes');
    }

    await Size.delete(deleteid);

    req.flash('success', 'Size deleted successfully');
    res.redirect('/sizes');
  } catch (err) {
    console.error('Error deleting size:', err);
    req.flash('error', 'Failed to delete size');
    res.redirect('/sizes');
  }
};
