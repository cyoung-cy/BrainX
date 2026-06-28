# BrainX 버그 분석 보고서

- **분석 일자**: 2026-06-26
- **분석 범위**: 프론트엔드(Next.js), 크롬 익스텐션, 백엔드(Java Spring Boot 마이크로서비스 6개)
- **분석 방법**: 단위 테스트 / 통합 테스트 / 시스템 테스트 / 인수 테스트 / 블랙박스 테스트 / 화이트박스 테스트 관점 정적 코드 분석

---

## 요약

| 심각도 | 프론트엔드 | 백엔드 | 합계 |
|--------|-----------|--------|------|
| HIGH   | 6건       | 5건    | 11건 |
| MED    | 4건       | 6건    | 10건 |
| LOW    | 1건       | 2건    | 3건  |
| **합계** | **11건** | **13건** | **24건** |

---

## 심각도 기준

| 등급 | 기준 |
|------|------|
| HIGH | 보안 취약점, 런타임 크래시, 데이터 손실, 기능 완전 불동작 |
| MED  | 특정 조건에서 오동작, 성능 저하, 일관성 결여 |
| LOW  | 엣지 케이스 UX 문제, 방어 코드 부재 |

---

## 파트 1. 프론트엔드 / 크롬 익스텐션

---

### [FE-01] OAuth 온보딩 provider 하드코딩

| 항목 | 내용 |
|------|------|
| 심각도 | HIGH |
| 분류 | 통합 테스트 / 블랙박스 테스트 |
| 파일 | `brainx-next/lib/auth-api.ts:272` |

**버그 설명**

소셜 회원가입(Google / Kakao / Naver) 온보딩 완료 시 `saveAuthSession()`을 호출할 때 `provider: "email"`로 고정 저장한다. 이후 `readRecentSocialLoginProvider()`가 항상 `null`을 반환하여 "최근 로그인" UI가 표시되지 않고, 소셜 프로바이더 기반 로직이 전체적으로 오동작한다.

**문제 코드**

```ts
export async function completeOnboarding(payload: { onboardingToken: string; ... }) {
  const data = await request<AuthSession>("/api/v1/auth/onboarding/complete", { ... });
  saveAuthSession({ ...data, provider: "email" }); // 항상 "email" 하드코딩
  return data;
}
```

**수정 방향**

`provider: "email"` 오버라이드를 제거하고 `saveAuthSession({ ...data })`로 서버 응답의 `data.provider`를 그대로 사용한다. 단, 서버 응답에 `provider` 필드가 포함되어 있어야 한다.

---

### [FE-02] 데모 세션 분기 조건 불일치

| 항목 | 내용 |
|------|------|
| 심각도 | HIGH |
| 분류 | 통합 테스트 |
| 파일 | `brainx-next/lib/workspace-api.ts:109`, `brainx-next/lib/ingestion-api.ts:83` |

**버그 설명**

`workspace-api`는 `USE_MOCK_NOTES && isDemoSession(session)` 두 조건을 모두 체크하지만, `ingestion-api`는 `isDemoSession(session)`만 체크한다. `USE_MOCK_NOTES=false`인 실제 서버 연결 환경에서 데모 세션이 존재하면 workspace는 실제 서버에 요청을 보내고 ingestion은 하드코딩된 가짜 응답을 반환하여 동작이 뒤섞인다.

**문제 코드**

```ts
// workspace-api.ts:109 — 두 조건 체크
if (USE_MOCK_NOTES && session?.accessToken && isDemoSession(session)) {
  return demoWorkspaceResponse<T>(path);
}

// ingestion-api.ts:83 — USE_MOCK_NOTES 체크 없음
if (session?.accessToken && isDemoSession(session)) {
  return demoIngestionResponse<T>(path, init);
}
```

**수정 방향**

`ingestion-api`의 조건을 `USE_MOCK_NOTES && isDemoSession(session)`으로 통일하거나, 데모 모드를 별도 환경 변수로 명시하여 두 파일이 동일한 기준을 사용하도록 한다.

