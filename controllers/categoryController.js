const Category = require('../models/Category');

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.getAll();
    res.render('categories.ejs', { category: categories });
  } catch (err) {
    console.error('Error fetching categories:', err);
    req.flash('error', 'Failed to fetch categories');
    res.redirect('/dashboard');
  }
};

// Add a new category
exports.addCategory = async (req, res) => {
  try {
    const { new: categoryName } = req.body;

    if (!categoryName) {
      req.flash('error', 'Category name is required');
      return res.redirect('/categories');
    }

    const category = new Category(categoryName);
    await category.save();

    req.flash('success', 'Category added successfully');
    res.redirect('/categories');
  } catch (err) {
    console.error('Error adding category:', err);
    req.flash('error', 'Failed to add category');
    res.redirect('/categories');
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  try {
    const { deleteid } = req.body;

    if (!deleteid) {
      req.flash('error', 'Category ID is required');
      return res.redirect('/categories');
    }

    await Category.delete(deleteid);

    req.flash('success', 'Category deleted successfully');
    res.redirect('/categories');
  } catch (err) {
    console.error('Error deleting category:', err);
    req.flash('error', 'Failed to delete category');
    res.redirect('/categories');
  }
};
