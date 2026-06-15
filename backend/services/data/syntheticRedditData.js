/**
 * SYNTHETIC REDDIT DATA SOURCE
 * 
 * Provides realistic Reddit post data with:
 * - Realistic engagement metrics (comments, scores)
 * - Realistic post content (title, body)
 * - Realistic timing (hour of day, creation timestamps)
 * - Feature distribution matching real Reddit trends
 * 
 * Use Case: 
 * - PFA validation and testing
 * - ML pipeline demonstration
 * - Development without relying on external API
 * 
 * Runtime: Execute with feature generation and ML prediction
 * Expected: HIGH predictions on 40-60% of posts with meaningful engagement
 */

const syntheticPosts = [
  // TRENDING/HIGH ENGAGEMENT Posts (expected HIGH predictions)
  {
    id: 'synthetic_1',
    title: 'Breaking: Major AI Breakthrough - New Model Surpasses Human Performance',
    selftext: 'Researchers announced a breakthrough in artificial intelligence today. The new model demonstrates unprecedented capabilities in reasoning and understanding. This could fundamentally change how we approach AI development and deployment across industries.',
    score: 2847,
    num_comments: 1205,
    created_utc: Math.floor(Date.now() / 1000) - 3600,
    subreddit: 'technology',
    author: 'TechBreaking',
    thumbnail: 'https://example.com/1.jpg',
    link: 'https://example.com/article/ai-breakthrough',
    permalink: '/r/technology/comments/synthetic_1',
    source: 'Reddit',
    hour: new Date().getHours()
  },
  {
    id: 'synthetic_2',
    title: 'New GPU Architecture Revolutionary - 3x Performance Improvement',
    selftext: 'The latest GPU architecture released today shows remarkable improvements. 3x better performance, 40% lower power consumption. Industry experts are calling this the biggest leap since Moore\'s Law predictions.',
    score: 1923,
    num_comments: 856,
    created_utc: Math.floor(Date.now() / 1000) - 7200,
    subreddit: 'technology',
    author: 'HardwareNews',
    thumbnail: 'https://example.com/2.jpg',
    link: 'https://example.com/article/gpu-breakthrough',
    permalink: '/r/technology/comments/synthetic_2',
    source: 'Reddit',
    hour: (new Date().getHours() - 2) % 24
  },
  {
    id: 'synthetic_3',
    title: 'Apple\'s New Innovation Shocks Industry - Completely Redesigned Interface',
    selftext: 'Apple unveiled a completely reimagined user interface that changes how users interact with devices. The design is elegant, intuitive, and represents years of research.',
    score: 5123,
    num_comments: 2341,
    created_utc: Math.floor(Date.now() / 1000) - 1800,
    subreddit: 'technology',
    author: 'AppleNews',
    thumbnail: 'https://example.com/3.jpg',
    link: 'https://example.com/article/apple-innovation',
    permalink: '/r/technology/comments/synthetic_3',
    source: 'Reddit',
    hour: new Date().getHours()
  },
  {
    id: 'synthetic_4',
    title: 'Quantum Computer Achieves Major Milestone - 1000 Qubits Stable',
    selftext: 'Scientists successfully demonstrated stable quantum computation with 1000 qubits. This represents a major milestone in quantum computing development and brings practical applications closer to reality.',
    score: 3456,
    num_comments: 1567,
    created_utc: Math.floor(Date.now() / 1000) - 5400,
    subreddit: 'technology',
    author: 'QuantumNews',
    thumbnail: 'https://example.com/4.jpg',
    link: 'https://example.com/article/quantum-milestone',
    permalink: '/r/technology/comments/synthetic_4',
    source: 'Reddit',
    hour: (new Date().getHours() - 1) % 24
  },
  {
    id: 'synthetic_5',
    title: 'Cybersecurity Alert - Major Vulnerability Discovered and Patched',
    selftext: 'A critical vulnerability affecting millions of devices was discovered and patched today. Security researchers are calling for immediate updates across all platforms.',
    score: 4102,
    num_comments: 892,
    created_utc: Math.floor(Date.now() / 1000) - 2700,
    subreddit: 'technology',
    author: 'SecurityNews',
    thumbnail: 'https://example.com/5.jpg',
    link: 'https://example.com/article/security-vulnerability',
    permalink: '/r/technology/comments/synthetic_5',
    source: 'Reddit',
    hour: new Date().getHours()
  },
  
  // MEDIUM ENGAGEMENT Posts (borderline HIGH/LOW)
  {
    id: 'synthetic_6',
    title: 'New Programming Language Shows Promise',
    selftext: 'Developers are excited about a new programming language that combines performance with ease of use. Early adoption shows positive feedback.',
    score: 156,
    num_comments: 78,
    created_utc: Math.floor(Date.now() / 1000) - 10800,
    subreddit: 'technology',
    author: 'DevNews',
    thumbnail: 'https://example.com/6.jpg',
    link: 'https://example.com/article/new-language',
    permalink: '/r/technology/comments/synthetic_6',
    source: 'Reddit',
    hour: (new Date().getHours() - 3) % 24
  },
  {
    id: 'synthetic_7',
    title: 'Tech Company Releases Open Source Tool',
    selftext: 'A major tech company released a new open source tool for developers. It\'s getting good adoption rates.',
    score: 234,
    num_comments: 45,
    created_utc: Math.floor(Date.now() / 1000) - 14400,
    subreddit: 'technology',
    author: 'OpenSourceNews',
    thumbnail: 'https://example.com/7.jpg',
    link: 'https://example.com/article/open-source',
    permalink: '/r/technology/comments/synthetic_7',
    source: 'Reddit',
    hour: (new Date().getHours() - 4) % 24
  },
  
  // LOW ENGAGEMENT Posts (expected LOW predictions)
  {
    id: 'synthetic_8',
    title: 'Just a thought about tech',
    selftext: 'I was thinking about technology today. It\'s pretty cool.',
    score: 1,
    num_comments: 0,
    created_utc: Math.floor(Date.now() / 1000) - 18000,
    subreddit: 'technology',
    author: 'RandomUser',
    thumbnail: '',
    link: '',
    permalink: '/r/technology/comments/synthetic_8',
    source: 'Reddit',
    hour: (new Date().getHours() - 5) % 24
  },
  {
    id: 'synthetic_9',
    title: 'Random tech stuff',
    selftext: 'Random post about tech.',
    score: 0,
    num_comments: 1,
    created_utc: Math.floor(Date.now() / 1000) - 21600,
    subreddit: 'technology',
    author: 'AnotherUser',
    thumbnail: '',
    link: '',
    permalink: '/r/technology/comments/synthetic_9',
    source: 'Reddit',
    hour: (new Date().getHours() - 6) % 24
  },
  {
    id: 'synthetic_10',
    title: 'Boring tech question',
    selftext: 'Does anyone know about tech?',
    score: 2,
    num_comments: 2,
    created_utc: Math.floor(Date.now() / 1000) - 25200,
    subreddit: 'technology',
    author: 'QuestionAsker',
    thumbnail: '',
    link: '',
    permalink: '/r/technology/comments/synthetic_10',
    source: 'Reddit',
    hour: (new Date().getHours() - 7) % 24
  },
  
  // More trending posts to reach 100+ for testing
  {
    id: 'synthetic_11',
    title: 'Tesla Reveals New Autonomous Driving System',
    selftext: 'Tesla announced a new autonomous driving system with improved safety features and capabilities. This represents 5 years of development and testing.',
    score: 2456,
    num_comments: 1123,
    created_utc: Math.floor(Date.now() / 1000) - 3600,
    subreddit: 'technology',
    author: 'EVNews',
    thumbnail: 'https://example.com/11.jpg',
    link: 'https://example.com/article/tesla-autonomous',
    permalink: '/r/technology/comments/synthetic_11',
    source: 'Reddit',
    hour: new Date().getHours()
  },
  {
    id: 'synthetic_12',
    title: 'Meta Announces New AI Research Division',
    selftext: 'Meta announced a new division focused on AI research. They\'re hiring hundreds of researchers and engineers to work on the next generation of AI.',
    score: 1834,
    num_comments: 567,
    created_utc: Math.floor(Date.now() / 1000) - 7200,
    subreddit: 'technology',
    author: 'MetaNews',
    thumbnail: 'https://example.com/12.jpg',
    link: 'https://example.com/article/meta-ai',
    permalink: '/r/technology/comments/synthetic_12',
    source: 'Reddit',
    hour: (new Date().getHours() - 2) % 24
  },
  {
    id: 'synthetic_13',
    title: 'Google Launches New Feature for Search',
    selftext: 'Google announced a groundbreaking new search feature that uses AI to understand user intent better. Early tests show 45% improvement in result relevance.',
    score: 3127,
    num_comments: 892,
    created_utc: Math.floor(Date.now() / 1000) - 5400,
    subreddit: 'technology',
    author: 'GoogleNews',
    thumbnail: 'https://example.com/13.jpg',
    link: 'https://example.com/article/google-search',
    permalink: '/r/technology/comments/synthetic_13',
    source: 'Reddit',
    hour: (new Date().getHours() - 1) % 24
  },
  {
    id: 'synthetic_14',
    title: 'Microsoft Invests $10B in OpenAI',
    selftext: 'Microsoft announced a major investment in OpenAI, signaling strong confidence in AI technology and partnerships. This could shape the future of enterprise AI adoption.',
    score: 2678,
    num_comments: 1456,
    created_utc: Math.floor(Date.now() / 1000) - 1800,
    subreddit: 'technology',
    author: 'MicrosoftNews',
    thumbnail: 'https://example.com/14.jpg',
    link: 'https://example.com/article/microsoft-openai',
    permalink: '/r/technology/comments/synthetic_14',
    source: 'Reddit',
    hour: new Date().getHours()
  },
  {
    id: 'synthetic_15',
    title: 'New Smartphone Announced - Triple Camera System',
    selftext: 'A leading smartphone manufacturer announced a new device with a triple camera system. Photography enthusiasts are praising the improvements.',
    score: 1245,
    num_comments: 623,
    created_utc: Math.floor(Date.now() / 1000) - 9000,
    subreddit: 'technology',
    author: 'PhoneNews',
    thumbnail: 'https://example.com/15.jpg',
    link: 'https://example.com/article/new-smartphone',
    permalink: '/r/technology/comments/synthetic_15',
    source: 'Reddit',
    hour: (new Date().getHours() - 2) % 24
  }
];

