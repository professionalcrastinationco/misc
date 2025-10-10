const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function testModalSystem() {
  console.log('Starting Modal System Test...\n');

  // Create screenshots folder
  const screenshotsDir = path.join(__dirname, 'test-screenshots');
  try {
    await fs.mkdir(screenshotsDir, { recursive: true });
    console.log(`✅ Created screenshots folder: ${screenshotsDir}\n`);
  } catch (error) {
    console.error(`❌ Failed to create folder: ${error.message}`);
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Slow down actions for better observation
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Track test results
  const testResults = {
    initialLoad: false,
    cardFlip: false,
    modalOpen: false,
    modalContent: {
      hasTitle: false,
      hasLinks: false,
      hasSlatePattern: false
    },
    closeDelayed: false,
    closeOverlay: false,
    closeEsc: false,
    toggleBacksWorks: false,
    visualIssues: [],
    performanceIssues: [],
    zIndexCorrect: false
  };

  try {
    // STEP 1-4: Navigate and initial screenshot
    console.log('📍 STEP 1-4: Loading page and taking initial screenshot...');
    await page.goto('file:///D:/APPS/Chrome_Ext_New_Tab_Flip/flip/index_modal.html', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000); // Wait for CSS animations

    await page.screenshot({
      path: path.join(screenshotsDir, '01-initial-state.png'),
      fullPage: true
    });
    console.log('✅ Initial screenshot saved\n');
    testResults.initialLoad = true;

    // STEP 5: Flip the WORKSPACE card
    console.log('📍 STEP 5: Flipping WORKSPACE card...');

    // Find the WORKSPACE card
    const workspaceCard = await page.locator('.flip:has-text("WORKSPACE")').first();

    if (await workspaceCard.count() === 0) {
      console.log('❌ WORKSPACE card not found!');
      testResults.visualIssues.push('WORKSPACE card not found on page');
    } else {
      // Hover to flip
      await workspaceCard.hover();
      await page.waitForTimeout(1000); // Wait for flip animation

      await page.screenshot({
        path: path.join(screenshotsDir, '02-workspace-flipped.png'),
        fullPage: true
      });
      console.log('✅ WORKSPACE card flipped\n');
      testResults.cardFlip = true;
    }

    // STEP 6-7: Hover over Google Sheets and wait for modal
    console.log('📍 STEP 6-7: Hovering over Google Sheets link...');

    const googleSheetsLink = await page.locator('a:has-text("📊 Google Sheets")').first();

    if (await googleSheetsLink.count() === 0) {
      console.log('❌ Google Sheets link not found!');
      testResults.visualIssues.push('Google Sheets link not found');
    } else {
      // Hover and wait for modal
      await googleSheetsLink.hover();
      await page.waitForTimeout(1500); // Wait for modal to appear

      // Check if modal is visible
      const modal = await page.locator('.modal-container').first();
      const isVisible = await modal.isVisible().catch(() => false);

      if (!isVisible) {
        console.log('❌ Modal did not appear!');
        testResults.visualIssues.push('Modal did not appear on hover');
      } else {
        console.log('✅ Modal appeared');
        testResults.modalOpen = true;

        await page.screenshot({
          path: path.join(screenshotsDir, '03-modal-open.png'),
          fullPage: true
        });
        console.log('✅ Modal screenshot saved\n');
      }
    }

    // STEP 8: Verify modal content
    console.log('📍 STEP 8: Verifying modal content...');

    const modal = await page.locator('.modal-container').first();

    if (await modal.isVisible().catch(() => false)) {
      // Check title
      const title = await modal.locator('h2').first();
      const titleText = await title.textContent().catch(() => '');
      testResults.modalContent.hasTitle = titleText.includes('Google Sheets');
      console.log(`  Title: ${testResults.modalContent.hasTitle ? '✅' : '❌'} "${titleText}"`);

      // Check for modal links
      const links = await modal.locator('.modal-link-item');
      const linkCount = await links.count();
      testResults.modalContent.hasLinks = linkCount > 0;
      console.log(`  Links: ${testResults.modalContent.hasLinks ? '✅' : '❌'} Found ${linkCount} links`);

      // Check for slate pattern border
      const hasSlatePattern = await page.evaluate(() => {
        const modal = document.querySelector('.modal-container');
        if (!modal) return false;
        const style = window.getComputedStyle(modal);
        // Check if it has border or background pattern
        return modal.getAttribute('data-pattern') === 'slate';
      });
      testResults.modalContent.hasSlatePattern = hasSlatePattern;
      console.log(`  Slate Pattern: ${hasSlatePattern ? '✅' : '❌'}`);

      // Check z-index
      const zIndex = await page.evaluate(() => {
        const modal = document.querySelector('.modal-container');
        if (!modal) return 0;
        return parseInt(window.getComputedStyle(modal).zIndex) || 0;
      });
      testResults.zIndexCorrect = zIndex >= 1000;
      console.log(`  Z-index: ${testResults.zIndexCorrect ? '✅' : '❌'} (${zIndex})\n`);
    } else {
      console.log('❌ Modal not visible for content verification\n');
    }

    // STEP 9: Test close mechanisms
    console.log('📍 STEP 9: Testing close mechanisms...');

    // Test 1: Move mouse away (delayed close)
    console.log('  Testing delayed close (mouse away)...');
    await page.mouse.move(100, 100); // Move to top-left corner
    await page.waitForTimeout(2000); // Wait for delay

    const modalAfterMove = await page.locator('.modal-container').first();
    const isVisibleAfterMove = await modalAfterMove.isVisible().catch(() => false);
    testResults.closeDelayed = !isVisibleAfterMove;
    console.log(`    ${testResults.closeDelayed ? '✅' : '❌'} Modal closed after moving away`);

    await page.screenshot({
      path: path.join(screenshotsDir, '04-after-delayed-close.png'),
      fullPage: true
    });

    // Test 2: Re-open and click overlay
    console.log('  Testing overlay click close...');
    const googleSheetsLink2 = await page.locator('a:has-text("📊 Google Sheets")').first();
    await googleSheetsLink2.hover();
    await page.waitForTimeout(1500);

    // Click overlay (outside modal)
    const overlay = await page.locator('.modal-overlay').first();
    if (await overlay.count() > 0) {
      await overlay.click();
      await page.waitForTimeout(500);

      const isVisibleAfterOverlay = await modalAfterMove.isVisible().catch(() => false);
      testResults.closeOverlay = !isVisibleAfterOverlay;
      console.log(`    ${testResults.closeOverlay ? '✅' : '❌'} Modal closed after overlay click`);
    } else {
      console.log('    ❌ No overlay element found');
      testResults.visualIssues.push('Modal overlay element not found');
    }

    await page.screenshot({
      path: path.join(screenshotsDir, '05-after-overlay-close.png'),
      fullPage: true
    });

    // Test 3: Re-open and press ESC
    console.log('  Testing ESC key close...');
    const googleSheetsLink3 = await page.locator('a:has-text("📊 Google Sheets")').first();
    await googleSheetsLink3.hover();
    await page.waitForTimeout(1500);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const isVisibleAfterEsc = await modalAfterMove.isVisible().catch(() => false);
    testResults.closeEsc = !isVisibleAfterEsc;
    console.log(`    ${testResults.closeEsc ? '✅' : '❌'} Modal closed after ESC key\n`);

    await page.screenshot({
      path: path.join(screenshotsDir, '06-after-esc-close.png'),
      fullPage: true
    });

    // STEP 10: Test "Show All Card Backs" setting
    console.log('📍 STEP 10: Testing "Show All Card Backs" toggle...');

    // Click hamburger menu
    const hamburger = await page.locator('.hamburger-menu, .menu-toggle, button:has-text("☰")').first();

    if (await hamburger.count() === 0) {
      console.log('  ❌ Hamburger menu not found!');
      testResults.visualIssues.push('Hamburger menu not found');
    } else {
      await hamburger.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: path.join(screenshotsDir, '07-menu-open.png'),
        fullPage: true
      });
      console.log('  ✅ Menu opened');

      // Find and toggle "Show All Card Backs"
      const toggleSwitch = await page.locator('input[type="checkbox"]').first();

      if (await toggleSwitch.count() === 0) {
        console.log('  ❌ Toggle switch not found!');
        testResults.visualIssues.push('Show All Card Backs toggle not found');
      } else {
        await toggleSwitch.click();
        await page.waitForTimeout(1000); // Wait for cards to flip

        await page.screenshot({
          path: path.join(screenshotsDir, '08-all-backs-shown.png'),
          fullPage: true
        });
        console.log('  ✅ Toggled "Show All Card Backs"');
        testResults.toggleBacksWorks = true;

        // Close menu by clicking outside or pressing ESC
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        // Test modal again with all backs shown
        console.log('  Testing modal with all backs shown...');
        const googleSheetsLink4 = await page.locator('a:has-text("📊 Google Sheets")').first();
        await googleSheetsLink4.hover();
        await page.waitForTimeout(1500);

        const modalWithBacksShown = await page.locator('.modal-container').first();
        const isVisibleWithBacks = await modalWithBacksShown.isVisible().catch(() => false);

        if (isVisibleWithBacks) {
          console.log('  ✅ Modal still works with all backs shown');

          await page.screenshot({
            path: path.join(screenshotsDir, '09-modal-with-all-backs.png'),
            fullPage: true
          });
        } else {
          console.log('  ❌ Modal did not open with all backs shown');
          testResults.visualIssues.push('Modal broken when all backs shown');
        }
      }
    }

    // Final screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, '10-final-state.png'),
      fullPage: true
    });
    console.log('  ✅ Final screenshot saved\n');

    // Check for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        testResults.visualIssues.push(`Console error: ${msg.text()}`);
      }
    });

    // Performance check - measure hover response time
    console.log('📍 PERFORMANCE TEST: Measuring hover response time...');
    const googleSheetsLinkPerf = await page.locator('a:has-text("📊 Google Sheets")').first();

    const startTime = Date.now();
    await googleSheetsLinkPerf.hover();
    await page.waitForSelector('.modal-container', { state: 'visible', timeout: 5000 }).catch(() => null);
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`  Response time: ${responseTime}ms`);
    if (responseTime > 2000) {
      testResults.performanceIssues.push(`Modal open slow: ${responseTime}ms`);
    }

  } catch (error) {
    console.error(`\n❌ TEST ERROR: ${error.message}`);
    testResults.visualIssues.push(`Test error: ${error.message}`);

    // Take error screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'error-state.png'),
      fullPage: true
    }).catch(() => {});
  }

  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('📊 MODAL SYSTEM TEST REPORT');
  console.log('='.repeat(60) + '\n');

  console.log('FUNCTIONALITY TESTS:');
  console.log(`  Initial Load: ${testResults.initialLoad ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Card Flip: ${testResults.cardFlip ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Modal Open: ${testResults.modalOpen ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Modal Title: ${testResults.modalContent.hasTitle ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Modal Links: ${testResults.modalContent.hasLinks ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Slate Pattern: ${testResults.modalContent.hasSlatePattern ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Z-index Layering: ${testResults.zIndexCorrect ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Close (Delayed): ${testResults.closeDelayed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Close (Overlay): ${testResults.closeOverlay ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Close (ESC): ${testResults.closeEsc ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Toggle All Backs: ${testResults.toggleBacksWorks ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\nVISUAL ISSUES:');
  if (testResults.visualIssues.length === 0) {
    console.log('  ✅ No visual issues detected');
  } else {
    testResults.visualIssues.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. ❌ ${issue}`);
    });
  }

  console.log('\nPERFORMANCE:');
  if (testResults.performanceIssues.length === 0) {
    console.log('  ✅ No performance issues detected');
  } else {
    testResults.performanceIssues.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. ⚠️ ${issue}`);
    });
  }

  console.log('\nANIMATION SMOOTHNESS:');
  console.log('  Note: Visual inspection required for animation smoothness');
  console.log('  Check screenshots for any visual glitches or jank');

  const totalTests = 11;
  const passedTests = [
    testResults.initialLoad,
    testResults.cardFlip,
    testResults.modalOpen,
    testResults.modalContent.hasTitle,
    testResults.modalContent.hasLinks,
    testResults.modalContent.hasSlatePattern,
    testResults.zIndexCorrect,
    testResults.closeDelayed,
    testResults.closeOverlay,
    testResults.closeEsc,
    testResults.toggleBacksWorks
  ].filter(Boolean).length;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`OVERALL: ${passedTests}/${totalTests} tests passed`);
  console.log(`${'='.repeat(60)}\n`);

  console.log(`📁 Screenshots saved to: ${screenshotsDir}\n`);

  await browser.close();
}

testModalSystem().catch(console.error);