---

### [FE-03] workspace-api 403 응답 미처리

| 항목 | 내용 |
|------|------|
| 심각도 | HIGH |
| 분류 | 통합 테스트 / 블랙박스 테스트 |
| 파일 | `brainx-next/lib/workspace-api.ts:126` |

**버그 설명**

`ingestion-api`는 401과 403을 모두 처리하여 세션을 클리어하지만, `workspace-api`는 401만 처리한다. 권한 없는 리소스 접근(403) 시 세션 클리어가 발생하지 않고 에러 메시지가 그대로 노출된다.

**문제 코드**

```ts
// workspace-api.ts:126 — 403 누락
if (response.status === 401) {
  clearAuthSession();
  throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
}

// ingestion-api.ts — 올바른 예시
if (response.status === 401 || response.status === 403) { ... }
```

**수정 방향**

`workspace-api.ts`의 조건을 `response.status === 401 || response.status === 403`으로 변경한다.

---

### [FE-04] chrome.action.openPopup() MV3 제한

| 항목 | 내용 |
|------|------|
| 심각도 | HIGH |
| 분류 | 단위 테스트 / 블랙박스 테스트 |
| 파일 | `brainx-chrome-extension/background.js:13` |

**버그 설명**

Chrome Manifest V3에서 `chrome.action.openPopup()`은 직접적인 사용자 제스처(user gesture) 컨텍스트에서만 호출 가능하다. `contextMenus.onClicked`는 Chrome 127+ 이후 user gesture를 `openPopup()`에 전달하지 않아 실패한다. 결과적으로 우클릭 "BrainX에 저장" 메뉴가 팝업을 열지 못하고 조용히 실패한다.

**문제 코드**

```js
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'brainx-capture') return;
  chrome.action.openPopup(); // MV3에서 동작 불보장
});
```

**수정 방향**

`chrome.action.openPopup()` 대신 `chrome.windows.create()`로 standalone 팝업을 열거나, context menu 클릭 시 해당 탭에 content script 메시지를 보내 캡처를 직접 수행하도록 변경한다.

---

### [FE-05] pageInfo=null 상태에서 capture 뷰 노출

| 항목 | 내용 |
|------|------|
| 심각도 | HIGH |
| 분류 | 단위 테스트 / 화이트박스 테스트 |
| 파일 | `brainx-chrome-extension/popup.js:165-176` |

**버그 설명**

`initCaptureView()`에서 `getPageInfoFromTab()` 이후 `getFolderTree()`가 비-세션 에러로 실패하면 catch 블록이 에러를 표시하고 `viewCapture`를 보여준다. 이때 `pageInfo`가 `null`인 상태에서 사용자가 저장 버튼을 클릭하면 `handleCapture()`의 `pageInfo.url`에서 `TypeError: Cannot read properties of null` 런타임 크래시가 발생한다.

**문제 코드**

```js
} catch (err) {
  if (err.message.includes('세션') || ...) { ... }
  else {
    showError('captureError', err.message || '오류가 발생했습니다.');
    showView('viewCapture'); // pageInfo가 null인 채로 capture 뷰 표시
  }
}

// handleCapture에서:
const result = await captureFromExtension({
  url: pageInfo.url,     // pageInfo=null이면 TypeError
  title: pageInfo.title,
});
```

**수정 방향**

catch 블록에서 `viewCapture`를 표시할 때 "다시 시도" 버튼만 제공하거나, 저장 버튼을 `pageInfo !== null` 조건에서만 활성화한다.

---

### [FE-06] 마크다운 → HTML 변환 시 XSS 취약점

| 항목 | 내용 |
|------|------|
| 심각도 | HIGH |
| 분류 | 화이트박스 테스트 / 보안 |
| 파일 | `brainx-next/components/NoteEditor.tsx:85-93` |

**버그 설명**

