# Consumed Event Contract Alignment

이 문서는 `AI-Service`가 실제 코드로 처리하는 consumed event와 AsyncAPI SSOT의 일치 수준을 추적한다. 새 consumer를 구현하거나 기존 handler를 보강할 때 이 표를 함께 갱신한다.

원천 계약은 `../../contracts-v2/brainx-asyncapi.ssot.yaml`이고, 로컬 추출본은 `src/main/resources/contracts/knowledge-intelligence.asyncapi.yaml`이다. 도메인 목표와 미구현 이벤트 목록은 `docs/domain/consumed-events-domain-map.md`, 구현 체크포인트는 `docs/technical/consumed-events-implementation-checkpoints.md`를 기준으로 한다.

## Alignment Levels

- `FULL`: topic, `eventType`, required payload field 검증, 의미 반영이 SSOT와 맞는다.
- `PARTIAL`: topic과 `eventType`은 맞지만 required field 일부를 검증하지 않거나 의미 반영이 누락되어 있다.
- `NOT_IMPLEMENTED`: SSOT에는 `AI-Service` consumer로 정의되어 있지만 코드 handler나 기본 topic 구독에 없다.

## Implemented Workspace Note Events

현재 `BrainxEventConsumerProperties` 기본 topic과 `WorkspaceNoteEventHandler`가 처리하는 이벤트는 아래 7개다.

| Event | SSOT topic | Alignment | Contract gap |
| --- | --- | --- | --- |
| `NoteCreated` | `brainx.knowledge.workspace.note-created.v1` | `FULL` | required `noteId`, `userId`, `title`, `version`을 검증한다. optional `documentGroupId`는 없으면 `default`로 fallback한다. |
| `NoteContentSaved` | `brainx.knowledge.workspace.note-content-saved.v1` | `PARTIAL` | SSOT required `savedAt`을 payload record로 받지만 검증하거나 projection timestamp 기준으로 사용하지 않는다. 현재 처리 시각은 event envelope `occurredAt`과 snapshot `updatedAt`에 의존한다. |
| `NoteMetadataChanged` | `brainx.knowledge.workspace.note-metadata-changed.v1` | `PARTIAL` | required `noteId`, `userId`, `version`은 검증한다. optional `title`, `folderId`, `tags`, `archived`는 반영하지만 `typography`, `order`는 무시한다. |
| `NoteTagsChanged` | `brainx.knowledge.workspace.note-tags-changed.v1` | `PARTIAL` | SSOT required `tags`를 명시 검증하지 않는다. missing/null이면 empty list로 처리될 수 있다. |
| `NoteTrashed` | `brainx.knowledge.workspace.note-trashed.v1` | `PARTIAL` | SSOT required `deletedAt`, `purgeAt`을 record로 받지 않고 검증/저장하지 않는다. search index 제거와 trashed 상태 전환만 수행한다. |
| `NoteDeleted` | `brainx.knowledge.workspace.note-deleted.v1` | `PARTIAL` | SSOT required `deletedAt`, `permanent`를 record로 받지 않고 검증/저장하지 않는다. search index 제거, deleted 상태 전환, summary 삭제만 수행한다. |
| `NotesMoved` | `brainx.knowledge.workspace.notes-moved.v1` | `PARTIAL` | SSOT required `noteIds`를 명시 실패 처리하지 않고 missing/null이면 empty no-op 처리한다. `targetFolderId`는 반영하지만 `sourceFolderId`는 검증/사용하지 않는다. |

## SSOT Consumer Events Not Yet Implemented

아래 이벤트는 SSOT와 로컬 AsyncAPI 추출본에 `AI-Service` consumer로 정의되어 있지만 현재 기본 topic 구독과 handler에는 없다.

| Event | Producer | Topic |
| --- | --- | --- |
| `NoteLinkCreated` | `Workspace-Service` | `brainx.knowledge.workspace.note-link-created.v1` |
| `NoteLinkDeleted` | `Workspace-Service` | `brainx.knowledge.workspace.note-link-deleted.v1` |
| `FolderCreated` | `Workspace-Service` | `brainx.knowledge.workspace.folder-created.v1` |
| `FolderChanged` | `Workspace-Service` | `brainx.knowledge.workspace.folder-changed.v1` |
| `FolderDeleted` | `Workspace-Service` | `brainx.knowledge.workspace.folder-deleted.v1` |
| `CaptureReceived` | `Ingestion-Service` | `brainx.content.ingestion.publishing.capture-received.v1` |
| `UserDeletionRequested` | `User-Service` | `brainx.identity.access.user-deletion-requested.v1` |

## Maintenance Rule

Consumer 구현을 추가하거나 payload 처리를 바꿀 때는 다음을 함께 확인한다.

1. `../../contracts-v2/brainx-asyncapi.ssot.yaml`의 topic, message name, required payload field를 확인한다.
2. `BrainxEventConsumerProperties` 기본 topic 목록이 실제 handler 범위와 맞는지 확인한다.
3. handler payload record 또는 `JsonNode` parsing이 SSOT required field를 실패 처리하는지 확인한다.
4. optional field를 의도적으로 무시한다면 이 문서의 `Contract gap`에 남긴다.
5. `docs/technical/consumed-events-implementation-checkpoints.md`의 체크박스를 같은 기준으로 갱신한다.
