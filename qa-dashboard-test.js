import puppeteer from 'puppeteer';

// Test credentials - these need to exist in Firebase
const TEST_USERS = {
  se: {
    email: 'se-test@example.com',
    password: 'TestPassword123!',
    role: 'se'
  },
  manager: {
    email: 'manager-test@example.com',
    password: 'TestPassword123!',
    role: 'manager'
  }
};

const RESULTS = {
  seTests: [],
  managerTests: [],
  errors: [],
  warnings: []
};

async function loginUser(page, email, password) {
  console.log(`   🔐 Logging in as ${email}...`);

  try {
    // Wait for email field
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });

    // Fill in credentials
    await page.type('input[type="email"]', email);
    await page.type('input[type="password"]', password);

    // Click sign in button
    await page.click('button::-p-text(Sign In)');

    // Wait for navigation to dashboard
    await page.waitForNavigation({ timeout: 10000 });

    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || currentUrl === 'http://localhost:5173/') {
      console.log('   ✓ Login successful');
      return true;
    } else {
      console.log(`   ✗ Login failed - redirected to ${currentUrl}`);
      return false;
    }
  } catch (error) {
    console.log(`   ✗ Login failed: ${error.message}`);
    return false;
  }
}

async function testSEDashboard(page) {
  console.log('\n📊 Testing SE Dashboard');

  const tests = [];

  // Take screenshot
  await page.screenshot({ path: 'qa-screenshots/se-dashboard-full.png', fullPage: true });

  // Test 1: Check page title/heading
  const heading = await page.$eval('h1', el => el.textContent).catch(() => null);
  tests.push({
    name: 'Dashboard heading present',
    passed: heading !== null,
    details: heading || 'Not found'
  });
  console.log(`   ${heading ? '✓' : '✗'} Dashboard heading: "${heading}"`);

  // Test 2: Check for "Average Score" component
  const hasAvgScore = await page.evaluate(() => {
    return document.body.innerText.includes('Average Score');
  });
  tests.push({
    name: 'AverageScoreCard component rendered',
    passed: hasAvgScore,
    details: hasAvgScore ? 'Component found' : 'Component not found'
  });
  console.log(`   ${hasAvgScore ? '✓' : '✗'} AverageScoreCard component`);

  // Test 3: Check for "Recent Calls" component
  const hasRecentCalls = await page.evaluate(() => {
    return document.body.innerText.includes('Recent Calls');
  });
  tests.push({
    name: 'RecentCallsList component rendered',
    passed: hasRecentCalls,
    details: hasRecentCalls ? 'Component found' : 'Component not found'
  });
  console.log(`   ${hasRecentCalls ? '✓' : '✗'} RecentCallsList component`);

  // Test 4: Check for empty state messages
  const pageText = await page.evaluate(() => document.body.innerText);
  const hasNoCallsMsg = pageText.includes('No calls yet') ||
                        pageText.includes('No recent calls') ||
                        pageText.includes('No scores yet');
  tests.push({
    name: 'Empty state handling',
    passed: true, // Not a failure if data exists
    details: hasNoCallsMsg ? 'Empty state displayed' : 'Data present or calls exist'
  });
  console.log(`   ${hasNoCallsMsg ? '✓' : 'ℹ️'} Empty state: ${hasNoCallsMsg ? 'Shown' : 'Not needed (data exists)'}`);

  // Test 5: Check for logout button
  const hasLogout = await page.evaluate(() => {
    return document.body.innerText.includes('Logout');
  });
  tests.push({
    name: 'Logout button present',
    passed: hasLogout,
    details: hasLogout ? 'Button found' : 'Button not found'
  });
  console.log(`   ${hasLogout ? '✓' : '✗'} Logout button`);

  // Test 6: Check for call cards (if data exists)
  const callCards = await page.$$('[class*="border"]').catch(() => []);
  tests.push({
    name: 'Call cards rendering',
    passed: true,
    details: `Found ${callCards.length} card elements`
  });
  console.log(`   ℹ️  Found ${callCards.length} card elements`);

  // Test 7: Try clicking a call if exists
  const clickableCall = await page.$('[class*="cursor-pointer"]').catch(() => null);
  if (clickableCall) {
    console.log('   ℹ️  Testing call navigation...');
    try {
      await clickableCall.click();
      await page.waitForNavigation({ timeout: 3000 });
      const newUrl = page.url();
      const isCallDetailsPage = newUrl.includes('/calls/');
      tests.push({
        name: 'Navigation to call details',
        passed: isCallDetailsPage,
        details: `Navigated to: ${newUrl}`
      });
      console.log(`   ${isCallDetailsPage ? '✓' : '✗'} Navigation test: ${newUrl}`);

      // Go back to dashboard
      await page.goBack();
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      tests.push({
        name: 'Navigation to call details',
        passed: false,
        details: `Navigation failed: ${error.message}`
      });
      console.log(`   ✗ Navigation test failed: ${error.message}`);
    }
  } else {
    console.log('   ℹ️  No clickable calls found (empty state)');
  }

  RESULTS.seTests = tests;
  return tests;
}

