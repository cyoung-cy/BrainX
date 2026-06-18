# Intelligence Service

BrainX Knowledge Intelligence 영역의 Spring Boot 서비스입니다. 시맨틱 검색, RAG 채팅, AI 제안, 클러스터링, 인사이트 리포트, 모델 설정, 문체 프로필 API를 담당합니다.

## 기술 스택

- Java 21
- Spring Boot 3.5.15
- Gradle
- Spring Web, WebFlux, Security, Validation, Actuator
- Spring Data JPA, PostgreSQL
- Spring Kafka

## 계약 기준

서비스 사양의 기준은 `src/main/resources/contracts/knowledge-intelligence.openapi.yaml`입니다. 이 파일은 `scripts/extract_intelligence_openapi.py`로 BrainX OpenAPI SSOT에서 `Knowledge Intelligence` 태그와 `knowledge-intelligence` producer service 작업만 추출한 계약입니다.

현재 계약은 다음 원칙을 따릅니다.

- Public/client API는 `/api/v1` 아래에 둡니다.
- 인증은 `bearerAuth` JWT를 사용합니다.
- SSE 스트리밍 응답은 `text/event-stream`으로 반환합니다.
- 토큰 사용 기록은 REST command가 아니라 `TokenUsageRecordedRequested` 이벤트 중심으로 처리합니다.
- 장기 작업 요청은 `PENDING` 상태일 때 `202 Accepted`를 반환합니다.

## 주요 API

| Method | Path | 설명 |
| --- | --- | --- |
| `POST` | `/api/v1/intelligence/semantic-search` | 시맨틱 검색 |
| `POST` | `/api/v1/ai/inline-assists` | AI 인라인 어시스트 SSE |
| `POST` | `/api/v1/ai/suggestions/{suggestionId}/decision` | AI 제안 수락, 거절, 재생성 결정 |
| `POST` | `/api/v1/ai/chat-threads` | AI 채팅 스레드 생성 |
| `POST` | `/api/v1/ai/chat-threads/{threadId}/messages` | RAG 채팅 메시지 SSE |
| `GET` | `/api/v1/ai/chat-threads/{threadId}` | 채팅 스레드 조회 |
| `GET` | `/api/v1/ai/models` | 사용 가능한 AI 모델 목록 |
| `PUT` | `/api/v1/ai/model-settings` | AI 모델 설정 변경 |
| `GET` | `/api/v1/notes/{noteId}/summary` | 노트 요약 조회 |
| `POST` | `/api/v1/ai/folder-organization-proposals` | AI 폴더 정리 제안 |
| `POST` | `/api/v1/ai/link-suggestions` | AI 링크 추천 |
| `POST` | `/api/v1/ai/clusters` | AI 클러스터링 작업 요청 |
| `GET` | `/api/v1/ai/clusters/{clusterJobId}` | AI 클러스터링 결과 조회 |
| `POST` | `/api/v1/ai/bridge-concepts` | 징검다리 개념 추천 |
| `POST` | `/api/v1/ai/insight-reports` | AI 인사이트 리포트 요청 |
| `GET` | `/api/v1/ai/insight-reports/{reportId}` | AI 인사이트 리포트 조회 |
| `GET` | `/api/v1/users/me/style-profile` | 문체 프로필 조회 |
| `PUT` | `/api/v1/users/me/style-profile` | 문체 프로필 설정 |

세부 요청/응답 schema, 이벤트 coupling, 내부 service-to-service 호출은 `vaults/agents/intelligence-service.md`와 OpenAPI 계약을 확인합니다.

## 도메인 문서

- `docs/domain/knowledge-intelligence-domain-flow.md`: 도메인 스토리텔링, 이벤트 스토밍, 컨텍스트 맵 관점의 기능 흐름과 도메인 관계

## 실행

Windows PowerShell 기준:

```powershell
.\gradlew.bat bootRun
```

Unix 계열 shell 기준:

```sh
./gradlew bootRun
```

## 검증

```powershell
.\gradlew.bat test
```

문서만 변경한 경우에는 테스트를 생략할 수 있습니다. 코드, 설정, 계약 파일을 변경한 경우에는 관련 Gradle 검증을 실행하고 결과를 작업 로그에 남깁니다.
