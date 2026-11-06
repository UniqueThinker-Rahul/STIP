const { Offence, OffenceCategory } = require('../models/Offence');

// @desc    Get all offences
// @route   GET /api/v1/offences
const getOffences = async (req, res) => {
  try {
    const offences = await Offence.find({}).sort({ id: 1 });
    res.status(200).json({ success: true, data: offences });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new offence
// @route   POST /api/v1/offences
const createOffence = async (req, res) => {
  try {
    const { category, offence, first, second, third, subtext } = req.body;
    
    // Find highest ID to auto-increment
    const lastOffence = await Offence.findOne({}).sort({ id: -1 });
    const newId = lastOffence ? lastOffence.id + 1 : 1;

    const newOffence = await Offence.create({
      id: newId,
      category,
      offence,
      first,
      second,
      third,
      subtext
    });

    res.status(201).json({ success: true, data: newOffence });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update an offence
// @route   PUT /api/v1/offences/:id
const updateOffence = async (req, res) => {
  try {
    const { id } = req.params;
    // Can query by MongoDB _id or custom numeric id
    const query = id.length === 24 ? { _id: id } : { id: Number(id) };

    const updated = await Offence.findOneAndUpdate(query, req.body, { new: true, runValidators: true });
    
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Offence not found' });
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete an offence
// @route   DELETE /api/v1/offences/:id
const deleteOffence = async (req, res) => {
  try {
    const { id } = req.params;
    const query = id.length === 24 ? { _id: id } : { id: Number(id) };

    const deleted = await Offence.findOneAndDelete(query);
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Offence not found' });
    }

    res.status(200).json({ success: true, message: 'Offence deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a custom category
// @route   POST /api/v1/offences/categories
const addCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });

    const existing = await OffenceCategory.findOne({ name });
    if (existing) {
    //   return.status(200).json({ success: true, data: existing, message: 'Category already exists' });
    }

    const category = await OffenceCategory.create({ name });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getOffences,
  createOffence,
  updateOffence,
  deleteOffence,
  addCategory
};