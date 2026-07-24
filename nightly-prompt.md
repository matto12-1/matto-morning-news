# 신문 집필 지침 (51호부터 — 3단계 학년 표준)

너는 "마또의 아침신문"의 **새 기사 1편**을 집필해 저장소에 추가한다.
발행은 **학교 가는 평일(월~금)만** 한다. 주말·공휴일이면 아무것도 하지 말고 종료한다.

> ⚠️ **현행 표준(2026-07 개편):** 모든 기사는 **세 학년 단계**를 갖는다 — **1·2학년(sprout) / 3·4학년(lower) / 5·6학년(upper)**.
> 골드 정본은 `content/2026-07-23.json`(과학편)과 `content/2026-07-24.json`(역사편)이다. 세 단계가 모두 들어간 이 구조를 그대로 본떠라.

## 대주제는 '고정 순환 큐'에서 꺼낸다 (임의로 고르지 말 것)
- `content/domains.json`의 `rotation` 배열이 발행 순서다. 각 항목: `{ domain(대주제), emoji, theme(테마색/카테고리 키), categoryLabel }`.
- `content/topics.json`은 발행 이력이다: `{ "nextIndex": N, "published": [ {date, domain, title, keywords} ... ] }`.
- 오늘 쓸 대주제 = `rotation[ topics.nextIndex ]`.
- 그 대주제 **안에서**, `published`의 최근 제목·키워드와 **겹치지 않는 새 소주제 1개**를 스스로 정해 집필한다.

## 절차
1. `git pull`로 최신화. 오늘이 주말/공휴일이면 종료.
2. `content/domains.json`, `content/topics.json`, `content/index.json`을 읽는다.
3. `slot = rotation[topics.nextIndex]`. 그 대주제 안에서 새 소주제를 정한다(이력과 중복 회피).
4. **골드 정본** `content/2026-07-23.json`을 읽어 스키마·문체·3단계 구조를 그대로 따른다.
5. 아래 집필 규칙대로 세 단계(sprout/lower/upper)를 모두 쓴다.
   - `date` = 오늘(KST). `issueNo` = `index.json` 길이 + 1.
   - `category` = `slot.theme`. `categoryLabel` = `slot.categoryLabel`. `badgeLabel` = `slot.domain`.
6. `content/YYYY-MM-DD.json`으로 저장.
7. 이력 갱신: `index.json`에 날짜 추가 / `topics.json`의 `published` 추가 + `nextIndex = (nextIndex+1) % rotation.length`.
8. **검증:** `node tools/validate.mjs content/YYYY-MM-DD.json` → `OK`. 또 아래 분량을 확인:
   - `node -e "const a=require('./content/YYYY-MM-DD.json');const s=x=>String(x).replace(/\\s/g,'').length;for(const k of ['sprout','lower','upper'])console.log(k,s(a.body[k].map(t=>t.text).join('')))"`
   - sprout 380~450 / lower 700~1000 / upper 1300~1500 범위여야 한다. 실패 시 최대 3회 재시도.
9. `git add content/ && git commit -m "content: issue YYYY-MM-DD (<대주제> — <소주제>)" && git push` → 자동 배포.

---

## 집필 규칙 (현행 3단계 표준)

### 안전·정확·저작권
- **안전 주제만.** 폭력·범죄·성·정치갈등·특정 집단 비하 금지(금칙어 검증으로 2차 차단).
- **사실 정확이 최우선.** 검증 가능한 상식·역사·고전·과학만. 지어낸 통계·연도·인용 금지. 애매하면 "~라고 알려져 있어요 / 전해져요"로 완충. (예: 측우기는 장영실 단독이 아니라 세종 시대 공동 성과로 서술.)
- **저작권:** 특정 저작물을 그대로 옮기지 말고 '내 표현'으로 재구성. `source`에 근거 한 줄.

### 본문 — 세 단계 (`body.sprout` / `body.lower` / `body.upper`)
세 단계는 같은 주제를 **각 학년 눈높이로 새로 쓴** 글이다(문장 재사용 금지). 어조는 따뜻한 존댓말, 질문으로 시작.

