/**
 * REAL FEATURE EXTRACTION & HYBRID ML SCORING
 * 
 * Uses ONLY features available from real production data sources:
 * - Google Trends: popularity, growth
 * - Computable: sentiment, title characteristics
 * - NO synthetic data, NO fake engagement metrics
 */

const { estimateSentimentScore } = require('./data/cleaner');

/**
 * Extract features from real trend data
 * Only uses fields that actually exist in production
 */
function extractRealFeatures(trend = {}) {
  // Feature 1: Popularity (from Google Trends API)
  const popularity = Math.max(0, Number(trend.popularity || trend.value || 0));
  
  // Feature 2: Growth/Delta (from Google Trends API - trend velocity)
  const growth = Number(trend.growth || trend.delta || trend.delta_percentage || 0);
  
  // Feature 3: Sentiment (computed from text via NLP)
  const text = trend.title || trend.query || '';
  const sentiment = estimateSentimentScore(text);
  
  // Feature 4: Title Length (computable from title string)
  const title_length = (trend.title || trend.query || '').length;
  
  // Feature 5: Content Length (from excerpt or post content)
  const excerpt = trend.excerpt || trend.selftext || '';
  const post_length = excerpt.length;
  
  // Feature 6: Posting Hour (from timestamp if available)
  let hour = 12; // Default
  if (trend.created_utc) {
    const date = new Date(trend.created_utc * 1000);
    hour = date.getHours();
  } else if (trend.fetchedAt || trend.createdAt) {
    const date = new Date(trend.fetchedAt || trend.createdAt);
    hour = date.getHours();
  }
  
  // Feature 7: Keyword Count (simple NLP)
  const keywords = text
    .toLowerCase()
    .split(/[\s\-,.:!?;()]+/)
    .filter(w => w.length > 3 && !isStopWord(w));
  const keyword_count = keywords.length;
  
  // Feature 8: Keyword Uniqueness (higher = more diverse)
  const unique_keywords = new Set(keywords);
  const keyword_diversity = unique_keywords.size;
  
  // Feature 9: Urgency Markers (breaking, shocking, alert, etc.)
  const urgency_words = ['breaking', 'alert', 'urgent', 'shock', 'major', 'massive', 'huge', 'critical'];
  const has_urgency = urgency_words.some(w => text.toLowerCase().includes(w)) ? 1 : 0;
  
  // Feature 10: Source/Category
  const source = trend.source || 'Unknown';
  const category = trend.category || extractCategory(text);
  
  return {
    ...trend,
    // Real features from data sources
    popularity,
    growth,
    sentiment,
    title_length,
    post_length,
    hour,
    keyword_count,
    keyword_diversity,
    has_urgency,
    source,
    category,
    
    // For debugging/analysis
    _feature_source: {
      popularity: 'Google Trends / Data Source',
      growth: 'Google Trends Delta',
      sentiment: 'NLP Analysis',
      title_length: 'Computed from text',
      post_length: 'Content length',
      hour: 'Timestamp parsing',
      keyword_count: 'Text analysis',
      keyword_diversity: 'Unique word count',
      has_urgency: 'Keyword detection'
    }
  };
}

/**
 * HYBRID SCORING MODEL
 * 
 * Predicts HIGH or LOW potential based on REAL features
 * Uses weighted ensemble of real signals
 */
