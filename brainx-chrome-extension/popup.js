// popup.js - BrainX Web Clipper 팝업 로직

let pageInfo = null;
let savedNoteId = null;
let savedNoteUrl = null;

// ─── 뷰 전환 ───
function showView(id) {
  // loading view는 항상 먼저 명시적으로 숨김
  const loadingEl = document.getElementById('viewLoading');
  if (loadingEl) loadingEl.style.display = 'none';

  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));

  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

function showLoading() {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('viewLoading');
  if (el) el.style.display = 'flex';
}

// ─── 토스트 ───
function showToast(msg, duration = 2000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ─── 에러 ───
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}
function clearError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.classList.remove('visible');
}

// ─── 현재 탭 정보 ───
async function getPageInfoFromTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab) return reject(new Error('탭 정보를 가져올 수 없습니다.'));
      chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_INFO' }, response => {
        if (chrome.runtime.lastError || !response) {
          resolve({ url: tab.url, title: tab.title || tab.url, selectedText: '', metaDescription: '' });
        } else {
          resolve(response);
        }
      });
    });
  });
}

// ─── JWT Access Token 만료 여부 확인 (서명 검증 없이 exp 클레임만 확인) ───
function isAccessTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return !payload.exp || payload.exp <= Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}

// ─── BrainX 앱 탭에서 토큰 자동 감지 ───
// 팝업이 열릴 때마다 열려있는 BrainX 탭을 스캔해서 토큰을 읽어온다.
// 우선순위: 유효한 BrainX 토큰 > chrome.storage 기존 토큰 > 만료된 BrainX 토큰 (refresh 시도)
// BrainX access token 만료 + chrome.storage에 refreshToken 있으면 스킵
// — extension이 독립적으로 rotate했을 경우 BrainX의 refreshToken은 이미 revoke됐을 수 있음
async function tryImportTokensFromBrainxTab() {
  const appBase = await getAppBase(); // default: http://localhost:3000
  const url = new URL(appBase);
  const pattern = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}/*`;

  try {
    const tabs = await new Promise(resolve => chrome.tabs.query({ url: pattern }, resolve));
    for (const tab of tabs) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // brainx-next: localStorage key = 'brainx_auth_session_v1' (JSON 객체)
            try {
              const raw = localStorage.getItem('brainx_auth_session_v1');
              if (!raw) return { accessToken: null, refreshToken: null };
              const session = JSON.parse(raw);
              return {
                accessToken: session.accessToken ?? null,
                refreshToken: session.refreshToken ?? null,
              };
            } catch {
              return { accessToken: null, refreshToken: null };
            }
          },
        });
        const { accessToken, refreshToken } = results[0]?.result || {};
        if (!accessToken || !refreshToken) continue;

        if (isAccessTokenExpired(accessToken)) {
          // BrainX access token 만료 — chrome.storage에 refreshToken이 있으면 스킵
          // (extension이 독립적으로 rotate했다면 BrainX의 refreshToken은 이미 revoke됨)
          const { refreshToken: storedRefresh } = await getTokens();
          if (storedRefresh) continue;
          // chrome.storage가 비어있으면 BrainX 토큰으로 refresh 시도 (최후 수단)
        }

        await saveTokens(accessToken, refreshToken);
        return true;
      } catch {
        // 해당 탭이 아직 로드 중이거나 스크립트 실행 불가 → 다음 탭 시도
      }
    }
  } catch {
    // tabs API 오류 → 무시
  }
  return false;
}

// ─── 폴더 트리 렌더링 ───
function renderFolderOptions(folders, parentId = null, depth = 0) {
  const select = document.getElementById('folderSelect');
  const prefix = '  '.repeat(depth);
  for (const folder of folders) {
    if ((folder.parentFolderId || null) !== parentId) continue;
    const opt = document.createElement('option');
    opt.value = folder.folderId;
    opt.textContent = `${prefix}📁 ${folder.name}`;
    select.appendChild(opt);
    renderFolderOptions(folders, folder.folderId, depth + 1);
  }
}

// ─── 캡처 뷰 초기화 ───
async function initCaptureView() {
  showLoading();
  try {
    pageInfo = await getPageInfoFromTab();

    document.getElementById('pageTitle').textContent = pageInfo.title;
    document.getElementById('pageUrl').textContent = pageInfo.url;

    if (pageInfo.selectedText) {
      document.getElementById('selectedSection').style.display = 'block';
      document.getElementById('selectedPreview').textContent = pageInfo.selectedText;
    } else {
      document.getElementById('selectedSection').style.display = 'none';
    }

    // GET /api/v1/folders/tree
    const folders = await getFolderTree();
    const select = document.getElementById('folderSelect');
    select.innerHTML = '<option value="">📁 최상위 (폴더 없음)</option>';
    renderFolderOptions(folders);

    document.getElementById('logoutBtn').style.display = '';
    showView('viewCapture');
  } catch (err) {
    // 세션 만료 에러는 로그인 화면으로
    if (err.message.includes('세션') || err.message.includes('로그인이 필요')) {
      await clearTokens();
      document.getElementById('logoutBtn').style.display = 'none';
      showView('viewLogin');
      showToast('세션이 만료되었습니다. 다시 로그인해 주세요.', 3000);
    } else {
      showError('captureError', err.message || '오류가 발생했습니다.');
      showView('viewCapture');
    }
  }
}

// ─── 초기화 ───
// 매번 팝업이 열릴 때 실행된다.
// 1) BrainX 앱 탭에서 최신 토큰 가져오기 시도 (소셜/이메일 로그인 자동 감지)
// 2) BrainX 탭 없으면 기존 저장 토큰 사용
// 3) 토큰 없으면 로그인 뷰
async function init() {
  showLoading();

  // 항상 BrainX 탭을 먼저 스캔해서 최신 토큰 가져오기 (만료 토큰 자동 갱신)
  const imported = await tryImportTokensFromBrainxTab();
  if (imported) {
    await initCaptureView();
    return;
  }

  // BrainX 탭 없으면 저장된 토큰 사용
  if (await isLoggedIn()) {
    await initCaptureView();
    return;
  }

  document.getElementById('logoutBtn').style.display = 'none';
  showView('viewLogin');
}

// ─── 이메일 로그인 ───
async function handleLogin() {
  clearError('loginError');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showError('loginError', '이메일과 비밀번호를 입력해 주세요.');
    return;
  }

  const btnText = document.getElementById('loginBtnText');
  const btn = document.getElementById('loginBtn');
  btnText.innerHTML = '<span class="spinner"></span>';
  btn.disabled = true;

  try {
    await login(email, password);
    await initCaptureView();
  } catch (err) {
    showError('loginError', err.message || '로그인에 실패했습니다.');
  } finally {
    btnText.textContent = '로그인';
    btn.disabled = false;
  }
}

// ─── 소셜 로그인 ───
// 팝업이 탭 전환 시 닫히므로 polling 대신:
// BrainX 앱 탭을 열고 안내 메시지를 보여준다.
// 사용자가 로그인 완료 후 익스텐션 아이콘을 다시 클릭하면
// init()의 tryImportTokensFromBrainxTab()이 자동으로 토큰을 감지한다.
async function handleSocialLogin(provider) {
  const appBase = await getAppBase();
  chrome.tabs.create({ url: `${appBase}/login` });

  const names = { google: 'Google', kakao: 'Kakao', naver: 'Naver' };
  document.getElementById('socialWaitDesc').innerHTML =
    `<strong>${names[provider] || provider}</strong> 로그인을 위해 BrainX 앱을 열었습니다.<br/><br/>` +
    `로그인을 완료한 뒤<br/><strong>익스텐션 아이콘을 다시 클릭</strong>해주세요.`;
  showView('viewSocialWait');
}

// ─── 저장 ───
async function handleCapture() {
  clearError('captureError');
  const folderId = document.getElementById('folderSelect').value || null;

  const btnText = document.getElementById('captureBtnText');
  const btn = document.getElementById('captureBtn');
  btnText.innerHTML = '<span class="spinner"></span>';
  btn.disabled = true;

  try {
    const result = await captureFromExtension({
      url: pageInfo.url,
      title: pageInfo.title,
      selectedText: pageInfo.selectedText || null,
      metaDescription: pageInfo.metaDescription || null,
      folderId,
    });

    savedNoteId = result.noteId;
    savedNoteUrl = await getAppNoteUrl(savedNoteId);

    chrome.runtime.sendMessage({ type: 'SET_BADGE', text: '✓', color: '#10b981' });
    setTimeout(() => chrome.runtime.sendMessage({ type: 'SET_BADGE', text: '', color: '' }), 3000);

    showView('viewSuccess');
    showToast('노트가 저장되었습니다!');
  } catch (err) {
    if (err.message.includes('세션') || err.message.includes('로그인이 필요')) {
      await clearTokens();
      showView('viewLogin');
      document.getElementById('logoutBtn').style.display = 'none';
      showToast('세션이 만료되었습니다. 다시 로그인해 주세요.', 3000);
    } else {
      showError('captureError', err.message || '저장에 실패했습니다.');
    }
  } finally {
    btnText.textContent = 'BrainX에 저장';
    btn.disabled = false;
  }
}

// ─── 이벤트 바인딩 ───
document.addEventListener('DOMContentLoaded', () => {
  init();

  document.getElementById('loginBtn').addEventListener('click', handleLogin);
  document.getElementById('loginPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });

  document.getElementById('socialGoogleBtn').addEventListener('click', () => handleSocialLogin('google'));
  document.getElementById('socialKakaoBtn').addEventListener('click', () => handleSocialLogin('kakao'));
  document.getElementById('socialNaverBtn').addEventListener('click', () => handleSocialLogin('naver'));

  // 소셜 대기 → 돌아가기
  document.getElementById('socialCancelBtn').addEventListener('click', () => showView('viewLogin'));

  document.getElementById('captureBtn').addEventListener('click', handleCapture);

  document.getElementById('openInBrainxBtn').addEventListener('click', () => {
    if (savedNoteUrl) chrome.tabs.create({ url: savedNoteUrl });
  });

  document.getElementById('captureAnotherBtn').addEventListener('click', async () => {
    savedNoteId = null;
    savedNoteUrl = null;
    await initCaptureView();
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await logout();
    document.getElementById('logoutBtn').style.display = 'none';
    showView('viewLogin');
    showToast('로그아웃 되었습니다.');
  });
});
