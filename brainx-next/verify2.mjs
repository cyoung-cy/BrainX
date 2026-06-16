import { chromium } from 'playwright';

const br = await chromium.launch({ headless: true });
const pg = await br.newPage();
await pg.goto('http://localhost:3000/editor-lab/split-demo');
await pg.waitForLoadState('networkidle');
await pg.screenshot({ path: 'c:/tmp/split2_initial.png', fullPage: false });

// 1. 노트 클릭으로 패널 교체
const beforeTitle = await pg.locator('.border-t ~ div').first().textContent().catch(() => '?');
// Click JWT 정리 in sidebar
await pg.locator('text=JWT 정리').first().click();
await pg.waitForTimeout(300);
await pg.screenshot({ path: 'c:/tmp/split2_after_click.png' });
const activeTitle = await pg.locator('h1').first().textContent().catch(() => '?');
console.log('CLICK_REPLACE: before=Spring정리 after=%s', activeTitle?.trim());

// 2. 편집 모드 → Live Preview
await pg.locator('button:has-text("편집")').first().click();
await pg.waitForTimeout(200);
const hasTextarea = await pg.locator('textarea').count();
const hasOverlay = await pg.locator('[aria-hidden="true"]').count();
console.log('LIVE_PREVIEW: textarea=%d overlay=%d', hasTextarea, hasOverlay);
await pg.screenshot({ path: 'c:/tmp/split2_edit.png' });

// 3. 정렬 커스텀 드롭다운
const clockIcon = await pg.locator('button:has-text("최근 수정순")').count();
console.log('SORT_DROPDOWN: custom button=%d', clockIcon);
await pg.locator('button:has-text("최근 수정순")').first().click();
await pg.waitForTimeout(100);
const dropdownItems = await pg.locator('text=제목순').count();
console.log('SORT_DROPDOWN: open, 제목순=%d', dropdownItems);
await pg.screenshot({ path: 'c:/tmp/split2_sort.png' });
await pg.keyboard.press('Escape');

// 4. 폴더 구조 (더 강한 시각)
const folderBtns = await pg.locator('button').filter({ hasText: /^(Backend|Frontend|AI|Architecture|DevOps|Database)$/ }).count();
console.log('FOLDER_BTNS: %d', folderBtns);

// 5. 즐겨찾기 섹션
const favSection = await pg.locator('text=즐겨찾기').first().isVisible().catch(() => false);
console.log('FAV_SECTION: %s', favSection);

// 6. ContextPanel 카드
await pg.locator('button:has-text("읽기")').first().click(); // back to read
await pg.waitForTimeout(100);
const tocCard = await pg.locator('text=목차').count();
const linkCard = await pg.locator('text=연결 · 백링크').count();
const aiCard = await pg.locator('text=AI 연결 제안').count();
console.log('CONTEXT_CARDS: 목차=%d 연결=%d AI=%d', tocCard, linkCard, aiCard);

// 7. 드래그 힌트 텍스트 (새로운 hint box)
const hintBox = await pg.locator('text=/드래그/').count();
console.log('HINT_BOX: %d', hintBox);

await pg.screenshot({ path: 'c:/tmp/split2_final.png', fullPage: false });
await br.close();
console.log('DONE');
