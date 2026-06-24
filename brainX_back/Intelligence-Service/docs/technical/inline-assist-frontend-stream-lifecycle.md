# Inline Assist Frontend Stream Lifecycle

## 배경

`brainx-next` 노트 편집기에서 `AI로 요약` 버튼은 선택 영역을 우측 `RightSidebar`의 인라인 AI 채팅으로 전달하고, 프론트는 Next route handler를 통해 Intelligence Service의 `POST /api/v1/ai/inline-assists` SSE 응답을 소비한다.

이 문서는 2026-06-23에 확인한 "요약 요청을 보냈지만 채팅에 AI 응답이 표시되지 않는 문제"의 원인과 재발 방지 기준을 기록한다.

## 증상

- 사용자가 노트 본문 일부를 선택하고 `AI로 요약`을 누르면 우측 인라인 AI 채팅에 사용자 요청 메시지는 추가됐다.
- AI 응답 말풍선은 비어 있거나 표시되지 않았다.
- Next proxy와 Intelligence Service를 직접 호출하면 SSE 응답은 정상적으로 반환됐다.
- 브라우저 콘솔에는 명확한 API error가 남지 않았다.

직접 호출 확인 결과:

```text
event: delta
data: {"text":"외부 지식 베이스를 활용해 LLM의 답변 품질을 높이는 기법입니다."}

event: done
data: {"suggestionId":"...","action":"SUMMARIZE","modelId":"gpt-5.4-mini"}
```

따라서 원인은 Intelligence Service endpoint, Next proxy, SSE frame shape가 아니라 프론트의 요청 lifecycle 처리였다.

## 원인

`RightSidebar`의 `useEffect`는 `pendingAiRequest?.nonce`를 dependency로 사용했다. 요약 요청을 받으면 다음 순서로 동작했다.

1. `pendingAiRequest`를 읽어 사용자 메시지와 빈 AI 말풍선을 추가한다.
2. `createInlineAssistStream(..., { signal: controller.signal })`로 SSE 요청을 시작한다.
3. 같은 effect 안에서 `onAiRequestHandled()`를 호출한다.
4. 부모 `NotesWorkspace`가 `pendingAiRequest`를 `null`로 변경한다.
5. dependency 값이 기존 nonce에서 `undefined`로 바뀌면서 effect cleanup이 즉시 실행된다.
6. cleanup에서 `controller.abort()`가 호출되어 진행 중인 SSE 요청이 중단된다.

즉, "요청을 소비했다"는 UI state 정리가 "진행 중인 network stream을 취소한다"는 부작용과 같은 effect lifecycle에 묶여 있었다.

## 수정 기준

`pendingAiRequest`는 일회성 입력 이벤트로만 취급하고, SSE 요청의 수명은 별도 ref로 관리해야 한다.

적용한 기준:

- 새 AI 요청이 들어올 때만 이전 `AbortController`를 abort한다.
- `onAiRequestHandled()`로 `pendingAiRequest`를 비워도 현재 요청을 abort하지 않는다.
- 컴포넌트 unmount 시에만 남아 있는 요청을 abort한다.
- mock timer도 effect cleanup이 아니라 ref로 관리하고, 새 요청 또는 unmount에서 정리한다.

요약하면, `pendingAiRequest` cleanup은 event-consumption cleanup이고, SSE cleanup은 request lifecycle cleanup이다. 두 cleanup을 같은 return 함수에 묶지 않는다.

## 검증

다음 확인으로 원인을 분리했다.

- `http://localhost:3000/api/intelligence/ai/inline-assists` 직접 호출: `delta`, `done` SSE frame 정상 반환.
- `http://localhost:8086/api/v1/ai/inline-assists` 직접 호출: 동일하게 정상 반환.
- 인앱 브라우저에서 `/notes/rag-flow` 진입 후 선택 영역 요약 클릭:
  - 수정 전: 사용자 요약 요청만 표시되고 AI 응답이 비어 있음.
  - 수정 후: 사용자 요약 요청 뒤에 AI 요약 응답이 표시됨.

## 재발 방지

- React `useEffect` 안에서 일회성 request event를 소비할 때, 해당 event state를 비우는 동작이 network request cleanup을 트리거하지 않는지 확인한다.
- SSE, upload, long polling처럼 긴 수명을 가진 요청은 dependency cleanup보다 `useRef` 기반 controller로 명시적으로 관리한다.
- `onHandled`, `clearPending`, `consumeRequest`류 callback은 "다음 render에서 effect가 다시 돈다"는 점을 전제로 검토한다.
- 브라우저에서 "사용자 메시지만 표시되고 assistant 메시지가 비는" 증상이 있으면 API 호출 실패만 보지 말고 abort/cancel 경로를 먼저 확인한다.
