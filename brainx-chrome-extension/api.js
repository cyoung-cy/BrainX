// BrainX API 클라이언트 (id: chrome-extension, SSOT: brainx-openapi.ssot.yaml)
// 기본 API 게이트웨이 주소: http://localhost:8088 (Gateway-Service)
// 운영: https://api.brainx.com

// 로컬 개발: localhost 사용 (기본값)
// AWS 배포 후: chrome.storage.local에 아래 값으로 설정
//   brainxApiBase = 'https://api.brainx.com'
//   brainxAppBase = 'https://brainx.com'
const DEFAULT_API_BASE = 'http://localhost:8088';
const DEFAULT_APP_BASE = 'http://localhost:3000';

async function getApiBase() {
  return new Promise(resolve => {
    chrome.storage.local.get(['brainxApiBase'], result => {
      resolve(result.brainxApiBase || DEFAULT_API_BASE);
    });
  });
}

async function getAppBase() {
  return new Promise(resolve => {
    chrome.storage.local.get(['brainxAppBase'], result => {
      resolve(result.brainxAppBase || DEFAULT_APP_BASE);
    });
  });
}

async function getTokens() {
  return new Promise(resolve => {
    chrome.storage.local.get(['accessToken', 'refreshToken'], result => {
      resolve({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    });
  });
}

async function saveTokens(accessToken, refreshToken) {
  return new Promise(resolve => {
    chrome.storage.local.set({ accessToken, refreshToken }, resolve);
  });
}

async function clearTokens() {
  return new Promise(resolve => {
    chrome.storage.local.remove(['accessToken', 'refreshToken'], resolve);
  });
}

// POST /api/v1/auth/login/local (SSOT operationId: loginLocal)
async function login(email, password) {
  const base = await getApiBase();
  const res = await fetch(`${base}/api/v1/auth/login/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || '로그인에 실패했습니다.');
  }
  await saveTokens(json.data.accessToken, json.data.refreshToken);
  return json.data;
}

// POST /api/v1/auth/token/refresh (SSOT operationId: refreshToken)
async function refreshAccessToken() {
  const base = await getApiBase();
  const { refreshToken } = await getTokens();
  if (!refreshToken) throw new Error('세션이 만료되었습니다. 다시 로그인해 주세요.');
  let res;
  try {
    res = await fetch(`${base}/api/v1/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (err) {
    throw new Error(`서버 연결 실패 (${base}). 서비스가 실행 중인지 확인해주세요.`);
  }
  const json = await res.json();
  if (!res.ok || !json.success) {
    await clearTokens();
    throw new Error('세션이 만료되었습니다. 다시 로그인해 주세요.');
  }
  await saveTokens(json.data.accessToken, json.data.refreshToken);
  return json.data.accessToken;
}

async function fetchWithAuth(url, options = {}) {
  let { accessToken } = await getTokens();
  if (!accessToken) throw new Error('로그인이 필요합니다.');

  const makeRequest = async (token) => {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
  };

  let res;
  try {
    res = await makeRequest(accessToken);
  } catch (err) {
    const base = await getApiBase();
    throw new Error(`서버 연결 실패 (${base}). 서비스가 실행 중인지 확인해주세요.`);
  }

  if (res.status === 401) {
    // Access token expired — try to refresh
    let refreshedToken;
    try {
      refreshedToken = await refreshAccessToken();
    } catch (err) {
      await clearTokens();
      throw err; // preserve the specific error (session expired or server error)
    }
    try {
      res = await makeRequest(refreshedToken);
    } catch (err) {
      const base = await getApiBase();
      throw new Error(`서버 연결 실패 (${base}). 서비스가 실행 중인지 확인해주세요.`);
    }
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`서버 오류 (HTTP ${res.status}) — 응답 본문이 없거나 JSON 형식이 아닙니다.`);
  }
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || `요청 실패 (${res.status})`);
  }
  return json;
}

// GET /api/v1/folders/tree (SSOT operationId: getFolderTree, consumer: chrome-extension)
async function getFolderTree() {
  const base = await getApiBase();
  const json = await fetchWithAuth(`${base}/api/v1/folders/tree`);
  return json.data?.folders || [];
}

// POST /api/v1/extension/captures (SSOT operationId: captureFromExtension, consumer: chrome-extension)
// ExtensionCaptureRequest: { url, title, selectedText?, metaDescription?, folderId? }
// ExtensionCaptureData: { noteId }
async function captureFromExtension({ url, title, selectedText, metaDescription, folderId }) {
  const base = await getApiBase();
  const idempotencyKey = `capture-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const json = await fetchWithAuth(`${base}/api/v1/extension/captures`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ url, title, selectedText: selectedText || null, metaDescription: metaDescription || null, folderId: folderId || null }),
  });
  return json.data;
}

async function logout() {
  await clearTokens();
}

async function isLoggedIn() {
  const { accessToken } = await getTokens();
  return !!accessToken;
}

async function getAppNoteUrl(noteId) {
  const base = await getAppBase();
  return `${base}/?noteId=${noteId}`;
}
