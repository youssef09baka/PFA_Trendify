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
  credibilityScore: {
    type: Number,
    default: 0
  },
  credibilityConfidence: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "low"
  },
  verificationStatus: {
    type: String,
    enum: ["verified", "partially_verified", "unverified", "unverifiable", "disputed"],
    default: "unverified"
  },
  verifiedSources: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  credibilityExplanation: {
    type: String,
    default: ""
  },
  isFakeNews: {
    type: Boolean,
    default: false
  },
  credibilitySignals: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  excerpt: {
    type: String,
    default: ""
  },
  ml_prediction: {
    type: String,
    default: "UNAVAILABLE"
  },
  popularity: {
    type: Number,
    default: 0
  },
  growth: {
    type: Number,
    default: 0
  },
  num_comments: {
    type: Number,
    default: 0
  },
  post_length: {
    type: Number,
    default: 0
  },
  hour: {
    type: Number,
    default: 0
  },
  title_length: {
    type: Number,
    default: 0
  },
  sentiment: {
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
  mediaFingerprint: {
    type: String,
    default: ""
  },
  mediaVerifiedAt: {
    type: Date,
    default: null
  },
  mediaSource: {
    type: String,
    default: ""
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

trendSchema.index({ score: -1, updatedAt: -1 });
trendSchema.index({ fetchedAt: -1, createdAt: -1 });
trendSchema.index({ category: 1, score: -1 });
trendSchema.index({ source: 1 });
trendSchema.index({ verificationStatus: 1, credibilityScore: -1 });
trendSchema.index({
  title: "text",
  tags: "text",
  category: "text",
  excerpt: "text"
});

module.exports = mongoose.model("Trend", trendSchema);
