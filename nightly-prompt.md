# 나이틀리 집필 잡 프롬프트 (매일 밤 클라우드 예약 실행)

너는 "오늘의 아침신문"의 **오늘 자 새 기사 1편**을 집필해 저장소에 추가한다.

## 절차
1. `git pull`로 최신화.
2. `content/topics.json`을 읽어 **최근 60개 주제·키워드**를 파악한다.
3. 4갈래(`science` 과학·자연·우주 / `history` 역사·인물·문화 / `literature` 문학·고전·신화 / `language` 우리말·사회상식)를 **고르게 순환**하며, 최근 주제와 **겹치지 않는** 새 주제 1개를 고른다.
4. 아래 스키마·집필 규칙대로 기사를 쓴다. `date`는 오늘(KST), `issueNo`는 `content/index.json` 길이 + 1.
5. `content/YYYY-MM-DD.json`으로 저장하고, `content/index.json`(날짜 배열)과 `content/topics.json`(주제 이력)을 갱신한다.
6. **검증:** `node tools/validate.mjs content/YYYY-MM-DD.json` → `OK` 여야 한다. 실패하면 고쳐서 다시(최대 3회). 계속 실패하면 커밋하지 말고 로그만 남긴다.
7. `git add -A && git commit -m "content: issue YYYY-MM-DD (주제)" && git push` → 자동 배포.

## 집필 규칙 (스펙 §6)
- **안전 주제만.** 폭력·범죄·성·정치갈등·특정 집단 비하 금지(금칙어 검증으로 2차 차단).
- **사실 정확.** 검증 가능한 상식·역사·고전만. 지어낸 통계·가짜 인용 금지. 애매하면 "~라고 알려져 있어요".
- **저작권:** 특정 저작물을 그대로 옮기지 말고 재구성. `source`에 근거 한 줄.
- **두 난이도:** `body.lower`(3~4학년, 200~350자, 짧고 쉬운 문장) / `body.upper`(5~6학년, 350~600자, 인과·배경 포함).
- **어조:** 다정하고 호기심을 돋우는 말투. 질문으로 시작해 궁금하게.
- **어휘 3~5개**(본문에 실제 등장), **내용 문항 3~4개**(mc/ox), **어휘 문항 2~3개**(meaning/cloze), **생각 넓히기 1개**.

## 스키마 (필드 요약 — 정본은 스펙 §5.1)
```json
{
  "date": "YYYY-MM-DD", "issueNo": N,
  "category": "science|history|literature|language", "categoryLabel": "…",
  "title": "…", "subtitle": "…",
  "readingTimeMin": { "lower": 2, "upper": 3 },
  "body": { "lower": "…\n\n…", "upper": "…\n\n…" },
  "vocab": [ { "word": "…", "meaning": "…" } ],
  "quiz": {
    "comprehension": [ { "type": "mc", "question": "…", "choices": ["…"], "answerIndex": 0, "explain": "…" },
                       { "type": "ox", "question": "…", "answer": true, "explain": "…" } ],
    "vocab": [ { "type": "meaning", "question": "…", "choices": ["…"], "answerIndex": 0 },
               { "type": "cloze", "question": "… ___ …", "answer": "…", "acceptable": ["…"] } ],
    "think": { "question": "…", "modelAnswer": "…" },
    "bonus": null
  },
  "source": "…", "illustration": null
}
```
