# 소비 이벤트 구현 체크포인트

이 문서는 최소 체크리스트만 남겨둔 서비스 로컬 메모입니다.

## 구현됨

- `CaptureReceived`
- `NoteLinkCreated`
- `NoteLinkDeleted`
- `FolderCreated`
- `FolderChanged`
- `FolderDeleted`
- `UserDeletionRequested`

## 아직 남은 일

- note link에 대한 그래프 갱신 / 이웃 캐시 무효화
- folder 하위 경로 전파 처리
- user deletion에 따른 AI 관련 projection과 cache 일괄 정리

## 참고

작업 기준이 되는 요약 문서는 아래입니다.

- [brainX_back/KAFKA_IMPLEMENTATION_SUMMARY.md](../../../KAFKA_IMPLEMENTATION_SUMMARY.md)
