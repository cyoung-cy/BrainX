const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1100, height: 950 } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    // 데모 세션이 아닌 "실제 로그인"처럼 보이는 세션을 주입 (accessToken이 demo 토큰이 아님)
    window.localStorage.setItem('brainx_auth_session_v1', JSON.stringify({
      accessToken: 'fake-real-access-token', refreshToken: 'fake-real-refresh-token', tokenType: 'Bearer',
      userId: 'usr_real_test', email: 'real@brainx.local', nickname: 'Real Test User', profileImageUrl: null,
      role: 'ROLE_USER', requires2fa: false, onboardingToken: null, next: 'HOME'
    }));
  });

  await page.goto('http://localhost:3000/import', { waitUntil: 'networkidle' });
  await page.getByText('Real Test User').click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: '요금제 업그레이드' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '__pw_cancel_before.png', fullPage: true });

  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('button', { name: /Pro로 업그레이드/ }).click()
  ]);
  await popup.waitForLoadState('domcontentloaded');
  console.log('popup url:', popup.url());
  await page.waitForTimeout(800);
  await page.screenshot({ path: '__pw_cancel_pending.png', fullPage: true });

  // 사용자가 결제창 자체를 그냥 닫아버림
  await popup.close();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '__pw_cancel_after.png', fullPage: true });

  console.log('ERRORS:', JSON.stringify(errors));
  await browser.close();
})();