/**
 * Fetch synthetic Reddit posts
 * @param {string} subreddit - Subreddit to fetch from (ignored, always returns synthetic posts)
 * @param {number} limit - Number of posts to return
 * @returns {Promise<Array>} Array of synthetic post objects
 */
async function fetchSyntheticPosts(subreddit = 'technology', limit = 100) {
  console.log(`[Synthetic] Generating ${Math.min(limit, syntheticPosts.length)} synthetic Reddit posts from /r/${subreddit}`);
  
  // Duplicate and shuffle to reach requested limit
  let posts = [...syntheticPosts];
  
  while (posts.length < limit) {
    // Add duplicates with modified IDs and timestamps
    const duplicate = JSON.parse(JSON.stringify(syntheticPosts[Math.floor(Math.random() * syntheticPosts.length)]));
    duplicate.id = `synthetic_${Math.random().toString(36).substr(2, 9)}`;
    duplicate.created_utc = Math.floor(Date.now() / 1000) - Math.random() * 86400;
    posts.push(duplicate);
  }
  
  return posts.slice(0, limit);
}

/**
 * Get statistics about synthetic data
 * @returns {object} Statistics about available synthetic posts
 */
function getDataStats() {
  return {
    totalPosts: syntheticPosts.length,
    sources: ['Synthetic'],
    engagement: {
      minComments: Math.min(...syntheticPosts.map(p => p.num_comments)),
      maxComments: Math.max(...syntheticPosts.map(p => p.num_comments)),
      avgComments: (syntheticPosts.reduce((a, b) => a + b.num_comments, 0) / syntheticPosts.length).toFixed(0),
      minScore: Math.min(...syntheticPosts.map(p => p.score)),
      maxScore: Math.max(...syntheticPosts.map(p => p.score)),
      avgScore: (syntheticPosts.reduce((a, b) => a + b.score, 0) / syntheticPosts.length).toFixed(0)
    },
    dataQuality: 'Realistic engagement distribution for ML validation'
  };
}

module.exports = {
  fetchSyntheticPosts,
  getDataStats,
  syntheticPosts
};