function predictTrendPotentialHybrid(features) {
  // Validate we have features
  if (!features || typeof features.popularity === 'undefined') {
    console.warn('[ML] Missing required features for prediction');
    return 'UNKNOWN';
  }
  
  // Normalize features to 0-1 scale
  
  // Component 1: Growth Rate (KEY SIGNAL - shows momentum)
  // Growth indicates whether a trend is accelerating
  // Higher growth = more momentum = more potential
  const growth_normalized = Math.min(Math.abs(features.growth || 0) / 50, 1.0);
  const growth_score = growth_normalized;
  
  // Component 2: Popularity (baseline search volume)
  // Higher popularity = more attention = more potential
  const popularity_normalized = Math.min((features.popularity || 0) / 100, 1.0);
  const popularity_score = popularity_normalized;
  
  // Component 3: Sentiment (quality indicator)
  // Positive sentiment indicates receptive audience
  // Normalize from -1 to 1 range to 0 to 1
  const sentiment_score = ((features.sentiment || 0) + 1) / 2;
  
  // Component 4: Title Characteristics
  // Ideal title: 15-80 characters (not too short, not too long)
  const title_length = features.title_length || 0;
  let title_score = 0.6; // baseline
  if (title_length >= 15 && title_length <= 80) {
    title_score = 1.0; // optimal range
  } else if (title_length > 100) {
    title_score = 0.5; // too long
  } else if (title_length < 10) {
    title_score = 0.4; // too short
  }
  
  // Component 5: Urgency Markers (signals important/breaking news)
  // Breaking news tends to get more engagement
  const urgency_bonus = (features.has_urgency || 0) * 0.15;
  
  // Weighted composite score
  // Growth is most important (shows momentum)
  // Popularity is baseline
  // Sentiment and title quality are secondary
  const composite_score = (
    0.35 * growth_score +        // 35% - Growth/momentum (CRITICAL)
    0.30 * popularity_score +    // 30% - Baseline popularity
    0.20 * sentiment_score +     // 20% - Quality/sentiment
    0.15 * title_score           // 15% - Title characteristics
  ) + urgency_bonus;
  
  // Threshold: 0.5 is midpoint
  // Score >= 0.5 = HIGH potential
  // Score < 0.5 = LOW potential
  const prediction = composite_score >= 0.5 ? 'HIGH' : 'LOW';
  
  return {
    prediction,
    score: composite_score.toFixed(3),
    components: {
      growth_score: growth_score.toFixed(3),
      popularity_score: popularity_score.toFixed(3),
      sentiment_score: sentiment_score.toFixed(3),
      title_score: title_score.toFixed(3),
      urgency_bonus: urgency_bonus.toFixed(3)
    },
    explanation: explainPrediction(features, composite_score, {
      growth: growth_score,
      popularity: popularity_score,
      sentiment: sentiment_score,
      title: title_score
    })
  };
}

/**
 * Generate human-readable explanation for prediction
 */
function explainPrediction(features, score, components) {
  const reasons = [];
  
  if (components.growth > 0.6) {
    reasons.push(`Strong growth momentum (${features.growth})`);
  } else if (components.growth < 0.2) {
    reasons.push('Minimal growth');
  }
  
  if (components.popularity > 0.7) {
    reasons.push(`High popularity (${features.popularity} searches)`);
  }
  
  if (components.sentiment > 0.7) {
    reasons.push('Positive sentiment');
  } else if (components.sentiment < 0.3) {
    reasons.push('Negative/neutral sentiment');
  }
  
  if (features.has_urgency) {
    reasons.push('Breaking/urgent news signals');
  }
  
  return reasons.length > 0 ? reasons.join(' + ') : 'Multiple factors considered';
}

/**
 * Helper: Check if word is a stop word
 */
function isStopWord(word) {
  const stopWords = [
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'it', 'its', 'this', 'that', 'these',
    'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who',
    'when', 'where', 'why', 'how'
  ];
  return stopWords.includes(word.toLowerCase());
}

/**
 * Helper: Extract category from text
 */
function extractCategory(text) {
  const categories = {
    'tech': ['ai', 'tech', 'software', 'google', 'apple', 'microsoft', 'twitter', 'elon'],
    'business': ['startup', 'company', 'business', 'stock', 'market', 'investment'],
    'politics': ['congress', 'senate', 'vote', 'election', 'president', 'political'],
    'health': ['health', 'medical', 'disease', 'vaccine', 'covid', 'pandemic'],
    'science': ['science', 'research', 'discovery', 'study', 'scientist']
  };
  
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return cat;
    }
  }
  return 'general';
}

/**
 * LEGACY COMPATIBILITY - Keep old function signature
 * But implement with real features instead of fake engagement metrics
 */
function generateMlFeatures(trend = {}) {
  return extractRealFeatures(trend);
}

/**
 * LEGACY COMPATIBILITY - For existing mlService
 * Maps hybrid score to HIGH/LOW format
 */
function predictTrend(trend) {
  const features = extractRealFeatures(trend);
  const result = predictTrendPotentialHybrid(features);
  return result.prediction;
}

module.exports = {
  // New functions - recommended
  extractRealFeatures,
  predictTrendPotentialHybrid,
  
  // Legacy compatibility
  generateMlFeatures,
  predictTrend,
  
  // Helpers
  explainPrediction
};
