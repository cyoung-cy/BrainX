# Kafka 구현 요약

이 문서는 BrainX의 Kafka 적용 현황을 한눈에 보는 작업 요약본입니다.

## 기준 문서

- `contracts-v2/brainx-openapi.ssot.yaml`
- `contracts-v2/brainx-asyncapi.ssot.yaml`
- `README.md`

## 현재 범위

구현 및 연결 완료:

- Workspace-Service outbox relay to Kafka
- Commerce-Service outbox relay to Kafka
- Ingestion-Service Kafka producer for `IntegrationConnected`, `ImportJobCompleted`, `ImportJobFailed`
- Intelligence-Service Kafka consumer for:
  - `CaptureReceived`
  - `NoteLinkCreated`
  - `NoteLinkDeleted`
  - `FolderCreated`
  - `FolderChanged`
  - `FolderDeleted` (Workspace cascade payload 기준 folder projection과 포함 note index/summary 정리)
  - `UserDeletionRequested`

## 구현 우선순위

1. 현재 동기식 흐름을 안정적으로 유지한다
2. outbox / producer 경로에서 이벤트를 발행한다
3. 외부 이벤트는 안전한 projection으로 먼저 받아둔다
4. projection이 안정된 뒤에 의미적 부수효과를 넓힌다

## 남은 의미 작업

- `NoteLinkCreated`, `NoteLinkDeleted`: 그래프 갱신과 이웃 캐시 무효화
- `FolderCreated`, `FolderChanged`, `FolderDeleted`: 하위 경로 전파와 folder tree projection 보강
- `UserDeletionRequested`: AI 설정, 스타일 프로필, vector/search/chat 데이터 일괄 정리

## 검증

현재 통과한 타깃 테스트:

- `CaptureReceivedEventHandlerTest`
- `NoteLinkEventHandlerTest`
- `FolderEventHandlerTest`
- `UserDeletionRequestedEventHandlerTest`

추천 실행 명령:

```powershell
cd C:\Edu\BrainX\brainX_back\Intelligence-Service
./gradlew test --tests com.brainx.intelligence.infrastructure.events.capture.CaptureReceivedEventHandlerTest --tests com.brainx.intelligence.infrastructure.events.link.NoteLinkEventHandlerTest --tests com.brainx.intelligence.infrastructure.events.folder.FolderEventHandlerTest --tests com.brainx.intelligence.infrastructure.events.deletion.UserDeletionRequestedEventHandlerTest
```

## 참고

- 세부 consumer 정합성은 정말 필요한 서비스 문서에만 남깁니다.
- 서비스 내부 Kafka 문서는 전체 표를 복제하지 말고 이 문서를 가리키는 방식으로 유지합니다.
