# Intelligence Service Guide

## Source Of Truth

서비스 사양의 기준은 `src/main/resources/contracts/knowledge-intelligence.openapi.yaml`입니다. 이 계약은 BrainX OpenAPI SSOT에서 `Knowledge Intelligence` tag와 `knowledge-intelligence` producer service를 추출한 것입니다.

계약을 다시 추출해야 할 때는 `scripts/extract_intelligence_openapi.py`를 사용합니다. 기본 source 경로는 상위 repository의 `contracts-v2/brainx-openapi.ssot.yaml`로 계산됩니다.

## Service Responsibility

Intelligence Service는 원본 노트를 직접 소유하지 않고 Workspace 이벤트 기반 read model 또는 vector index를 조회하는 Knowledge Intelligence API를 담당합니다.

주요 기능은 다음과 같습니다.

- Semantic search
- AI inline assist
- AI suggestion decision
- RAG chat thread and message streaming
- AI model list and user model settings
- Note summary read
- Folder organization proposal
- Link suggestion
- AI clustering job
- Bridge concept recommendation
- Insight report job
- User style profile

## Contract Defaults

- Public/client API는 `/api/v1` 아래에 있습니다.
- 모든 공개 API는 `bearerAuth` JWT security를 사용합니다.
- 성공 응답은 `ApiSuccessBase`를 확장하고 `success: true`, `message`, `data`를 포함합니다.
- 오류 응답은 `ApiErrorResponse`이며 `success: false`, `message`, `error.code`, `error.message`, 선택적 `traceId`, `details`를 포함합니다.
- SSE operation은 `text/event-stream`으로 `delta`와 terminal event를 보냅니다.
- `Idempotency-Key` header는 command와 job request retry에 권장됩니다.

## Endpoint Inventory