`inlineHtml()` 함수가 마크다운 링크 `[text](href)`를 HTML로 변환할 때 `"` 만 이스케이프하고 `javascript:` 스킴을 필터링하지 않는다. Notion 등 외부에서 가져온 마크다운에 `[클릭](javascript:alert(document.cookie))`이 포함되면 실제 클릭 가능한 XSS 벡터가 생성된다.

**문제 코드**

```ts
.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_match, label: string, href: string) => {
  const safeHref = href.replace(/"/g, "&quot;"); // javascript: 스킴 미필터링
  return `<a href="${safeHref}">${label}</a>`;
})
```

**수정 방향**

href가 `http://`, `https://`, `#`, `/`로 시작하지 않으면 링크를 생성하지 않거나 텍스트만 반환한다. `content.js`의 `nodeToMarkdown`에서 `href.startsWith('javascript')`를 체크하는 기존 패턴을 참고한다.

---

### [FE-07] semantic search URL 이중 /intelligence 경로

| 항목 | 내용 |
|------|------|
| 심각도 | MED |
| 분류 | 통합 테스트 |
| 파일 | `brainx-next/lib/intelligence-api.ts:188` |

**버그 설명**

`semanticSearch`의 경로만 `/api/intelligence/intelligence/semantic-search`로 되어 있어 다른 엔드포인트 패턴과 불일치한다. Next.js 프록시(`route.ts`)가 `/api/intelligence/[...path]`를 잘라내고 업스트림에 전달하므로 실제 요청 경로는 `/api/v1/intelligence/semantic-search`가 된다. 다른 AI 엔드포인트들은 `/api/intelligence/ai/...` 패턴을 따른다.

**문제 코드**

```ts
// 현재: /api/intelligence/intelligence/semantic-search
// 다른 패턴: /api/intelligence/ai/inline-assists
//            /api/intelligence/notes/.../summary
```

**수정 방향**

`contracts-v2/brainx-openapi.ssot.yaml`에서 실제 Intelligence-Service의 semantic-search 경로를 확인한 후 일치하도록 수정한다.

---

### [FE-08] 페이지 본문을 metaDescription 필드에 혼용

| 항목 | 내용 |
|------|------|
| 심각도 | MED |
| 분류 | 통합 테스트 |
| 파일 | `brainx-chrome-extension/content.js:40` |

**버그 설명**

선택 영역이 없을 때 `bodyText`(페이지 전체 마크다운 본문, 최대 10,000자)를 `metaDescription` 필드에 담아 popup으로 전달한다. API 스펙상 `metaDescription`은 짧은 요약 설명 필드이므로 필드 의미가 불일치한다.

**문제 코드**

```js
sendResponse({
  url: window.location.href,
  title: document.title,
  selectedText,
  metaDescription: bodyText || metaDescription, // 본문을 metaDescription에 혼용
});
```

**수정 방향**

response 구조에 `bodyText` 필드를 별도 추가하고, popup.js와 `captureFromExtension`에서 각각 올바른 필드를 사용하도록 분리한다.

---

### [FE-09] createAssetUploadSession 파라미터 필드명 오류

| 항목 | 내용 |
|------|------|
| 심각도 | MED |
| 분류 | 단위 테스트 / 통합 테스트 |
| 파일 | `brainx-next/lib/workspace-api.ts:282` |

**버그 설명**

`targetFolderId` 파라미터를 받아서 API body에 `targetNoteId`라는 이름으로 전송한다. 폴더 ID를 노트 ID 필드에 보내므로 백엔드가 이 값을 처리하지 못한다.

**문제 코드**

```ts
async function createAssetUploadSession(file: File, targetFolderId?: string) {
  return authedRequest<AssetUploadSessionData>("/api/v1/assets/upload-sessions", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      targetNoteId: targetFolderId ?? null  // 필드명이 targetNoteId인데 값은 folderId
    })
  });
}
```

**수정 방향**

`contracts-v2/brainx-openapi.ssot.yaml`에서 해당 API의 요청 필드명을 확인하고 `targetFolderId` 또는 `folderId`로 수정한다.

