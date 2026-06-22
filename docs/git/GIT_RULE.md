# BrainX Git 협업 규칙

## 목적

협업 과정에서 발생할 수 있는 충돌과 혼란을 줄이고, main 브랜치를 안정적으로 유지하기 위함.

---

## 1. 브랜치 전략

```txt
main = 최종 통합 브랜치

개인 브랜치
- cy
- hy
- jeje
- kyj
- yejin
- 기타 팀원 브랜치
```

## 규칙

```txt
모든 작업은 개인 브랜치에서 진행
main 직접 push 금지
모든 main 반영은 PR로 진행
develop 브랜치는 현재 도입하지 않음
```

---

## 2. Main 반영 절차

```txt
개인 브랜치 작업
→ commit
→ push
→ PR 생성
→ Squash Merge
→ main 반영
```

---

## 3. Squash Merge 사용

## Squash Merge란?

PR 안에 여러 개의 커밋이 있더라도, main 브랜치에는 하나의 커밋으로 합쳐서 반영하는 방식.

예시:

개인 브랜치

```txt
feat: 이미지 기능 추가
fix: 이미지 크기 오류 수정
style: 버튼 위치 수정
fix: 오타 수정
```

main 반영 후

```txt
feat: 노트 에디터 이미지 기능 추가
```

## 사용하는 이유

```txt
main 히스토리 정리
발표 직전 문제 발생 시 원인 추적 용이
개인 브랜치에서는 자유로운 커밋 가능
PR 단위로 작업 이력 관리 가능
Squash Merge 직전 PR 제목 및 커밋 메시지 확인
```

팀원 설명용:

```txt
Squash Merge는 PR 안의 여러 커밋을 하나의 커밋으로 합쳐서 main에 반영하는 방식.
개인 브랜치에서는 자유롭게 커밋하고, main에는 최종 작업 결과만 깔끔하게 남기기 위해 사용.
```

---

## 4. Main 최신화 규칙

## 작업 시작 전

```bash
git checkout main
git pull origin main

git checkout 개인브랜치명
git merge main
```

## PR 생성 전

현재 본인 작업 브랜치에서 실행:

```bash
git fetch origin
git merge origin/main
```

충돌이 없으면:

```bash
git push origin 개인브랜치명
```

목적:

```txt
PR 단계에서 충돌 발견이 아니라,
PR 전에 본인 브랜치에서 충돌을 미리 확인하고 해결하기 위함.
```

## Slack 알림 기준

```txt
main merge 알림이 와도 즉시 pull 필수 아님
현재 작업이 안정적인 상태가 되었을 때 최신 main 반영
단, PR 생성 전에는 반드시 최신 main 반영
```

---

## 5. 커밋 메시지 규칙

형식:

```txt
type: 작업 내용
```

예시:

```txt
feat: Mermaid 다이어그램 기능 추가
fix: 위키링크 Enter 입력 오류 수정
refactor: 노트 에디터 구조 개선
```

---

## 6. 커밋 타입

## feat

새로운 기능 추가

```txt
feat: Mermaid 다이어그램 기능 추가
feat: 위키링크 자동완성 기능 추가
feat: 노트 분할 기능 구현
```

## fix

버그 수정

```txt
fix: 위키링크 Enter 입력 오류 수정
fix: Bubble Toolbar 위치 오류 수정
fix: 로그인 토큰 갱신 문제 해결
```

## refactor

기능 변화 없이 코드 구조 개선

```txt
refactor: 노트 에디터 컴포넌트 분리
refactor: API 호출 로직 공통화
refactor: 상태 관리 구조 개선
refactor: 중복 코드 제거
```

## perf

기능은 동일하지만 성능 개선

```txt
perf: 노트 렌더링 성능 최적화
perf: 마인드맵 계산 속도 개선
perf: 불필요한 리렌더링 제거
```

## style

UI 및 디자인 수정

```txt
style: 노트 툴바 UI 개선
style: 버튼 정렬 수정
style: 다크모드 색상 조정
```

## docs

문서 수정

```txt
docs: API 명세서 수정
docs: README 업데이트
docs: Git 협업 규칙 추가
```

## test

테스트 코드 작성 및 수정

```txt
test: NoteService 테스트 추가
test: MockMVC 테스트 추가
```

## chore

프로젝트 설정 및 운영 관련 변경

```txt
chore: package.json 의존성 추가
chore: ESLint 설정 수정
chore: Docker 설정 수정
```

---

## 7. PR 제목 규칙

형식:

```txt
[type] 작업 내용
```

예시:

```txt
[feat] 노트 에디터 기능 개선
[fix] 위키링크 입력 오류 수정
[refactor] 에디터 구조 정리
```

---

## 8. PR 설명 규칙

필수 항목:

```md
## 작업 내용

- 변경 내용 작성

## 테스트

- 수행한 테스트 작성

## 주의할 점

- 팀원이 알아야 할 내용 작성
```

테스트 예시:

```txt
npm run dev 실행 확인
노트 작성 확인
이미지 업로드 확인
Mermaid 렌더링 확인
```

주의할 점 예시:

```txt
package.json 변경 있음
pull 후 npm install 필요
API 스펙 변경 있음
DB 스키마 변경 있음
```

---

## 9. Commit / Push 규칙

```txt
커밋 횟수는 강제하지 않음
작업이 길어질 경우 하루에 한 번 이상 개인 브랜치에 push하여 작업 내용 백업
```

---

## 10. 공통 파일 수정 시 공유

아래 파일 수정 시 팀 채널 공유.

```txt
package.json
package-lock.json
README.md
contracts-v2/*
app/layout.tsx
app/globals.css
공통 components/*
```

공유 예시:

```txt
[공통 파일 수정]

파일:
package.json

내용:
TipTap Table 패키지 추가

조치:
pull 후 npm install 필요
```

---

## 11. 충돌 해결 규칙

```txt
충돌 발생 시 PR 작성자 해결
main에 merge하기 전에 본인 브랜치에서 해결 후 push
```

---

## 12. 한 줄 요약

```txt
1. main 직접 push 금지
2. 모든 main 반영은 PR
3. Squash Merge 사용
4. PR 전 최신 main 반영
5. 공통 파일 수정 시 공유
6. 충돌은 PR 작성자 해결
7. 작업이 길어지면 하루 1회 이상 개인 브랜치 push
```
