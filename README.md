# 오늘의 아침신문 (가제)

초등 3~6학년을 위한 **데일리 문해력 신문**. 매일 아침 글 한 편(저학년·고학년 2버전)을 읽고 퀴즈로 확인해요. 백엔드 없는 정적 사이트이며, 콘텐츠는 매일 밤 자동으로 한 편씩 늘어납니다.

## 빠른 시작 (로컬)
```bash
node serve.mjs      # → http://localhost:8080
```
정적 파일이라 별도 설치가 필요 없어요. (기사 로딩에 fetch를 쓰므로 `file://` 직접 열기 대신 위 서버로 여세요.)

## 테스트
```bash
npm test            # 검증·채점·콘텐츠 로직 유닛 테스트
```

## 콘텐츠 검증
```bash
node tools/validate.mjs content/2026-07-21.json   # → OK / FAIL
```

## 구조
- `index.html`, `assets/*` — 앱(홈·기사·퀴즈·인쇄). 빌드 스텝 없음.
- `content/*.json` — 기사(하루 1편). `index.json`(날짜 목록), `topics.json`(중복 방지).
- `tools/*` — 검증(`validate.mjs`) + 유닛 테스트.
- `nightly-prompt.md` — 매일 밤 새 기사를 쓰는 예약 실행 잡 프롬프트.
- `review.html` — 아침 검토용(생성 기사 + 출처).

## 동작 방식
- 브라우저가 **오늘 날짜(KST)**로 오늘 자 기사를 고름. 없으면 가장 최근 기사로 폴백.
- 교사용: `/?date=2026-07-21` 처럼 특정 날짜 기사 열람·인쇄 가능.
- 진도·점수는 저장하지 않음(자가채점, 개인정보 0).

## 배포 (내일 아침 단계)
1. GitHub 저장소 생성 후 push.
2. 무료 정적 호스팅 연결(GitHub Pages 또는 Netlify) → `main` push 시 자동 배포.
3. **매일 밤 자동 발간:** 클라우드 예약 실행(cron routine)에 `nightly-prompt.md`를 걸어, 매일 새벽 새 기사를 생성·검증·커밋·푸시. → 자동 반영.

## 이름 변경
서비스 이름은 `assets/config.js`의 `SITE_NAME` 한 곳만 바꾸면 제호·인쇄물에 모두 반영됩니다.