---

### [FE-10] 드래프트 자동저장 ID 접두사 불일치

| 항목 | 내용 |
|------|------|
| 심각도 | MED |
| 분류 | 단위 테스트 / 화이트박스 테스트 |
| 파일 | `brainx-next/components/NotesWorkspace.tsx:1053` |

**버그 설명**

로컬 생성 노트 ID는 `makeBlankNote`에서 `note-${uid()}`(하이픈)를 사용하지만, 드래프트 자동저장 effect는 `startsWith("note_")`(언더스코어)를 체크한다. 두 접두사가 달라 실제 로컬 노트와 매칭되지 않아 드래프트 자동저장이 항상 스킵된다.

**문제 코드**

```ts
// makeBlankNote: id = `note-${uid()}`  (하이픈)

// 드래프트 autosave effect (line 1053):
if (!activeNote.id.startsWith("note_")) return; // 언더스코어 — 하이픈과 불일치
```

**수정 방향**

백엔드 ID 포맷을 확인해 접두사를 통일하거나(`note-` / `note_`), 접두사 비교 대신 `note.persisted === false` 조건으로 드래프트 저장 대상을 판단한다.

---

### [FE-11] 위키링크 빈 쿼리 시 정렬 없음

| 항목 | 내용 |
|------|------|
| 심각도 | LOW |
| 분류 | 블랙박스 테스트 / UX |
| 파일 | `brainx-next/components/WikiLinkAutocomplete.tsx:44` |

**버그 설명**

`[[` 입력 후 아무것도 타이핑하지 않으면 `q`가 빈 문자열이 되어 필터 없이 전체 노트가 후보로 들어간다. `.slice(0, 8)`로 제한하지만 정렬 기준이 없어 노트 수가 많을 때 의미 있는 목록을 제공하지 못한다.

**문제 코드**

```ts
const matches = q
  ? ctx.notes.filter((n) => n.title.toLowerCase().includes(q))
  : ctx.notes; // 빈 쿼리 시 전체 노트, 정렬 없음
```

**수정 방향**

빈 쿼리 시 최근 수정 순 상위 8개를 보여주도록 정렬을 추가한다.

---

## 파트 2. 백엔드 (Java Spring Boot 마이크로서비스)

---

### [BE-01] 비인증 요청 dev-test-user fallback — 인증 우회

| 항목 | 내용 |
|------|------|
| 심각도 | HIGH |
| 분류 | 화이트박스 테스트 / 보안 |
| 서비스 | Workspace-Service |
| 파일 | `CurrentActor.java:38` |

**버그 설명**

인증 정보(X-User-Id, X-Guest-Id 헤더)가 없는 요청이 `"dev-test-user"`로 fallback되어 비인증 요청이 실제 사용자 데이터에 접근 가능한 보안 구멍이 존재한다. TEMP 주석이 달려 있으나 프로덕션 빌드에서도 동작한다.

**문제 코드**

```java
// TEMP 주석이 있으나 프로덕션에서도 동작
return new Actor(ActorType.USER, DEV_TEST_USER_ID); // "dev-test-user"
```

**수정 방향**

X-User-Id와 X-Guest-Id 헤더가 모두 없을 경우 `WorkspaceException(UNAUTHORIZED)`를 throw한다. TEMP 코드를 즉시 제거한다.

---

### [BE-02] OAuth 인메모리 맵 무한 누적 (메모리 고갈 / DoS)

| 항목 | 내용 |
|------|------|
| 심각도 | HIGH |
| 분류 | 시스템 테스트 / 화이트박스 테스트 |
| 서비스 | User-Service |
| 파일 | `AuthService.java:69-70` |

**버그 설명**

OAuth state와 PendingOAuthSignup 맵이 서버 인메모리에 영구 누적된다. 사용자가 OAuth를 시작만 하고 완료하지 않으면 항목이 영원히 남아 메모리 고갈이 발생할 수 있다.

**문제 코드**

