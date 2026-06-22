# BrainX Git 사용 가이드

BrainX Git 협업 규칙에 따른 작업 절차 및 명령어 정리.

---

## 1. 작업 시작 전 main 최신화

```bash
git checkout main
git pull origin main

git checkout 개인브랜치명
git merge main
```

---

## 2. 작업 후 커밋

변경 파일 확인:

```bash
git status
```

변경 내용 확인:

```bash
git diff
```

전체 추가:

```bash
git add .
```

커밋:

```bash
git commit -m "feat: 노트 에디터 기능 추가"
```

개인 브랜치 push:

```bash
git push origin 개인브랜치명
```

---

## 3. PR 생성 방법

1. GitHub 저장소 접속
2. Compare & pull request 클릭
3. base: `main` 확인
4. compare: 본인 브랜치 확인
5. PR 제목 작성
6. PR Description 작성
7. Create pull request 클릭

PR 제목 예시:

```txt
[feat] 노트 에디터 기능 개선
```

---

## 4. PR 생성 전 최신 main 반영

PR 생성 전 현재 브랜치가 본인 작업 브랜치인지 확인:

```bash
git branch
```

원격 최신 정보 가져오기:

```bash
git fetch origin
```

본인 브랜치에서 최신 main 반영:

```bash
git merge origin/main
```

충돌이 없으면 push:

```bash
git push origin 개인브랜치명
```

이유:

```txt
origin/main을 merge한 결과를 원격 브랜치에 반영해야 GitHub PR에서도 최신 상태로 표시됨
```

충돌이 있으면 충돌 파일 수정 후:

```bash
git add .
git commit -m "fix: main 병합 충돌 해결"
git push origin 개인브랜치명
```

---

## 5. PR Merge 방식

BrainX는 Squash Merge 사용.

Squash Merge는 PR 안의 여러 커밋을 하나의 커밋으로 합쳐서 main에 반영하는 방식.

장점:

- 개인 브랜치에서는 자유롭게 커밋 가능
- main 히스토리를 깔끔하게 유지 가능
- PR 단위로 작업 이력 관리 가능
- 문제 발생 시 원인 추적 용이

예시:

개인 브랜치 커밋

```txt
feat: 이미지 기능 추가
fix: 이미지 크기 오류 수정
style: 버튼 위치 수정
fix: 오타 수정
```

Squash Merge

↓

main 반영 결과

```txt
feat: 노트 에디터 이미지 기능 추가
```

---

## 6. main 반영 후 팀원 행동

main merge 알림 확인 후 즉시 pull 필수 아님.

작업 중인 내용이 안정적인 상태가 되었을 때:

```bash
git checkout main
git pull origin main

git checkout 개인브랜치명
git merge main
```

단, PR 생성 전에는 반드시 최신 main 반영.

---

## 7. 공통 파일 변경 시 공유 방법

공유 대상 예시:

```txt
package.json
package-lock.json

README.md

contracts-v2/*

app/layout.tsx
app/globals.css

공통 components/*
```

위 파일 수정 시 팀 채널에 공유.

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

## 8. 자주 쓰는 명령어

현재 브랜치 확인:

```bash
git branch
```

원격 브랜치 확인:

```bash
git branch -r
```

변경 상태 확인:

```bash
git status
```

최근 커밋 확인:

```bash
git log --oneline -5
```

원격 최신 정보 가져오기:

```bash
git fetch origin
```

브랜치 이동:

```bash
git checkout 브랜치명
```

원격 저장소 정보 확인:

```bash
git remote -v
```

---

## 9. 주의사항

```txt
main 직접 push 금지
모든 main 반영은 PR 진행
PR 생성 전 최신 main 반영
Squash Merge 사용
공통 파일 변경 시 팀 공유
충돌 파일 임의 삭제 금지
.env
.env.local
node_modules
.next
dist
build

등 불필요한 파일 커밋 금지
```
