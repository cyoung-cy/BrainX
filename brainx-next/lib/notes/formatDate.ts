/** "방금"/"3분 전"/"2026-06-19 09:12" 같은 상대시간 표시 — 노트 메타정보·hover 카드에서
    공용으로 쓴다. 7일 이상 지난 항목은 절대 날짜로 폴백하는데, 이전에는 `formatAbsoluteDate`
    (시간 없음)를 썼다 — "생성일"(`formatAbsoluteDateTime` 직접 사용, 항상 시간 포함)과
    "마지막 수정"(이 함수 경유, 7일 넘으면 시간 빠짐) 사이에 표시 형식이 갈리는 버그였다.
    실제 데이터(`updatedAt`)는 정상이라 mock 데이터 문제가 아니라 이 폴백 분기의 포맷 함수
    선택 문제였다 — `formatAbsoluteDateTime`으로 바꿔 항상 시간까지 표시한다. */
export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return formatAbsoluteDateTime(timestamp);
}

export function formatAbsoluteDate(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatAbsoluteDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${formatAbsoluteDate(timestamp)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