```java
private final Map<String, String> oauthStates = new ConcurrentHashMap<>();
private final Map<String, PendingOAuthSignup> pendingOAuthSignups = new ConcurrentHashMap<>();
// TTL 없음 — 삭제는 completeOAuth/completeOnboarding 성공 시에만 발생
```

**수정 방향**

Guava Cache의 `expireAfterWrite(10, MINUTES)` 또는 `ScheduledExecutorService`로 주기적 정리를 구현한다. 또는 Redis에 TTL을 설정해 저장한다.

---

### [BE-03] Notion 재귀 임포트 깊이 제한 없음 (StackOverflowError)

| 항목 | 내용 |
|------|------|
| 심각도 | HIGH |
| 분류 | 단위 테스트 / 화이트박스 테스트 |
| 서비스 | Ingestion-Service |
| 파일 | `ImportService.java:163` |

**버그 설명**

Notion 페이지 재귀 임포트에 깊이 제한이 없다. 순환 참조 또는 매우 깊은 중첩 페이지가 있을 경우 `StackOverflowError`가 발생한다.

**문제 코드**

```java
private List<String> importPageRecursive(String userId, String pageId, ...) {
    ...
    for (NotionApiService.ChildPageRef child : childPages) {
        List<String> childNoteIds = importPageRecursive(userId, child.id(), ...); // 무한 재귀 가능
    }
}
```

**수정 방향**

`depth` 파라미터를 추가하고 최대 깊이(예: 20) 초과 시 중단한다. 방문한 pageId를 `Set`으로 추적하여 순환 참조를 방지한다.

---

### [BE-04] 공유링크 expiresAt null NPE

| 항목 | 내용 |
|------|------|
| 심각도 | HIGH |
| 분류 | 단위 테스트 |
| 서비스 | Workspace-Service |
| 파일 | `WorkspaceService.java:459` |

**버그 설명**

`createShareLink` 시 `request.expiresAt()`이 null이면, 공유 링크 조회 시 `share.getExpiresAt().isBefore(Instant.now())` 호출에서 NPE가 발생한다. null 검사 없이 그대로 `ShareLink` 생성자에 전달된다.

**문제 코드**

```java
// 공유 링크 조회 시
if (share.isRevoked() || share.getExpiresAt().isBefore(Instant.now())) {
//                        ^^^^^^^^ expiresAt이 null이면 NPE
```

**수정 방향**

`createShareLink` 진입부에서 `expiresAt` null 시 기본값(예: 30일)을 부여하거나 명시적 예외를 던진다. `publicShare`에서도 `getExpiresAt() != null` 선행 체크를 추가한다.

---

### [BE-05] 스케줄러 fixedDelayString 단위 오류

| 항목 | 내용 |
|------|------|
| 심각도 | HIGH |
| 분류 | 단위 테스트 / 화이트박스 테스트 |
| 서비스 | Workspace-Service |
| 파일 | `NoteDraftFlushScheduler.java:16` |

**버그 설명**

`fixedDelayString`에 문자열 연결로 초→밀리초 변환을 처리한다. 설정값을 ms 단위로 오인해 큰 숫자(예: `30000`)를 입력하면 `"30000000"` = 30,000,000ms = 8.3시간이 되어 드래프트가 사실상 플러시되지 않는다.

**문제 코드**

```java
@Scheduled(
    fixedDelayString = "${brainx.workspace.draft.flush-interval-seconds:30}000"
    //                                                                    ^^^^ 문자열 "000" 붙이기
)
```

**수정 방향**

속성 값 자체를 밀리초로 정의하거나, `TimeUnit.SECONDS.toMillis(property)` 등 명시적 변환 방식을 사용한다.

---

### [BE-06] JWT Refresh 토큰 타이밍 공격 취약점

| 항목 | 내용 |
|------|------|
| 심각도 | MED |
| 분류 | 화이트박스 테스트 / 보안 |
| 서비스 | User-Service |
| 파일 | `JwtTokenProvider.java:96` |