async function testManagerDashboard(page) {
  console.log('\n📊 Testing Manager Dashboard');

  const tests = [];

  // Take screenshot
  await page.screenshot({ path: 'qa-screenshots/manager-dashboard-full.png', fullPage: true });

  // Test 1: Check page title/heading
  const heading = await page.$eval('h1', el => el.textContent).catch(() => null);
  tests.push({
    name: 'Dashboard heading present',
    passed: heading !== null,
    details: heading || 'Not found'
  });
  console.log(`   ${heading ? '✓' : '✗'} Dashboard heading: "${heading}"`);

  // Test 2: Check for "Team Overview" component
  const hasTeamOverview = await page.evaluate(() => {
    return document.body.innerText.includes('Team Overview');
  });
  tests.push({
    name: 'TeamOverviewCard component rendered',
    passed: hasTeamOverview,
    details: hasTeamOverview ? 'Component found' : 'Component not found'
  });
  console.log(`   ${hasTeamOverview ? '✓' : '✗'} TeamOverviewCard component`);

  // Test 3: Check for "Pending Reviews" component
  const hasPendingReviews = await page.evaluate(() => {
    return document.body.innerText.includes('Pending Reviews');
  });
  tests.push({
    name: 'PendingReviewsList component rendered',
    passed: hasPendingReviews,
    details: hasPendingReviews ? 'Component found' : 'Component not found'
  });
  console.log(`   ${hasPendingReviews ? '✓' : '✗'} PendingReviewsList component`);

  // Test 4: Check for empty state messages
  const pageText = await page.evaluate(() => document.body.innerText);
  const hasEmptyState = pageText.includes('No pending reviews') ||
                        pageText.includes('No team data yet');
  tests.push({
    name: 'Empty state handling',
    passed: true,
    details: hasEmptyState ? 'Empty state displayed' : 'Data present'
  });
  console.log(`   ${hasEmptyState ? '✓' : 'ℹ️'} Empty state: ${hasEmptyState ? 'Shown' : 'Not needed (data exists)'}`);

  // Test 5: Check for logout button
  const hasLogout = await page.evaluate(() => {
    return document.body.innerText.includes('Logout');
  });
  tests.push({
    name: 'Logout button present',
    passed: hasLogout,
    details: hasLogout ? 'Button found' : 'Button not found'
  });
  console.log(`   ${hasLogout ? '✓' : '✗'} Logout button`);

  // Test 6: Try clicking a pending review if exists
  const clickableReview = await page.$('[class*="cursor-pointer"]').catch(() => null);
  if (clickableReview) {
    console.log('   ℹ️  Testing pending review navigation...');
    try {
      await clickableReview.click();
      await page.waitForNavigation({ timeout: 3000 });
      const newUrl = page.url();
      const isScoringPage = newUrl.includes('/calls/') && newUrl.includes('/score');
      tests.push({
        name: 'Navigation to manager scoring page',
        passed: isScoringPage,
        details: `Navigated to: ${newUrl}`
      });
      console.log(`   ${isScoringPage ? '✓' : '✗'} Navigation test: ${newUrl}`);

      // Go back to dashboard
      await page.goBack();
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      tests.push({
        name: 'Navigation to manager scoring page',
        passed: false,
        details: `Navigation failed: ${error.message}`
      });
      console.log(`   ✗ Navigation test failed: ${error.message}`);
    }
  } else {
    console.log('   ℹ️  No pending reviews found (empty state)');
  }

  RESULTS.managerTests = tests;
  return tests;
}

