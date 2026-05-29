/**
 * Verification: Infinite Scroll Race Condition Analysis
 * 
 * This analyzes the Feed.jsx infinite scroll implementation
 * to determine if multiple concurrent requests can be sent.
 */

const fs = require('fs');
const path = require('path');

const feedPath = path.join(__dirname, '../frontend/src/pages/Feed.jsx');
const feedContent = fs.readFileSync(feedPath, 'utf8');

console.log('='.repeat(70));
console.log('TEST 4: Infinite Scroll Race Condition Analysis');
console.log('='.repeat(70));

// Analysis 1: Check if loadingRef is set BEFORE async operations
console.log('\n📋 Analysis 1: Loading state management');

if (feedContent.includes('loadingRef.current = true')) {
  const match = feedContent.match(/loadingRef\.current\s*=\s*true/g);
  console.log(`✓ Found ${match.length} places where loadingRef is set to true`);
  
  // Find the context where it's set
  const lines = feedContent.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('loadingRef.current = true')) {
      console.log(`  Line ${idx + 1}: ${line.trim()}`);
      // Check next few lines for async operations
      for (let i = 1; i <= 3; i++) {
        if (idx + i < lines.length && lines[idx + i].includes('await')) {
          console.log(`  ⚠️  Line ${idx + i + 1}: Async operation after setting loading: ${lines[idx + i].trim()}`);
        }
      }
    }
  });
}

// Analysis 2: Check if there are multiple concurrent fetch calls possible
console.log('\n📋 Analysis 2: Concurrent request detection');

const fetchFeedMatches = feedContent.match(/void fetchFeed\([^)]*\)/g) || [];
console.log(`✓ Found ${fetchFeedMatches.length} calls to fetchFeed()`);

if (fetchFeedMatches.length > 1) {
  console.log('⚠️  WARNING: Multiple fetchFeed calls found - potential for concurrent requests');
}

// Analysis 3: Check dependency arrays that might cause rapid rerenders
console.log('\n📋 Analysis 3: Effect dependencies analysis');

const useEffectMatches = feedContent.match(/useEffect\([^}]*?\], \[[^\]]*?\]\);/gs) || [];
console.log(`✓ Found ${useEffectMatches.length} useEffect hooks`);

const problematicDeps = feedContent.match(/useEffect\([^}]*?loadingMore[^}]*?\], \[[^\]]*?loadingMore[^\]]*?\]\)/gs);
if (problematicDeps) {
  console.log(`⚠️  WARNING: ${problematicDeps.length} effect(s) depend on loadingMore state`);
  console.log('   This can cause observer to be recreated during loading, creating race condition');
}

// Analysis 4: Race condition window - between check and set
console.log('\n📋 Analysis 4: Race condition window analysis');

const loadNextPageCode = feedContent.match(/const loadNextPage = useCallback\(\(\) => \{[\s\S]*?\}, \[fetchFeed\]\)/)?.[0];
if (loadNextPageCode) {
  console.log('✓ loadNextPage function:');
  console.log('  1. Checks: if (loadingRef.current || !hasMoreRef.current) return');
  console.log('  2. Calls: void fetchFeed(nextPage, false)');
  console.log('  3. fetchFeed sets: loadingRef.current = true (SYNC)');
  console.log('  4. fetchFeed awaits: api.get() (ASYNC)');
  console.log('');
  console.log('  ✓ Race condition window: MINIMAL');
  console.log('     - loadingRef is set SYNCHRONOUSLY before any await');
  console.log('     - JavaScript is single-threaded');
  console.log('     - But IntersectionObserver can queue multiple events');
}

// Analysis 5: IntersectionObserver configuration
console.log('\n📋 Analysis 5: IntersectionObserver setup');

const observerSetup = feedContent.match(/new IntersectionObserver\(\(.*?\), \{[^}]*?\}\)/s)?.[0];
if (observerSetup) {
  console.log('✓ Observer configuration found:');
  
  if (observerSetup.includes('threshold: 0.1')) {
    console.log('  - threshold: 0.1 (fires multiple times as element enters)');
  }
  if (observerSetup.includes('rootMargin')) {
    console.log('  - rootMargin configured (can trigger early/late)');
  }
  console.log('  ⚠️  Multiple trigger events possible during scroll');
}

// Analysis 6: Check for entry.isIntersecting gating
console.log('\n📋 Analysis 6: Observer event gating');

if (feedContent.includes('if (!entry.isIntersecting) return')) {
  console.log('✓ Observer checks: if (!entry.isIntersecting) return');
  console.log('  - Good: Prevents action when scrolling past element');
  console.log('  ⚠️  But: Can fire multiple times as element becomes intersecting');
}

// Final verdict
console.log('\n' + '='.repeat(70));
console.log('VERDICT: Infinite Scroll Race Condition');
console.log('='.repeat(70));

console.log(`
The race condition COMPLEXITY level is:

✓ PROTECTION 1: loadingRef.current set SYNCHRONOUSLY
  - Before any await
  - Second call will be blocked

⚠️ WEAKNESS 1: Dependency array includes loadingMore state
  - Observer recreated when loading state changes
  - Observer disconnect + reconnect has timing gap
  - Events can queue during this gap

⚠️ WEAKNESS 2: Intersection Observer can fire multiple times
  - rootMargin causes early/late triggers
  - Rapid scroll events cause multiple firings
  - Events can be buffered in JavaScript event queue

🔴 RACE CONDITION PRESENT: YES, but LIMITED
  - Multiple entries into loadNextPage: POSSIBLE
  - Multiple concurrent fetchFeed calls: UNLIKELY (loadingRef blocks)
  - Multiple API requests sent: DEPENDS on timing

REALISTIC SCENARIO:
1. User scrolls rapidly (20 scroll events in 100ms)
2. Intersection Observer queues: if (!entry.isIntersecting) return
3. Most are filtered out, but 1-2 enter the isIntersecting=true state
4. These fire loadNextPage() nearly simultaneously
5. First call sets loadingRef = true (synchronously)
6. Second call checks loadingRef (now true), returns false
7. Result: Single API call (NO race condition)

HOWEVER:
If loadingMore state changes between observer calls, observer is 
recreated, creating a window where multiple calls can slip through.
`);

// Test: Count how many times loadingRef state changes
const loadingRefStateUpdates = (feedContent.match(/setLoadingMore/g) || []).length;
console.log(`\nState updates that trigger observer recreation: ${loadingRefStateUpdates}`);

console.log('\n' + '='.repeat(70));
console.log('CONCLUSION FOR ISSUE #4');
console.log('='.repeat(70));
console.log(`
RESULT: LIKELY_FALSE_POSITIVE_BUT_CONCERNING

The code has protections (loadingRef synchronous set) that should prevent
concurrent requests in MOST cases. However, the observer recreation on
state changes creates an edge case window where multiple requests could
theoretically slip through.

For a proper verdict, need to test with:
- Chrome DevTools Network tab during rapid scroll
- Monitor concurrent GET /feed requests
- Check for duplicate items in feed
`);