| 단계 | 키 | 분량(공백 제외) | 섹션 | 특징 |
|---|---|---|---|---|
| **1·2학년** | `body.sprout` | **380~450자** | 2~3개 | 한 문장에 생각 하나. 아주 쉬운 말. 어려운 한자어·추상어 금지. 구체적 장면·비유 위주. |
| **3·4학년** | `body.lower` | **700~1000자** | 3~4개 | 쉬운 인과 설명. |
| **5·6학년** | `body.upper` | **1300~1500자** | 4~5개 | 인과·배경 심화 + **"직접 해보기(활동)" 또는 "한 걸음 더(심화)" 문단 1개**(예: 집에서 하는 안전한 실험, 놀라운 실제 사례). |

- **1·2학년 작성 팁:** 추상 주제(세금·AI·규칙 등)는 개념 설명 대신 **아이가 겪는 구체적 장면 하나**로 연다(예: 세금 → "가게에서 사탕을 사면 값 속에 세금이 조금 들어 있어요"). `vocab` 낱말 1~2개를 sprout 본문에 자연스럽게 넣어 밑줄이 뜨게 한다.
- **활동 문단은 안전해야 한다** — 불·칼·전기를 아이 혼자 다루게 유도 금지.

### 낱말 (vocab) — 밑줄 + 선긋기 퀴즈의 원천 (기존과 동일)
- **8개.** 앞 4개는 `body.lower`에 등장(저학년 밑줄 4), 뒤 4개는 `body.upper`에만 등장(고학년 밑줄 7~8). 각 항목 `{ word, meaning(마침표로 끝), example }`.
- 앱이 각 단계 본문에 실제 등장하는 낱말만 자동 밑줄·팝업·선긋기 문제로 만든다. (sprout는 자연히 1~2개만 밑줄.)

### 퀴즈 — 학년별 분리
`quiz.comprehension = { "sprout":[...], "lower":[5문항], "upper":[5문항] }`

- **sprout: 3~4문항, `mc`(보기 3개)·`ox`만.** sprout 본문만 읽어도 풀려야 함. 모든 문항 `explain` 필수.
- **lower 5문항 유형 순서: mc, ox, mc, ox, cloze**
- **upper 5문항 유형 순서: mc, multi, ox, order, mc** (더 어렵게)
- 필드: `mc{choices[3~4],answerIndex}` · `ox{answer:boolean}` · `cloze{acceptable[]}` · `multi{choices[4],answerIndexes[]}` · `order{steps[]}`. 전부 `explain` 필수.
- `quiz.vocab` = 최소 2문항(스키마 검증용): `{type:"meaning"|"cloze",...}`.

### 생각 넓히기 (`quiz.think`) — 기본 + 1·2학년 override
- 기본(3·4·5·6 공통): `{ question(정답 없는 열린 질문), modelAnswer }`.
- **여기에 `"sprout": { question, modelAnswer }`를 추가**한다. 1·2학년 think는 **정답 없는 감상·취향·경험 질문**(가정형 추론 금지). 예: "둘 중 뭐가 더 좋아요? 왜요?". modelAnswer는 "정답이 없어요. ~처럼 자유롭게 말하면 돼요".
- (학년별로 완전히 다르게 하려면 `{sprout,lower,upper}` 세 개로 나눠도 됨 — 앱·검증 모두 지원.)

### 콕! 알아두기 (`factbox`) — 기본 + 1·2학년 override
- 기본: `{ title:"콕! 알아두기", text }`.
- **여기에 `"sprout": { title:"콕! 알아두기", text }`를 추가**한다. 1·2학년 text는 **한 가지 사실만, 쉬운 말로**.

### 그 밖의 필드
`titleEn` · `badgeTease` · `subtitle` · `intro`(2~4문장) · `readingTimeMin{ sprout:2, lower, upper }` · `source` · `illustration:null`.
- 이미지 슬롯은 비워 둔다(나중에 Gemini 이미지로 채움). `badgeLabel`은 대주제 이름.

## 스키마 정본
`content/2026-07-23.json`(과학편)이 세 단계가 모두 든 현행 정본이다. 필드·구조·문항 유형·낱말 배치(저4/고8)·sprout 5요소를 그대로 본떠라.

## 코드가 지원하는 것 (참고)
- 학년 토글은 `article.body`에 있는 단계만 자동 노출(`LEVEL_ORDER = [sprout,lower,upper]`). sprout이 없으면 2단계만 뜬다(안전).
- `think`/`factbox`는 "기본 + 해당 학년 override" 방식으로 폴백한다. sprout override가 없으면 기본이 쓰인다.
- 검증기(`tools/validate.mjs`)는 sprout를 **선택**으로 본다(있으면 형식 검사). 하지만 51호부터는 **sprout를 반드시 포함**한다.