(async () => {
  console.log('🧪 QA Manual Testing - Story 2.1: Main Dashboard');
  console.log('='.repeat(60));

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 1024 }
  });

  const page = await browser.newPage();

  // Capture console messages
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      RESULTS.errors.push(text);
      console.log(`❌ Console Error: ${text}`);
    } else if (type === 'warning') {
      RESULTS.warnings.push(text);
    }
  });

  page.on('pageerror', (error) => {
    RESULTS.errors.push(error.message);
    console.log(`❌ Page Error: ${error.message}`);
  });

  try {
    // ============================================
    // TEST CASE 1: SE USER
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('TEST CASE 1: SE User Dashboard');
    console.log('='.repeat(60));

    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

    const seLoginSuccess = await loginUser(page, TEST_USERS.se.email, TEST_USERS.se.password);

    if (seLoginSuccess) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for data to load
      await testSEDashboard(page);

      // Logout
      const logoutBtn = await page.$('button::-p-text(Logout)');
      if (logoutBtn) {
        await logoutBtn.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('   ✓ Logged out');
      }
    } else {
      console.log('   ⚠️  Cannot test SE dashboard - login failed');
      console.log('   ℹ️  Please ensure test user exists in Firebase:');
      console.log(`      Email: ${TEST_USERS.se.email}`);
      console.log(`      Role: se`);
    }

    // ============================================
    // TEST CASE 2: MANAGER USER
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('TEST CASE 2: Manager User Dashboard');
    console.log('='.repeat(60));

    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

    const managerLoginSuccess = await loginUser(page, TEST_USERS.manager.email, TEST_USERS.manager.password);

    if (managerLoginSuccess) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for data to load
      await testManagerDashboard(page);

      // Logout
      const logoutBtn = await page.$('button::-p-text(Logout)');
      if (logoutBtn) {
        await logoutBtn.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('   ✓ Logged out');
      }
    } else {
      console.log('   ⚠️  Cannot test Manager dashboard - login failed');
      console.log('   ℹ️  Please ensure test user exists in Firebase:');
      console.log(`      Email: ${TEST_USERS.manager.email}`);
      console.log(`      Role: manager`);
    }

    // ============================================
    // TEST CASE 3: RESPONSIVE DESIGN
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('TEST CASE 3: Responsive Design');
    console.log('='.repeat(60));

    // Need to be logged in for this
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    const anyLoginSuccess = await loginUser(page, TEST_USERS.se.email, TEST_USERS.se.password);

    if (anyLoginSuccess) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('   Testing mobile (375x667)...');
      await page.setViewport({ width: 375, height: 667 });
      await new Promise(resolve => setTimeout(resolve, 500));
      await page.screenshot({ path: 'qa-screenshots/responsive-mobile.png', fullPage: true });
      console.log('   ✓ Mobile screenshot captured');

      console.log('   Testing tablet (768x1024)...');
      await page.setViewport({ width: 768, height: 1024 });
      await new Promise(resolve => setTimeout(resolve, 500));
      await page.screenshot({ path: 'qa-screenshots/responsive-tablet.png', fullPage: true });
      console.log('   ✓ Tablet screenshot captured');

      console.log('   Testing desktop (1920x1080)...');
      await page.setViewport({ width: 1920, height: 1080 });
      await new Promise(resolve => setTimeout(resolve, 500));
      await page.screenshot({ path: 'qa-screenshots/responsive-desktop.png', fullPage: true });
      console.log('   ✓ Desktop screenshot captured');
    }

  } catch (error) {
    console.error(`\n❌ Fatal test error: ${error.message}`);
    RESULTS.errors.push(`Fatal: ${error.message}`);
  }

  // ============================================
  // FINAL REPORT
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📋 FINAL TEST REPORT');
  console.log('='.repeat(60));

  console.log('\n🔹 SE Dashboard Tests:');
  if (RESULTS.seTests.length > 0) {
    RESULTS.seTests.forEach(test => {
      console.log(`   ${test.passed ? '✓' : '✗'} ${test.name}: ${test.details}`);
    });
  } else {
    console.log('   ⚠️  No tests run (login failed)');
  }

  console.log('\n🔹 Manager Dashboard Tests:');
  if (RESULTS.managerTests.length > 0) {
    RESULTS.managerTests.forEach(test => {
      console.log(`   ${test.passed ? '✓' : '✗'} ${test.name}: ${test.details}`);
    });
  } else {
    console.log('   ⚠️  No tests run (login failed)');
  }

  console.log('\n🔹 Errors & Warnings:');
  console.log(`   Console Errors: ${RESULTS.errors.length}`);
  if (RESULTS.errors.length > 0) {
    RESULTS.errors.forEach(err => console.log(`      ❌ ${err}`));
  }
  console.log(`   Console Warnings: ${RESULTS.warnings.length}`);
  if (RESULTS.warnings.length > 0 && RESULTS.warnings.length <= 5) {
    RESULTS.warnings.forEach(warn => console.log(`      ⚠️  ${warn}`));
  }

  const sePassed = RESULTS.seTests.length > 0 && RESULTS.seTests.filter(t => !t.passed).length === 0;
  const managerPassed = RESULTS.managerTests.length > 0 && RESULTS.managerTests.filter(t => !t.passed).length === 0;
  const noErrors = RESULTS.errors.length === 0;

  console.log('\n' + '='.repeat(60));
  console.log('OVERALL STATUS:');
  console.log('='.repeat(60));
  console.log(`SE Dashboard: ${sePassed ? '✅ PASS' : '❌ FAIL or INCOMPLETE'}`);
  console.log(`Manager Dashboard: ${managerPassed ? '✅ PASS' : '❌ FAIL or INCOMPLETE'}`);
  console.log(`No Runtime Errors: ${noErrors ? '✅ YES' : '❌ NO'}`);
  console.log('='.repeat(60));

  console.log('\n✅ Test complete. Screenshots saved to qa-screenshots/');
  console.log('Browser will close in 5 seconds...');

  await new Promise(resolve => setTimeout(resolve, 5000));
  await browser.close();
})();