| Method | Path | Operation | Summary | Success | Events | Internal sync |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/api/v1/intelligence/semantic-search` | `semanticSearch` | 시맨틱 검색 | `200` | `SemanticSearchPerformed`, `TokenUsageRecordedRequested` | `commerce-operations.checkEntitlementsInternal` required |
| `POST` | `/api/v1/ai/inline-assists` | `createInlineAssist` | AI 인라인 어시스트 | `200` SSE | `AiSuggestionCreated`, `TokenUsageRecordedRequested` | `commerce-operations.checkEntitlementsInternal` required; `knowledge-workspace.getNoteSnapshotInternal` conditional |
| `POST` | `/api/v1/ai/suggestions/{suggestionId}/decision` | `decideAiSuggestion` | AI 제안 수락/거절/재생성 결정 | `200` | `AiSuggestionDecisionRecorded` | `knowledge-workspace.patchNoteContentInternal` conditional |
| `POST` | `/api/v1/ai/chat-threads` | `createChatThread` | AI 채팅 스레드 생성 | `201` | `ChatThreadCreated` | none |
| `POST` | `/api/v1/ai/chat-threads/{threadId}/messages` | `sendChatMessage` | AI 채팅 메시지 전송 | `200` SSE | `ChatMessageCreated`, `TokenUsageRecordedRequested` | `commerce-operations.checkEntitlementsInternal` required |
| `GET` | `/api/v1/ai/chat-threads/{threadId}` | `getChatThread` | 채팅 스레드 조회 | `200` | none | none |
| `GET` | `/api/v1/ai/models` | `listAiModels` | 사용 가능한 AI 모델 목록 | `200` | none | none |
| `PUT` | `/api/v1/ai/model-settings` | `putAiModelSettings` | AI 모델 설정 변경 | `200` | `AiModelSettingsChanged` | none |
| `GET` | `/api/v1/notes/{noteId}/summary` | `getNoteSummary` | 노트 요약 조회 | `200` | none | none |
| `POST` | `/api/v1/ai/folder-organization-proposals` | `createFolderOrganizationProposal` | AI 폴더 정리 제안 요청 | `200` | `AiSuggestionCreated`, `TokenUsageRecordedRequested` | `commerce-operations.checkEntitlementsInternal` required |
| `POST` | `/api/v1/ai/link-suggestions` | `createLinkSuggestions` | AI 링크 추천 | `200` | `AiSuggestionCreated`, `TokenUsageRecordedRequested` | `commerce-operations.checkEntitlementsInternal` required |
| `POST` | `/api/v1/ai/clusters` | `requestAiClusterJob` | AI 클러스터링 요청 | `202` | `ClusterJobRequested`, `TokenUsageRecordedRequested` | `commerce-operations.checkEntitlementsInternal` required |
| `GET` | `/api/v1/ai/clusters/{clusterJobId}` | `getAiClusterJob` | AI 클러스터링 결과 조회 | `200` | none | none |
| `POST` | `/api/v1/ai/bridge-concepts` | `createBridgeConcepts` | 징검다리 개념 추천 | `200` | `AiSuggestionCreated`, `TokenUsageRecordedRequested` | `commerce-operations.checkEntitlementsInternal` required |
| `POST` | `/api/v1/ai/insight-reports` | `requestInsightReport` | AI 인사이트 리포트 요청 | `202` | `InsightReportRequested`, `TokenUsageRecordedRequested` | `commerce-operations.checkEntitlementsInternal` required |
| `GET` | `/api/v1/ai/insight-reports/{reportId}` | `getInsightReport` | AI 인사이트 리포트 조회 | `200` | none | none |
| `GET` | `/api/v1/users/me/style-profile` | `getStyleProfile` | 문체 프로필 조회 | `200` | none | none |
| `PUT` | `/api/v1/users/me/style-profile` | `putStyleProfile` | 문체 프로필 설정 | `200` | `UserStyleProfileChanged` | none |

## Request And Response Schemas

OpenAPI components에 정의된 핵심 schema는 다음과 같습니다.

- Request: `SemanticSearchRequest`, `InlineAssistRequest`, `AiSuggestionDecisionRequest`, `ChatThreadCreateRequest`, `ChatMessageCreateRequest`, `AiModelSettingsPutRequest`, `FolderOrganizationProposalRequest`, `LinkSuggestionsRequest`, `ClusterJobCreateRequest`, `BridgeConceptsRequest`, `InsightReportCreateRequest`, `StyleProfilePutRequest`
- Data response: `SemanticSearchData`, `AiSuggestionDecisionData`, `ChatThreadData`, `ChatThreadDetailData`, `AiModelsData`, `AiModelSettingsData`, `NoteSummaryData`, `FolderOrganizationProposalData`, `LinkSuggestionsData`, `ClusterJobData`, `BridgeConceptsData`, `InsightReportData`, `StyleProfileData`
- Shared: `ApiSuccessBase`, `ApiErrorResponse`, `JobStatus`

Schema의 required field, enum, nullable 여부는 요약하지 말고 OpenAPI 파일에서 직접 확인합니다.

## Implementation State

현재 저장소의 Java 구현은 Spring Boot application entrypoint와 기본 context load test 중심입니다. Controller, application service, persistence adapter, Kafka adapter를 추가할 때는 OpenAPI operation 단위로 package와 test를 함께 구성합니다.

## Implementation Notes

- Entitlement 또는 quota 확인이 필요한 operation은 모델 호출 또는 job accept 전에 `commerce-operations.checkEntitlementsInternal` 동기 호출이 필요합니다.
- Accepted AI suggestion이 note content를 바꾸는 경우 Workspace command API인 `knowledge-workspace.patchNoteContentInternal`을 통해 적용합니다.
- Inline assist에서 최신 authoritative markdown이 필요한 경우에만 `knowledge-workspace.getNoteSnapshotInternal`을 조건부로 호출합니다.
- Token usage recording은 public REST command를 만들지 말고 event-first 흐름을 유지합니다.
- `requestAiClusterJob`와 `requestInsightReport`는 `PENDING` job을 반환할 때 `202 Accepted`를 사용합니다.
