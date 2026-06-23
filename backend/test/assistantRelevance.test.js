const assert = require('node:assert/strict');
const test = require('node:test');

const {
  extractTopicTerms,
  calculateTrendRelevance,
  sanitizePublicAnswer,
  detectAssistantIntent,
  getConversationalAnswer,
  parseAssistantAction,
  classifyAssistantIntent
} = require('../services/assistantService');

test('assistant detects simple conversation without trend search', () => {
  assert.equal(detectAssistantIntent('salut'), 'conversation');
  assert.equal(detectAssistantIntent('merci'), 'conversation');
  assert.equal(detectAssistantIntent('qui es-tu'), 'conversation');
});

test('assistant returns short natural conversational answers', () => {
  assert.equal(getConversationalAnswer('salut'), "Salut. Comment puis-je t'aider aujourd'hui ?");
  assert.match(getConversationalAnswer('qui es-tu'), /Je suis Trendi/);
});

test('assistant keeps trend requests in trend mode', () => {
  assert.equal(detectAssistantIntent('gta 6'), 'trend_search');
  assert.equal(detectAssistantIntent('tesla'), 'trend_search');
  assert.equal(detectAssistantIntent('quelle crypto acheter'), 'trend_search');
  assert.equal(detectAssistantIntent('tendances business'), 'trend_search');
});

test('assistant detects structured navigation actions before trend search', () => {
  const action = parseAssistantAction('ouvre-moi la page explorer');
  const preferences = parseAssistantAction('ouvre les preferences');

  assert.equal(action.type, 'action');
  assert.equal(action.action, 'navigate');
  assert.equal(action.target, '/feed');
  assert.equal(preferences.action, 'navigate');
  assert.equal(preferences.target, '/profile');
  assert.equal(detectAssistantIntent('ouvre-moi la page explorer'), 'navigation');
});

test('assistant returns structured theme, filter and search actions', () => {
  const theme = parseAssistantAction('active le mode sombre');
  const switchTheme = parseAssistantAction('bascule moi en mode sombre');
  const filter = parseAssistantAction('filtre gaming');
  const search = parseAssistantAction('cherche GTA 6');

  assert.equal(theme.action, 'theme');
  assert.equal(theme.target, 'dark');
  assert.equal(switchTheme.action, 'theme');
  assert.equal(switchTheme.target, 'dark');
  assert.equal(filter.action, 'filter');
  assert.equal(filter.target, 'gaming');
  assert.equal(search.action, 'search');
  assert.equal(search.target, 'GTA 6');
});

test('assistant understands natural theme and navigation variants with confidence', () => {
  const dark = classifyAssistantIntent('mets le site en noir');
  const navigation = classifyAssistantIntent('emmene-moi vers explorer');
  const explore = classifyAssistantIntent('je veux explorer les tendances');

  assert.equal(dark.category, 'theme');
  assert.equal(dark.action.action, 'theme');
  assert.equal(dark.action.target, 'dark');
  assert.ok(dark.confidence >= 0.9);
  assert.equal(navigation.category, 'navigation');
  assert.equal(navigation.action.target, '/feed');
  assert.equal(explore.category, 'navigation');
  assert.equal(explore.action.target, '/feed');
});

test('assistant keeps short conversation away from trend search', () => {
  assert.equal(classifyAssistantIntent('ok').category, 'conversation');
  assert.equal(classifyAssistantIntent('super').category, 'conversation');
  assert.equal(classifyAssistantIntent('ca marche').category, 'conversation');
});

test('assistant executes simple navigation targets directly', () => {
  const intent = classifyAssistantIntent('explorer');

  assert.equal(intent.category, 'navigation');
  assert.equal(intent.action.action, 'navigate');
  assert.equal(intent.action.target, '/feed');
});

