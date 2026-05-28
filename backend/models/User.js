const mongoose = require("mongoose");
const { AI_ANALYSIS_QUOTA } = require("../config/config");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  preferences: {
    type: [String],
    default: []
  },

  savedTrends: {
    type: [require('mongoose').Schema.Types.ObjectId],
    ref: 'Trend',
    default: []
  },

  aiRemaining: {
    type: Number,
    default: AI_ANALYSIS_QUOTA
  },

  aiLastReset: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("User", userSchema);