**버그 설명**

Refresh token 검증 시 HMAC 서명 비교에 `String.equals()`를 사용하여 타이밍 공격(timing attack)에 취약하다. Gateway의 `JwtTokenVerifier`는 `MessageDigest.isEqual()`(상수 시간 비교)을 올바르게 사용하나 User-Service는 미사용이다.

**문제 코드**

```java
if (!sign(unsignedToken).equals(parts[2])) { // 비상수 시간 비교
```

**수정 방향**

`MessageDigest.isEqual(sign(unsignedToken).getBytes(UTF_8), parts[2].getBytes(UTF_8))`으로 교체한다.

---

### [BE-07] Draft Redis payload NPE

| 항목 | 내용 |
|------|------|
| 심각도 | MED |
| 분류 | 단위 테스트 |
| 서비스 | Workspace-Service |
| 파일 | `NoteDraftService.java:82` |

**버그 설명**

Redis에 저장된 draft payload에서 `baseVersion`이 없거나 숫자가 아닌 경우 NPE가 발생한다.

**문제 코드**

```java
((Number) payload.get("baseVersion")).intValue(), // null이면 NPE
Instant.parse((String) payload.get("clientSavedAt")), // null이면 DateTimeParseException
```

**수정 방향**

`payload.getOrDefault("baseVersion", 0)` 사용 및 `clientSavedAt` null 체크를 추가한다.

---

### [BE-08] Redis keys() 전체 스캔 — 블로킹 위험

| 항목 | 내용 |
|------|------|
| 심각도 | MED |
| 분류 | 시스템 테스트 / 화이트박스 테스트 |
| 서비스 | Workspace-Service |
| 파일 | `NoteDraftService.java:userIdsWithDirtyDrafts()` |
| 상태 | 해결 완료 (2026-06-28) |

**버그 설명**

`redisTemplate.keys("workspace:note:dirty:user:*")`는 Redis 전체 키스페이스를 O(N) 블로킹 스캔한다. 사용자 수 증가 시 Redis 응답 지연을 유발한다.

**기존 문제 코드**

```java
Set<String> dirtyKeys = redisTemplate.keys(DIRTY_KEY_FORMAT.formatted("user", "*"));
```

**수정 내용**

`redisTemplate.scan(ScanOptions.scanOptions().match(...).count(500).build())`으로 교체하여 논블로킹 점진적 스캔을 사용한다. 중복 key는 `LinkedHashSet`으로 제거하고, cursor는 try-with-resources로 닫는다.

---

### [BE-09] Notion 토큰 교환 응답 body null NPE

| 항목 | 내용 |
|------|------|
| 심각도 | MED |
| 분류 | 통합 테스트 |
| 서비스 | Ingestion-Service |
| 파일 | `NotionApiService.java:56-57` |

**버그 설명**

Notion 토큰 교환 API가 HTTP 200이지만 빈 body를 반환할 경우 `res.getBody()`가 null이 되어 `data.get("access_token")` 호출에서 NPE가 발생한다.

**문제 코드**

```java
Map<String, Object> data = res.getBody(); // null 가능
return new NotionTokenResult(
    (String) data.get("access_token"), // NPE
    ...
);
```

**수정 방향**

`if (data == null) throw BrainXException.badRequest(...)` null 체크를 추가한다.

---

### [BE-10] 크롬 익스텐션 캡처 URL XSS — 백엔드 저장 시

| 항목 | 내용 |
|------|------|
| 심각도 | MED |
| 분류 | 화이트박스 테스트 / 보안 |
| 서비스 | Ingestion-Service |
| 파일 | `ExtensionCaptureService.java:36` |

**버그 설명**

URL 유효성 검사 없이 노트 마크다운에 직접 삽입한다. `javascript:alert(1)` 같은 URL이 입력되면 마크다운 렌더 시 XSS가 가능하다.

**문제 코드**

```java
sb.append("> 출처: [").append(req.getUrl()).append("](").append(req.getUrl()).append(")\n\n");
// req.getUrl() = "javascript:alert(1)" → XSS
```

