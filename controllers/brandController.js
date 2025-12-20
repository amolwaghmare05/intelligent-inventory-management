const Brand = require('../models/Brand');

// Get all brands
exports.getAllBrands = async (req, res) => {
  try {
    const brands = await Brand.getAll();
    res.render('brands.ejs', { brand: brands });
  } catch (err) {
    console.error('Error fetching brands:', err);
    req.flash('error', 'Failed to fetch brands');
    res.redirect('/dashboard');
  }
};

// Add a new brand
exports.addBrand = async (req, res) => {
  try {
    const { new: brandName } = req.body;

    if (!brandName) {
      req.flash('error', 'Brand name is required');
      return res.redirect('/brands');
    }

    const brand = new Brand(brandName);
    await brand.save();

    req.flash('success', 'Brand added successfully');
    res.redirect('/brands');
  } catch (err) {
    console.error('Error adding brand:', err);
    req.flash('error', 'Failed to add brand');
    res.redirect('/brands');
  }
};

// Delete a brand
exports.deleteBrand = async (req, res) => {
  try {
    const { deleteid } = req.body;

    if (!deleteid) {
      req.flash('error', 'Brand ID is required');
      return res.redirect('/brands');
    }

    await Brand.delete(deleteid);

    req.flash('success', 'Brand deleted successfully');
    res.redirect('/brands');
  } catch (err) {
    console.error('Error deleting brand:', err);
    req.flash('error', 'Failed to delete brand');
    res.redirect('/brands');
  }
};
