const mongoose = require("mongoose");

const trendSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  source: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    default: "General",
    trim: true
  },
  score: {
    type: Number,
    default: 0
  },
  scoreDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  analysis: {
    type: String,
    default: ""
  },
  idea: {
    type: String,
    default: ""
  },
  ml_prediction: {
    type: String,
    default: "UNKNOWN"
  },
  popularity: {
    type: Number,
    default: 0
  },
  growth: {
    type: Number,
    default: 0
  },
  image: {
    type: String,
    default: ""
  },
  video: {
    type: String,
    default: ""
  },
  thumbnail: {
    type: String,
    default: ""
  },
  mediaType: {
    type: String,
    enum: ["image", "video", "none"],
    default: "none"
  },
  link: {
    type: String,
    default: ""
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  fetchedAt: {
    type: Date,
    default: Date.now
  },
  savedCount: {
    type: Number,
    default: 0
  },
  tags: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Trend", trendSchema);
