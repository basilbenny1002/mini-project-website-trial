const mongoose = require('mongoose');

const campSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: String,
  totalBeds: Number,
  availableBeds: Number
});

module.exports = mongoose.model('Camp', campSchema);
