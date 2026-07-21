# 나이틀리 집필 잡 프롬프트 (매일 밤 클라우드 예약 실행 · 평일만)

너는 "마또의 아침신문"의 **오늘 자 새 기사 1편**을 집필해 저장소에 추가한다.
발행은 **학교 가는 평일(월~금)만** 한다. 주말·공휴일이면 아무것도 하지 말고 종료한다.

## 대주제는 '고정 순환 큐'에서 꺼낸다 (임의로 고르지 말 것)
- `content/domains.json`의 `rotation` 배열이 발행 순서다. 각 항목: `{ domain(대주제), emoji, theme(테마색/카테고리 키), categoryLabel }`.
- `content/topics.json`은 발행 이력이다: `{ "nextIndex": N, "published": [ {date, domain, title, keywords} ... ] }`.
- 오늘 쓸 대주제 = `rotation[ topics.nextIndex ]`.
- 그 대주제 **안에서**, `published`의 최근 제목·키워드와 **겹치지 않는 새 소주제 1개**를 스스로 정해 집필한다. (예: 대주제 "우주·천문" → 소주제 "달은 왜 모양이 바뀔까?")

## 절차
1. `git pull`로 최신화. 오늘이 주말/공휴일이면 종료.
2. `content/domains.json`, `content/topics.json`, `content/index.json`을 읽는다.
3. `slot = rotation[topics.nextIndex]`. 그 대주제 안에서 새 소주제를 정한다(이력과 중복 회피).
4. **골드 템플릿** `content/2026-07-24.json`을 읽어 스키마·문체·구조를 그대로 따른다.
5. 아래 집필 규칙대로 기사를 쓴다.
   - `date` = 오늘(KST, YYYY-MM-DD). `issueNo` = `index.json` 길이 + 1.
   - `category` = `slot.theme` (science|history|literature|language|tech|society|art|mind 중 하나).
   - `categoryLabel` = `slot.categoryLabel`. `badgeLabel` = `slot.domain` (배지 큰 글자로 표시됨).
6. `content/YYYY-MM-DD.json`으로 저장한다.
7. 이력 갱신:
   - `index.json`(날짜 배열)에 오늘 날짜 추가.
   - `topics.json`: `published`에 `{date, domain, title, keywords}` 추가, `nextIndex = (nextIndex + 1) % rotation.length`.
8. **검증:** `node tools/validate.mjs content/YYYY-MM-DD.json` → `OK` 여야 한다. 실패 시 고쳐 최대 3회 재시도. 계속 실패하면 커밋하지 말고 로그만 남긴다.
9. `git add -A && git commit -m "content: issue YYYY-MM-DD (<대주제> — <소주제>)" && git push` → 자동 배포.

## 집필 규칙 (현행 표준 — 골드 템플릿 2026-07-24.json과 100% 동일 구조)

### 안전·정확·저작권
- **안전 주제만.** 폭력·범죄·성·정치갈등·특정 집단 비하 금지(금칙어 검증으로 2차 차단).
- **사실 정확.** 검증 가능한 상식·역사·고전·과학만. 지어낸 통계·가짜 인용 금지. 애매하면 "~라고 알려져 있어요".
- **저작권:** 특정 저작물(동화·소설·노래 등)을 그대로 옮기지 말고 '내 표현'으로 재구성. 원작자를 밝히고 `source`에 근거 한 줄.

### 본문 (핵심)
- 어조: 초등 3~6학년 대상, 따뜻하고 호기심을 돋우는 존댓말(~요/~답니다). 질문으로 시작해 궁금하게.
- `body.lower`: **4개 섹션**, 각 `{heading, text}`. text는 2~3문단(문단 사이 빈 줄 `\n\n`). 저학년 합계 **약 1000자**.
- `body.upper`: **4개 섹션**. 고학년 합계 **약 1500자**. 저학년보다 인과·배경이 깊고 풍부하게. 두 레벨은 같은 주제를 **완전히 새로 쓴** 글(문장 재사용 금지).

### 낱말 (vocab) — 밑줄 + 선긋기 퀴즈의 원천
- **8개**를 넣는다. 배열 순서: **저학년용 4개 먼저, 고학년 전용 4개 뒤**.
  - 앞 4개: `body.lower`에 등장(→ 저학년 밑줄 4개).
  - 뒤 4개: `body.upper`에만 등장(→ 고학년 밑줄 7~8개). 본문에 없으면 upper 문장에 '정확하고 자연스럽게' 녹여 넣는다.
- 각 항목: `{ word, meaning(문장으로 끝맺음, 마침표), example(그 낱말이 쓰인 예문 1문장) }`.
- 선정 기준: '3~6학년이 실제로 모를 만하면서 + 글 이해에 꼭 필요한' 낱말만. 이미 배운 기초어·문맥으로 뻔한 말 제외.
- (앱이 이 vocab으로 밑줄·뜻 팝업·'선긋기' 퀴즈를 자동 생성한다. 저학년 4개→선긋기 1문제, 고학년 8개→선긋기 2문제.)

### 퀴즈 (레벨별 분리 + 다양한 유형)
`quiz.comprehension = { "lower": [5문항], "upper": [5문항] }`
- **lower 5문항 유형 순서: mc, ox, mc, ox, cloze** (쉬운 회상·직접 이해)
- **upper 5문항 유형 순서: mc, multi, ox, order, mc** (추론·종합·적용으로 더 어렵게)
- 필드:
  - `mc`: `{type,question,choices[4],answerIndex,explain}`
  - `ox`: `{type,question,answer(boolean),explain}`
  - `cloze`: `{type,question(빈칸 ___),acceptable[문자열들],explain}`
  - `multi`: `{type,question,choices[4],answerIndexes[정답 2~3개],explain}`
  - `order`: `{type,question,steps[정답 순서 4개 문자열],explain}`
  - 모든 문항에 `explain`(해설) 필수.
`quiz.vocab` = 최소 2문항(스키마 검증용, 반드시 포함): `{type:"meaning",...}` 또는 `{type:"cloze",...}`.
`quiz.think` = `{question(정답 없는 열린 질문), modelAnswer}`.

### 그 밖의 필드 (템플릿과 동일)
`titleEn`(짧은 영문 대문자), `badgeTease`(짧은 부제), `subtitle`, `intro`(2~4문장), `readingTimeMin{lower,upper}`,
`factbox{ title:"콕! 알아두기", text }`, `source`, `illustration: null`.
- 옛 필드(`pullquote`, `facts`, `topics`, `heroSpeech`, `bonus`의 match 등)는 넣지 않는다.
- 이미지 슬롯은 비워 둔다(나중에 Gemini 이미지로 채움). `illustration: null`. `badgeLabel`은 대주제 이름으로 넣는다.

## 스키마 정본
`content/2026-07-24.json`(역사편)이 현행 정본이다. 필드·구조·문항 유형·낱말 배치(저4/고8)를 그대로 본떠라.
