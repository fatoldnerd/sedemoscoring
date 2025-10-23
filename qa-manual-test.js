import puppeteer from 'puppeteer';

(async () => {
  console.log('🧪 Starting QA Manual Testing for Story 2.1: Main Dashboard\n');

  const browser = await puppeteer.launch({
    headless: false, // Set to false to see what's happening
    defaultViewport: {
      width: 1280,
      height: 1024
    }
  });

  const page = await browser.newPage();
  const errors = [];
  const warnings = [];
  const networkErrors = [];

  // Capture console messages
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();

    if (type === 'error') {
      errors.push(text);
      console.log(`❌ Console Error: ${text}`);
    } else if (type === 'warning') {
      warnings.push(text);
      console.log(`⚠️  Console Warning: ${text}`);
    }
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    errors.push(error.message);
    console.log(`❌ Page Error: ${error.message}`);
  });

  // Capture failed requests
  page.on('requestfailed', (request) => {
    networkErrors.push({
      url: request.url(),
      failure: request.failure().errorText
    });
    console.log(`❌ Network Error: ${request.url()} - ${request.failure().errorText}`);
  });

  try {
    console.log('📍 Step 1: Navigate to application');
    await page.goto('http://localhost:5173/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await page.screenshot({ path: 'qa-screenshots/01-initial-load.png', fullPage: true });
    console.log('   ✓ Initial page loaded');

    // Wait a bit for Firebase auth to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check current URL
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    // Check page title
    const title = await page.title();
    console.log(`   Page title: ${title}`);

    // Check if we're on login page or dashboard
    const isLoginPage = currentUrl.includes('/login');
    const isDashboardPage = currentUrl.includes('/dashboard') || currentUrl === 'http://localhost:5173/';

    console.log('\n📍 Step 2: Check page state');

    if (isLoginPage) {
      console.log('   ℹ️  User not authenticated - on login page');
      console.log('   Note: Manual login required to test dashboard features');

      await page.screenshot({ path: 'qa-screenshots/02-login-page.png', fullPage: true });

      // Check if login form exists
      const loginFormExists = await page.$('form');
      console.log(`   Login form exists: ${loginFormExists ? 'Yes' : 'No'}`);

      // Check for email and password fields
      const emailField = await page.$('input[type="email"]');
      const passwordField = await page.$('input[type="password"]');
      console.log(`   Email field exists: ${emailField ? 'Yes' : 'No'}`);
      console.log(`   Password field exists: ${passwordField ? 'Yes' : 'No'}`);

    } else if (isDashboardPage) {
      console.log('   ✓ User authenticated - on dashboard');

      await page.screenshot({ path: 'qa-screenshots/03-dashboard-initial.png', fullPage: true });

      // Try to detect which dashboard (SE or Manager)
      const pageContent = await page.content();
      const hasManagerDashboard = pageContent.includes('Manager Dashboard') || pageContent.includes('Team Overview') || pageContent.includes('Pending Reviews');
      const hasSEDashboard = pageContent.includes('Dashboard') && (pageContent.includes('Recent Calls') || pageContent.includes('Average Score'));

      if (hasManagerDashboard) {
        console.log('   📊 Detected: Manager Dashboard');
        await testManagerDashboard(page);
      } else if (hasSEDashboard) {
        console.log('   📊 Detected: SE Dashboard');
        await testSEDashboard(page);
      } else {
        console.log('   ⚠️  Could not determine dashboard type');
      }
    }

    console.log('\n📍 Step 3: Testing component rendering');

    // Check for key components
    const components = {
      'LoadingSpinner': await page.$('[class*="spinner"]') || await page.$('[class*="loading"]'),
      'ErrorMessage': await page.$('[class*="error"]'),
      'Logout button': await page.$('button::-p-text(Logout)'),
      'Dashboard heading': await page.$('h1'),
    };

    for (const [name, element] of Object.entries(components)) {
      console.log(`   ${element ? '✓' : '○'} ${name} ${element ? 'found' : 'not found'}`);
    }

    console.log('\n📍 Step 4: Testing responsive design');

    // Test mobile viewport
    await page.setViewport({ width: 375, height: 667 });
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'qa-screenshots/04-mobile-view.png', fullPage: true });
    console.log('   ✓ Mobile viewport tested (375x667)');

    // Test tablet viewport
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'qa-screenshots/05-tablet-view.png', fullPage: true });
    console.log('   ✓ Tablet viewport tested (768x1024)');

    // Test desktop viewport
    await page.setViewport({ width: 1280, height: 1024 });
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'qa-screenshots/06-desktop-view.png', fullPage: true });
    console.log('   ✓ Desktop viewport tested (1280x1024)');

  } catch (error) {
    console.error(`\n❌ Test failed with error: ${error.message}`);
    errors.push(error.message);
    await page.screenshot({ path: 'qa-screenshots/error.png', fullPage: true });
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Console Errors: ${errors.length}`);
  if (errors.length > 0) {
    errors.forEach(err => console.log(`  - ${err}`));
  }
  console.log(`Console Warnings: ${warnings.length}`);
  if (warnings.length > 0) {
    warnings.forEach(warn => console.log(`  - ${warn}`));
  }
  console.log(`Network Errors: ${networkErrors.length}`);
  if (networkErrors.length > 0) {
    networkErrors.forEach(err => console.log(`  - ${err.url}: ${err.failure}`));
  }
  console.log('='.repeat(60));

  // Keep browser open for manual inspection
  console.log('\n⏸️  Browser left open for manual inspection');
  console.log('   Please manually test:');
  console.log('   1. Login as SE user and verify SE dashboard');
  console.log('   2. Login as Manager user and verify Manager dashboard');
  console.log('   3. Test navigation by clicking calls');
  console.log('\n   Press Ctrl+C when done to close browser and continue');

  // Wait for manual inspection (will be killed by Ctrl+C)
  await new Promise(resolve => setTimeout(resolve, 600000)); // 10 minutes max

  await browser.close();
})();

async function testSEDashboard(page) {
  console.log('\n   🔍 Testing SE Dashboard Components:');

  // Check for AverageScoreCard
  const avgScoreCard = await page.$('text/Average Score') || await page.evaluate(() => {
    return document.body.innerText.includes('Average Score');
  });
  console.log(`      ${avgScoreCard ? '✓' : '✗'} AverageScoreCard component`);

  // Check for RecentCallsList
  const recentCalls = await page.$('text/Recent Calls') || await page.evaluate(() => {
    return document.body.innerText.includes('Recent Calls');
  });
  console.log(`      ${recentCalls ? '✓' : '✗'} RecentCallsList component`);

  // Check for "No calls yet" message
  const noCalls = await page.evaluate(() => {
    return document.body.innerText.includes('No calls yet') ||
           document.body.innerText.includes('No recent calls') ||
           document.body.innerText.includes('No scores yet');
  });
  console.log(`      ${noCalls ? '✓' : '○'} Empty state message (${noCalls ? 'displayed' : 'not needed'})`);

  await page.screenshot({ path: 'qa-screenshots/se-dashboard.png', fullPage: true });
}

async function testManagerDashboard(page) {
  console.log('\n   🔍 Testing Manager Dashboard Components:');

  // Check for TeamOverviewCard
  const teamCard = await page.$('text/Team Overview') || await page.evaluate(() => {
    return document.body.innerText.includes('Team Overview');
  });
  console.log(`      ${teamCard ? '✓' : '✗'} TeamOverviewCard component`);

  // Check for PendingReviewsList
  const pendingReviews = await page.$('text/Pending Reviews') || await page.evaluate(() => {
    return document.body.innerText.includes('Pending Reviews');
  });
  console.log(`      ${pendingReviews ? '✓' : '✗'} PendingReviewsList component`);

  // Check for "No pending reviews" message
  const noPending = await page.evaluate(() => {
    return document.body.innerText.includes('No pending reviews') ||
           document.body.innerText.includes('No team data yet');
  });
  console.log(`      ${noPending ? '✓' : '○'} Empty state message (${noPending ? 'displayed' : 'not needed'})`);

  await page.screenshot({ path: 'qa-screenshots/manager-dashboard.png', fullPage: true });
}