test('assistant confirms pending action from short memory', () => {
  const intent = classifyAssistantIntent('oui', {
    pendingAction: {
      type: 'action',
      action: 'navigate',
      target: '/favorites',
      message: 'Favoris ouverts.'
    }
  });

  assert.equal(intent.category, 'confirmation');
  assert.equal(intent.action.action, 'navigate');
  assert.equal(intent.action.target, '/favorites');
});

test('assistant treats direct theme phrases as actions', () => {
  assert.equal(parseAssistantAction('mode sombre').target, 'dark');
  assert.equal(parseAssistantAction('mode clair').target, 'light');
  assert.equal(parseAssistantAction('dark mode').target, 'dark');
  assert.equal(parseAssistantAction('light mode').target, 'light');
});

test('assistant executes direct navigation, filter and search variants', () => {
  assert.equal(parseAssistantAction('passe a la page favoris').target, '/favorites');
  assert.equal(parseAssistantAction('passe en business').action, 'filter');
  assert.equal(parseAssistantAction('passe en business').target, 'business');
  assert.equal(parseAssistantAction('montre moi les tendances IA').action, 'search');
  assert.equal(parseAssistantAction('montre moi les tendances IA').target, 'IA');
});

test('assistant uses short memory actions for referenced trend', () => {
  const context = { lastTrend: { id: 'trend-1', title: 'GTA 6 trailer', score: 90 } };
  const open = parseAssistantAction('ouvre le premier', context);
  const analyze = parseAssistantAction('analyse celle-la', context);

  assert.equal(open.action, 'open_trend');
  assert.equal(open.target, 'trend-1');
  assert.equal(analyze.action, 'analyze');
  assert.equal(analyze.target, 'trend-1');
});

test('assistant extracts specific subject from user search intent', () => {
  const topic = extractTopicTerms('Je veux savoir la derniere tendance sur GTA 6');

  assert.equal(topic.hasTopic, true);
  assert.equal(topic.phrase, 'gta 6');
  assert.ok(topic.terms.includes('gta'));
  assert.ok(topic.terms.includes('6'));
});

test('assistant ranks matching trend above unrelated high-score trend', () => {
  const topic = extractTopicTerms('Je veux savoir la derniere tendance sur GTA 6');
  const gtaTrend = {
    title: 'GTA 6 trailer date and gameplay leaks',
    category: 'Gaming',
    score: 45
  };
  const unrelatedTrend = {
    title: 'Memorial Day 2026',
    category: 'Search Trends',
    score: 99
  };

  assert.ok(
    calculateTrendRelevance(gtaTrend, topic) > calculateTrendRelevance(unrelatedTrend, topic),
    'subject relevance must beat unrelated raw score'
  );
  assert.ok(calculateTrendRelevance(unrelatedTrend, topic) < 8);
});

test('assistant does not match solana with unrelated short sol titles', () => {
  const topic = extractTopicTerms('solana');
  const solanaTrend = {
    title: 'Solana ETF discussion accelerates',
    category: 'Finance',
    tags: ['crypto'],
    score: 50
  };
  const unrelatedTrend = {
    title: 'Sol Love Island reunion',
    category: 'Entertainment',
    tags: ['tv'],
    score: 99
  };

  assert.ok(calculateTrendRelevance(solanaTrend, topic) >= 8);
  assert.ok(calculateTrendRelevance(unrelatedTrend, topic) < 8);
});

test('assistant treats business as topic only when asked as trend domain', () => {
  const ideaRequest = extractTopicTerms('Donne moi des idees business');
  const domainRequest = extractTopicTerms('Quelles sont les tendances business');

  assert.equal(ideaRequest.hasTopic, false);
  assert.equal(domainRequest.hasTopic, true);
  assert.ok(domainRequest.terms.includes('business'));
});

test('assistant public sanitizer removes technical terms', () => {
  const answer = sanitizePublicAnswer('MongoDB API backend collection score 3500000. Il est important de noter que GTA 6 monte.');

  assert.equal(/MongoDB|API|backend|collection|score/i.test(answer), false);
  assert.equal(/important de noter/i.test(answer), false);
});