**수정 방향**

URL이 `http://` 또는 `https://`로 시작하는지 검증 후 거부하거나 이스케이프한다.

---

### [BE-11] 폴더 depth 항상 0 또는 1로 고정

| 항목 | 내용 |
|------|------|
| 심각도 | MED |
| 분류 | 단위 테스트 / 화이트박스 테스트 |
| 서비스 | Workspace-Service |
| 파일 | `WorkspaceService.java:536` |

**버그 설명**

`folderData()`에서 `parentFolderId == null`이면 0, 있으면 1로만 반환한다. 3단계 이상 중첩 폴더가 모두 `depth=1`로 반환되어 UI 렌더링 오류가 발생할 수 있다.

**문제 코드**

```java
private FolderData folderData(Folder folder) {
    return new FolderData(..., folder.getParentFolderId() == null ? 0 : 1);
    // depth는 항상 0 또는 1 — 실제 중첩 깊이 반영 안 됨
}
```

**수정 방향**

폴더 목록을 메모리에 로드하여 `parentFolderId` 체인을 따라가며 재귀적으로 깊이를 계산하거나, DB에 `depth` 컬럼을 추가한다.

---

### [BE-12] 태그 집계 시 전체 노트 메모리 로드

| 항목 | 내용 |
|------|------|
| 심각도 | LOW |
| 분류 | 시스템 테스트 / 성능 |
| 서비스 | Workspace-Service |
| 파일 | `WorkspaceService.java:302` |

**버그 설명**

`tagSuggestions()`가 사용자의 모든 노트를 메모리에 로드한 후 태그를 집계한다. 노트 수천 개 보유 시 성능이 저하된다.

**문제 코드**

```java
noteRepository.findByUserIdAndDeletedFalseOrderByUpdatedAtDesc(userId).stream()
    .flatMap(note -> note.getTags().stream())
    .collect(Collectors.groupingBy(tag -> tag, Collectors.counting()));
```

**수정 방향**

DB 수준에서 `GROUP BY tag_name COUNT(*)` 집계 쿼리로 교체한다.

---

### [BE-13] payload() 헬퍼 홀수 인수 ArrayIndexOutOfBoundsException

| 항목 | 내용 |
|------|------|
| 심각도 | LOW |
| 분류 | 단위 테스트 |
| 서비스 | Workspace-Service |
| 파일 | `WorkspaceService.java:565` |

**버그 설명**

`payload(Object... keyValues)` 헬퍼에 홀수 개 인수가 전달되면 `ArrayIndexOutOfBoundsException`이 발생한다. 방어 코드가 없다.

**문제 코드**

```java
private Map<String, Object> payload(Object... keyValues) {
    for (int i = 0; i < keyValues.length; i += 2) {
        result.put((String) keyValues[i], keyValues[i + 1]); // 홀수일 때 AIOOBE
    }
}
```

**수정 방향**

메서드 시작부에 `if (keyValues.length % 2 != 0) throw new IllegalArgumentException(...)`을 추가한다.

---

## 수정 우선순위

| 순위 | 버그 ID | 이유 |
|------|---------|------|
| 1 | BE-01 | 인증 우회 — 모든 사용자 데이터 접근 가능 |
| 2 | FE-06 | XSS — 외부 임포트 콘텐츠에서 스크립트 실행 |
| 3 | BE-10 | XSS — 백엔드 저장 단계에서 URL 미검증 |
| 4 | BE-02 | DoS — 인메모리 무한 누적 |
| 5 | BE-03 | StackOverflowError — Notion 깊은 중첩 시 서비스 중단 |
| 6 | FE-01 | 소셜 로그인 provider 오기록 — 전체 인증 플로우 영향 |
| 7 | BE-04 | 공유링크 NPE — 만료 일자 미설정 시 서비스 장애 |
| 8 | BE-05 | 드래프트 플러시 미동작 — 데이터 유실 가능 |
