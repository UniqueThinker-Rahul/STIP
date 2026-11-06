const mongoose = require('mongoose');

const offenceSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  category: { type: String, required: true },
  offence: { type: String, required: true },
  first: { type: String, required: true }, // e.g. "A" or "R -> S3"
  second: { type: String, required: true },
  third: { type: String, required: true },
  subtext: { type: String, default: '' }
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
}, { timestamps: true });

const Offence = mongoose.models.Offence || mongoose.model('Offence', offenceSchema);
const OffenceCategory = mongoose.models.OffenceCategory || mongoose.model('OffenceCategory', categorySchema);

module.exports = { Offence, OffenceCategory };