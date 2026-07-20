# 데일리 문해력 신문 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 이 계획은 **랄프 루프(PROMPT.md)** 로 반복 실행되며, 매 회차 품질은 `PROMPT.md`의 채점 루브릭으로 검증한다.

**Goal:** 초등 3~6학년이 매일 아침 글 한 편을 읽고 퀴즈로 문해력을 기르는, 백엔드 없는 정적 웹앱을 완성한다.

**Architecture:** 빌드 스텝 없는 바닐라 정적 사이트(HTML/CSS/ES modules) + 기사별 JSON. 브라우저가 오늘 날짜로 오늘 글 1편을 로딩·렌더. 콘텐츠는 Claude 집필, 매일 밤 클라우드 예약 실행이 새 글을 추가·배포(자동화는 배포 단계에서 연결). 진도 저장·계정·백엔드 없음.

**Tech Stack:** HTML5, CSS3(@media print 포함), Vanilla JS(ES modules), Node.js(검증 스크립트 `validate.mjs`, 테스트), Web Speech API(TTS), Pretendard 폰트.

## Global Constraints

- 프레임워크·번들러 금지. **빌드 스텝 없는 정적 파일**만. (자율 빌드 실패 지점 최소화)
- 외부 네트워크 의존 최소화. 폰트는 로컬 번들 우선(불가 시 CDN 1개 허용).
- 백엔드 0 · 로그인 0 · 진도 저장 0 · 개인정보 수집 0 · 쿠키 0.
- 이미지(삽화) 없음(v1). `illustration: null`. SVG·타이포·컬러로 신문답게.
- 콘텐츠 저자 = Claude. 외부 LLM/Gemini 미사용.
- 브라우징/검증은 **gstack `/browse` 스킬만** 사용. `mcp__claude-in-chrome__*` 금지.
- 기사 스키마·집필 규칙은 스펙 `docs/superpowers/specs/2026-07-21-daily-literacy-newspaper-design.md` §5, §6을 정본으로 따른다.
- 서비스 이름은 `assets/config.js`의 상수 한 곳(`SITE_NAME`)에서만 정의(가제 "오늘의 아침신문", 나중 교체 대비).
- 커밋은 자주. 각 태스크 끝에 1커밋.

---

## File Structure (책임 분리)

```
/ (repo root)
├─ index.html            # 앱 셸 + 마운트 지점 (마크업 최소, 로직은 JS)
├─ assets/
│  ├─ config.js          # SITE_NAME, 카테고리 라벨, 시간대, 상수
│  ├─ app.js             # 진입점: 라우팅(홈/퀴즈/인쇄), 상태, 렌더 오케스트레이션
│  ├─ content.js         # index.json 로딩, 오늘 글 결정·폴백, 기사 fetch
│  ├─ render.js          # 홈/기사 렌더(제호, 난이도 토글, 어휘 하이라이트/툴팁)
│  ├─ quiz.js            # 퀴즈 렌더 + 채점 엔진(순수 함수 gradeXxx)
│  ├─ tts.js             # 읽어주기(Web Speech API 래퍼)
│  ├─ print.js           # 인쇄 뷰 구성(학생/교사, 난이도 선택)
│  ├─ styles.css         # 디자인 시스템(신문+키즈), 반응형, 큰글씨 토글
│  └─ print.css          # @media print 전용 A4 레이아웃
├─ content/
│  ├─ index.json         # 사용 가능한 날짜 배열
│  ├─ topics.json        # 중복 방지용 주제 이력
│  └─ 2026-07-21.json    # 오늘 글 1편(첫 회차 집필)
├─ tools/
│  ├─ validate.mjs       # 콘텐츠 자동 검증(스키마·정답·금칙어)
│  ├─ validate.test.mjs  # 검증 로직 테스트
│  └─ quiz.test.mjs      # 채점 엔진 테스트(quiz.js의 순수 함수 임포트)
├─ nightly-prompt.md     # 매일 밤 집필 잡 프롬프트(스펙 §6 규칙 포함)
├─ review.html           # 아침 검토용(생성 글 + source 나열)
├─ serve.mjs             # 로컬 정적 서버(검증/실행용, Node 내장 http)
└─ README.md             # 로컬 실행법·배포법·자동화 연결법
```

**분리 원칙:** 채점 엔진(`quiz.js`)과 검증(`validate.mjs`)은 **순수 함수**로 뽑아 Node에서 테스트 가능하게. 렌더/DOM은 별도. 브라우저 전용 API(TTS, print)는 각 파일에 격리.

---

## Task 1: 리포 스캐폴드 + 로컬 서버

**Files:**
- Create: `index.html`, `assets/config.js`, `serve.mjs`, `README.md`, `.gitignore`

**Interfaces:**
- Produces: `SITE_NAME`, `CATEGORY_LABELS`, `TIMEZONE` from `assets/config.js`; 정적 서버 `node serve.mjs`가 포트 8080에서 루트 서빙.

- [ ] **Step 1: `assets/config.js` 작성**

```js
// assets/config.js
export const SITE_NAME = "오늘의 아침신문"; // 가제. 이름 확정 시 여기만 변경
export const TIMEZONE_OFFSET_MIN = 9 * 60; // KST
export const CATEGORY_LABELS = {
  science: "과학·자연·우주",
  history: "역사·인물·문화",
  literature: "문학·고전·신화",
  language: "우리말·사회상식",
};
```

- [ ] **Step 2: `serve.mjs` 작성 (빌드 없는 로컬 서버)**

```js
// serve.mjs — Node 내장 http로 정적 서빙 (fetch(file://) 우회용)
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
const TYPES = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".svg":"image/svg+xml" };
const root = process.cwd();
createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p === "/") p = "/index.html";
    const file = normalize(join(root, p));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(404).end("not found"); }
}).listen(8080, () => console.log("http://localhost:8080"));
```

- [ ] **Step 3: `index.html` 최소 셸 작성**

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>오늘의 아침신문</title>
  <link rel="stylesheet" href="/assets/styles.css" />
  <link rel="stylesheet" href="/assets/print.css" media="print" />
</head>
<body>
  <main id="app" aria-live="polite">불러오는 중…</main>
  <script type="module" src="/assets/app.js"></script>
</body>
</html>
```

- [ ] **Step 4: `.gitignore` + `README.md` 뼈대 작성**

`.gitignore`: `node_modules/`, `.DS_Store`, `.claude/.ralph-loop.local.md`
`README.md`: 실행 `node serve.mjs` → http://localhost:8080 안내(세부는 Task 11에서 채움).

- [ ] **Step 5: 서버 기동 확인**

Run: `node serve.mjs` (백그라운드) 후 `curl -s localhost:8080 | head -1`
Expected: `<!doctype html>` 출력.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold static site + local server"
```

---

## Task 2: 콘텐츠 검증 스크립트 (`validate.mjs`) — TDD

**Files:**
- Create: `tools/validate.mjs`, `tools/validate.test.mjs`

**Interfaces:**
- Produces: `validateArticle(obj) -> { ok: boolean, errors: string[] }`; `BANNED_WORDS` 배열.

- [ ] **Step 1: 실패 테스트 작성 `tools/validate.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateArticle } from "./validate.mjs";

const good = {
  date:"2026-07-21", issueNo:1, category:"science", categoryLabel:"과학·자연·우주",
  title:"왜 하늘은 파랄까?", subtitle:"빛 이야기", readingTimeMin:{lower:2,upper:3},
  body:{ lower:"쉬운 본문.", upper:"조금 더 깊은 본문." },
  vocab:[{word:"산란", meaning:"흩어짐"}],
  quiz:{
    comprehension:[
      {type:"mc", question:"왜?", choices:["a","b","c","d"], answerIndex:2, explain:"해설"},
      {type:"ox", question:"참?", answer:true, explain:"해설"}
    ],
    vocab:[
      {type:"meaning", question:"뜻?", choices:["a","b","c","d"], answerIndex:0},
      {type:"cloze", question:"빈칸 ___", answer:"산란", acceptable:["산란"]}
    ],
    think:{ question:"만약?", modelAnswer:"예시" },
    bonus:null
  },
  source:"일반 상식 재구성", illustration:null
};

test("valid article passes", () => {
  assert.deepEqual(validateArticle(good), { ok:true, errors:[] });
});
test("answerIndex out of range fails", () => {
  const bad = structuredClone(good); bad.quiz.comprehension[0].answerIndex = 9;
  assert.equal(validateArticle(bad).ok, false);
});
test("missing body.upper fails", () => {
  const bad = structuredClone(good); delete bad.body.upper;
  assert.equal(validateArticle(bad).ok, false);
});
test("banned word fails", () => {
  const bad = structuredClone(good); bad.body.lower = "총으로 살인하는 이야기";
  assert.equal(validateArticle(bad).ok, false);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test tools/`
Expected: FAIL (validate.mjs 없음/미구현).

- [ ] **Step 3: `tools/validate.mjs` 구현**

```js
// tools/validate.mjs
export const BANNED_WORDS = ["살인","총기","자살","성폭력","마약","도박","혐오","테러"];
const CATS = ["science","history","literature","language"];

export function validateArticle(a) {
  const e = [];
  const req = (c, m) => { if (!c) e.push(m); };
  req(a && typeof a === "object", "기사 객체 없음");
  if (!a) return { ok:false, errors:e };
  req(/^\d{4}-\d{2}-\d{2}$/.test(a.date), "date 형식 오류");
  req(Number.isInteger(a.issueNo) && a.issueNo >= 1, "issueNo 오류");
  req(CATS.includes(a.category), "category 오류");
  req(a.title && a.subtitle, "제목/부제 누락");
  req(a.body && a.body.lower && a.body.upper, "body.lower/upper 누락");
  req(Array.isArray(a.vocab) && a.vocab.length >= 3, "vocab 3개 이상 필요");
  (a.vocab||[]).forEach((v,i)=>req(v.word&&v.meaning, `vocab[${i}] 낱말/뜻 누락`));
  const q = a.quiz || {};
  req(Array.isArray(q.comprehension) && q.comprehension.length >= 3, "내용문항 3개 이상");
  (q.comprehension||[]).forEach((x,i)=>{
    if (x.type==="mc") req(Array.isArray(x.choices)&&x.answerIndex>=0&&x.answerIndex<x.choices.length, `comp[${i}] answerIndex 범위`);
    else if (x.type==="ox") req(typeof x.answer==="boolean", `comp[${i}] ox answer 불리언`);
    else e.push(`comp[${i}] 알 수 없는 type`);
    req(!!x.question, `comp[${i}] 질문 누락`);
  });
  req(Array.isArray(q.vocab) && q.vocab.length >= 2, "어휘문항 2개 이상");
  (q.vocab||[]).forEach((x,i)=>{
    if (x.type==="meaning") req(Array.isArray(x.choices)&&x.answerIndex>=0&&x.answerIndex<x.choices.length, `vquiz[${i}] answerIndex 범위`);
    else if (x.type==="cloze") req(Array.isArray(x.acceptable)&&x.acceptable.length>=1, `vquiz[${i}] acceptable 필요`);
    else e.push(`vquiz[${i}] 알 수 없는 type`);
  });
  req(q.think && q.think.question && q.think.modelAnswer, "think 문항 누락");
  const blob = JSON.stringify(a);
  BANNED_WORDS.forEach(w => { if (blob.includes(w)) e.push(`금칙어 포함: ${w}`); });
  return { ok: e.length === 0, errors: e };
}

// CLI: node tools/validate.mjs content/2026-07-21.json
if (process.argv[2]) {
  const fs = await import("node:fs/promises");
  const a = JSON.parse(await fs.readFile(process.argv[2], "utf8"));
  const r = validateArticle(a);
  console.log(r.ok ? "OK" : "FAIL\n" + r.errors.join("\n"));
  process.exit(r.ok ? 0 : 1);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test tools/`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/validate.mjs tools/validate.test.mjs && git commit -m "feat: content validation with tests"
```

---

## Task 3: 채점 엔진 (`quiz.js` 순수 함수) — TDD

**Files:**
- Create: `assets/quiz.js` (채점 순수 함수 먼저), `tools/quiz.test.mjs`

**Interfaces:**
- Produces: `normalize(str)`, `gradeMC(item, idx)`, `gradeOX(item, bool)`, `gradeCloze(item, text)`, `scoreSection(items, answers) -> {correct, total}`.

- [ ] **Step 1: 실패 테스트 `tools/quiz.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, gradeMC, gradeOX, gradeCloze } from "../assets/quiz.js";

test("normalize strips spaces/punct", () => {
  assert.equal(normalize(" 산란! "), "산란");
});
test("gradeMC", () => {
  assert.equal(gradeMC({answerIndex:2}, 2), true);
  assert.equal(gradeMC({answerIndex:2}, 1), false);
});
test("gradeOX", () => {
  assert.equal(gradeOX({answer:true}, true), true);
  assert.equal(gradeOX({answer:true}, false), false);
});
test("gradeCloze accepts normalized", () => {
  assert.equal(gradeCloze({acceptable:["산란"]}, " 산란 "), true);
  assert.equal(gradeCloze({acceptable:["산란"]}, "굴절"), false);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tools/quiz.test.mjs` → FAIL.

- [ ] **Step 3: `assets/quiz.js` 순수 함수부 구현**

```js
// assets/quiz.js (채점 순수 함수 — DOM 비의존, Node 테스트 가능)
export const normalize = (s) => String(s).replace(/[\s\p{P}]/gu, "").toLowerCase();
export const gradeMC = (item, idx) => idx === item.answerIndex;
export const gradeOX = (item, bool) => bool === item.answer;
export const gradeCloze = (item, text) =>
  item.acceptable.some(a => normalize(a) === normalize(text));
export function scoreSection(items, answers) {
  let correct = 0;
  items.forEach((it, i) => {
    const ans = answers[i];
    const ok = it.type === "mc" || it.type === "meaning" ? gradeMC(it, ans)
      : it.type === "ox" ? gradeOX(it, ans)
      : it.type === "cloze" ? gradeCloze(it, ans) : false;
    if (ok) correct++;
  });
  return { correct, total: items.length };
}
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tools/quiz.test.mjs` → PASS.

- [ ] **Step 5: Commit**

```bash
git add assets/quiz.js tools/quiz.test.mjs && git commit -m "feat: quiz grading engine with tests"
```

---

## Task 4: 오늘 글 결정 로직 (`content.js`)

**Files:**
- Create: `assets/content.js`
- Test: `tools/content.test.mjs`

**Interfaces:**
- Produces: `pickIssueDate(availableDates, todayISO) -> string|null` (오늘 이하 최신 폴백); `loadIndex()`, `loadArticle(date)` (브라우저 fetch).

- [ ] **Step 1: 실패 테스트 `tools/content.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickIssueDate } from "../assets/content.js";

test("exact today", () => {
  assert.equal(pickIssueDate(["2026-07-20","2026-07-21"], "2026-07-21"), "2026-07-21");
});
test("fallback to latest before today", () => {
  assert.equal(pickIssueDate(["2026-07-19","2026-07-20"], "2026-07-21"), "2026-07-20");
});
test("no past issue returns null", () => {
  assert.equal(pickIssueDate(["2026-07-25"], "2026-07-21"), null);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tools/content.test.mjs` → FAIL.

- [ ] **Step 3: `assets/content.js` 구현**

```js
// assets/content.js
export function pickIssueDate(dates, todayISO) {
  const usable = [...dates].filter(d => d <= todayISO).sort();
  return usable.length ? usable[usable.length - 1] : null;
}
export function todayISO(offsetMin = 9 * 60) {
  const now = new Date(Date.now() + offsetMin * 60000);
  return now.toISOString().slice(0, 10);
}
export async function loadIndex() {
  const r = await fetch("/content/index.json"); return r.json();
}
export async function loadArticle(date) {
  const r = await fetch(`/content/${date}.json`);
  if (!r.ok) throw new Error("기사를 찾을 수 없어요");
  return r.json();
}
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tools/content.test.mjs` → PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat: today-issue selection with fallback"`

---

## Task 5: 첫 기사 집필 + 인덱스 (`content/2026-07-21.json`)

**Files:**
- Create: `content/2026-07-21.json`, `content/index.json`, `content/topics.json`

**세부:** 스펙 §5.1 스키마 + §6 집필 가이드를 그대로 따른다. 저학년 200~350자 / 고학년 350~600자. 어휘 3~5, 내용문항 3~4, 어휘문항 2~3, think 1. 주제는 4갈래 중 흥미로운 것 하나(예: 과학 "왜 하늘은 파랄까?").

- [ ] **Step 1: 기사 JSON 집필** (실제 본문·퀴즈·해설을 완성. 플레이스홀더 금지)
- [ ] **Step 2: `content/index.json` = `["2026-07-21"]`**
- [ ] **Step 3: `content/topics.json` = `[{date,category,title,keywords}]`**
- [ ] **Step 4: 검증 통과** — Run: `node tools/validate.mjs content/2026-07-21.json` → `OK`
- [ ] **Step 5: Commit** — `git commit -am "content: first issue 2026-07-21"`

---

## Task 6: 홈/기사 렌더 (`render.js`) — 제호·난이도 토글·어휘 툴팁

**Files:**
- Create: `assets/render.js`

**Interfaces:**
- Consumes: `SITE_NAME`, `CATEGORY_LABELS`(config), article 객체.
- Produces: `renderHome(article, {level})`, `renderBody(bodyText, vocab)` (어휘 하이라이트 HTML), `mountVocabTooltips(root, vocab)`.

- [ ] **Step 1: 렌더 함수 구현**
  - 제호(masthead): `SITE_NAME` + 발행일(YYYY년 M월 D일) + 「제 N 호」 + 갈래 배지.
  - 헤드라인: title/subtitle.
  - 난이도 토글: [저학년 3·4]/[고학년 5·6] → `body.lower`/`upper` 전환.
  - 본문: 문단 분리 렌더. `vocab.word`가 본문에 나오면 `<button class="vocab">`로 감싸고 클릭 시 뜻 툴팁(팝오버) 표시. 키보드 접근 가능.
  - 하단 "오늘의 퀴즈 풀기" 버튼(→ Task 7 라우팅).
- [ ] **Step 2: 로컬 서버로 홈 육안 확인** — `node serve.mjs` 후 `/browse` 스킬로 http://localhost:8080 열어 제호/토글/툴팁 동작 확인.
- [ ] **Step 3: Commit** — `git commit -am "feat: home + article render (masthead, level toggle, vocab tooltip)"`

---

## Task 7: 퀴즈 UI + 즉시 채점 + 리워드 (`quiz.js` DOM부)

**Files:**
- Modify: `assets/quiz.js` (렌더/이벤트 추가; 순수 함수는 유지)

**Interfaces:**
- Consumes: article.quiz, `scoreSection`.
- Produces: `renderQuiz(article, {level, onDone})`.

- [ ] **Step 1: 퀴즈 렌더 구현**
  - 순서: 내용 이해 → 어휘 → 생각 넓히기 → (bonus 있으면).
  - 각 문항 답 선택 시 **즉시 채점**: 정/오 표시 + `explain` 해설 노출.
  - cloze: 텍스트 입력 → `gradeCloze`. meaning/mc: 보기 클릭. ox: O/X 버튼.
  - think: 자유 입력 → "내 생각 저장 없이" 제출 → `modelAnswer` 토글 비교(채점 아님).
  - 완료: 섹션별 점수 요약(내용 x/y, 어휘 x/y) + 별/도장 리워드 애니메이션 + "다시 풀기".
  - **저장 없음**: 새로고침 시 초기화.
- [ ] **Step 2: `/browse`로 전 문항 유형 클릭 테스트**(정답/오답/해설/리워드).
- [ ] **Step 3: Commit** — `git commit -am "feat: quiz UI, instant grading, rewards"`

---

## Task 8: 읽어주기 TTS (`tts.js`)

**Files:**
- Create: `assets/tts.js`

**Interfaces:**
- Produces: `speak(text)`, `stop()`, `isSupported()`.

- [ ] **Step 1: Web Speech API 래퍼 구현** (`ko-KR`, 재생/정지, 미지원 시 버튼 숨김)

```js
// assets/tts.js
export const isSupported = () => "speechSynthesis" in window;
let u = null;
export function speak(text) {
  if (!isSupported()) return;
  stop();
  u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR"; u.rate = 0.95;
  speechSynthesis.speak(u);
}
export function stop() { if (isSupported()) speechSynthesis.cancel(); }
```

- [ ] **Step 2: 홈 본문에 재생/정지 버튼 연결** (선택 난이도 본문 낭독)
- [ ] **Step 3: `/browse`로 재생/정지 확인**
- [ ] **Step 4: Commit** — `git commit -am "feat: TTS read-aloud"`

---

## Task 9: 인쇄 워크시트 (`print.js` + `print.css`)

**Files:**
- Create: `assets/print.js`, `assets/print.css`

**Interfaces:**
- Produces: `openPrint(article, {level, mode})` (mode: `student`|`teacher`).

- [ ] **Step 1: 인쇄 뷰 구성**
  - 인쇄 전 옵션: 난이도(저/고), 학생용/교사용.
  - 학생용: 기사(선택 난이도) + 문제(정답 숨김) + 빈 답란.
  - 교사용: 동일 + 정답·해설 표기.
  - `window.print()` 호출. `print.css`에서 A4 1~2장, 화면 UI 숨김, 잉크 절약.
- [ ] **Step 2: `/browse`로 인쇄 미리보기(학생/교사, 저/고) 확인** — A4 넘침·잘림 없는지.
- [ ] **Step 3: Commit** — `git commit -am "feat: printable worksheet (student/teacher)"`

---

## Task 10: 앱 오케스트레이션 + 디자인 시스템 (`app.js` + `styles.css`)

**Files:**
- Create/Modify: `assets/app.js`, `assets/styles.css`

**Interfaces:**
- Consumes: content/render/quiz/tts/print 모듈.
- Produces: 라우팅(홈↔퀴즈↔인쇄), `?date=` 지원, 큰글씨 토글, 에러 폴백 UI.

- [ ] **Step 1: `app.js` 진입/라우팅 구현**
  - 부팅: `loadIndex()` → `todayISO()` → `pickIssueDate` → `loadArticle` → `renderHome`.
  - `?date=YYYY-MM-DD`면 해당 글(교사용). 없으면/에러면 "오늘은 신문이 쉬어가요" 폴백 화면.
  - 난이도 상태 공유(홈↔퀴즈↔인쇄 동일 레벨).
- [ ] **Step 2: `styles.css` 디자인 시스템**
  - 신문+키즈 균형: 세리프 제호, 본문 가독형, 밝고 따뜻한 팔레트, 큰 터치 타깃(≥44px), 명확한 위계.
  - 반응형: 모바일·태블릿·PC. 큰글씨 토글(루트 폰트 스케일).
  - Pretendard 로컬 번들(불가 시 CDN 1개).
- [ ] **Step 3: `/browse`로 3개 뷰포트(모바일 375 / 태블릿 768 / PC 1280) 확인**
- [ ] **Step 4: Commit** — `git commit -am "feat: app routing + design system + responsive/a11y"`

---

## Task 11: 나이틀리 잡 프롬프트 + 검토 페이지 + README

**Files:**
- Create: `nightly-prompt.md`, `review.html`
- Modify: `README.md`

- [ ] **Step 1: `nightly-prompt.md` 작성** — 스펙 §9.2 절차 + §6 집필 규칙 + 스키마 요약 + 검증(`node tools/validate.mjs`) + 커밋/푸시. 중복 방지(`topics.json`) 명시.
- [ ] **Step 2: `review.html` 작성** — `index.json`의 최근 글들을 `source`와 함께 나열(정적 fetch).
- [ ] **Step 3: `README.md` 완성** — 로컬 실행(`node serve.mjs`), 테스트(`node --test tools/`), 배포(GitHub+Pages/Netlify), 클라우드 예약 실행 연결법(내일 아침 단계), 이름 변경 위치(`config.js`).
- [ ] **Step 4: Commit** — `git commit -am "docs: nightly job prompt, review page, README"`

---

## Task 12: 통합 자가 검증 (전 플로우) — 랄프 루프 채점 진입점

**Files:** (수정은 발견된 이슈에 따라)

- [ ] **Step 1: 전체 회귀** — Run: `node --test tools/` → 전부 PASS.
- [ ] **Step 2: `/browse`로 엔드투엔드**:
  - 홈 로딩 → 난이도 토글 → 어휘 툴팁 → TTS 재생/정지 → 퀴즈(전 유형 정/오) → 리워드 → 인쇄(학생/교사, 저/고) → `?date=` 교사 접근 → 에러 폴백.
  - 3개 뷰포트에서 반복. 스크린샷 증거 수집.
- [ ] **Step 3: PROMPT.md 루브릭으로 다각도 채점** → `SCORES/iteration-N.md` 기록.
- [ ] **Step 4: 상위 개선점 backlog 도출** → 다음 회차 반영.
- [ ] **Step 5: Commit** — `git commit -am "test: end-to-end verification + iteration scorecard"`

---

## Self-Review (계획 vs 스펙)

- **스펙 커버리지:** §4 아키텍처→T1/T4/T10, §5 스키마→T2/T5, §6 집필→T5/T11, §7 화면(홈/퀴즈/인쇄)→T6/T7/T9, TTS→T8, 어휘 툴팁→T6, 반응형·접근성→T10, §9 나이틀리→T11, 자동 검증→T2, 자가 테스트→T12. 배포·예약 실행은 "내일 아침" 단계로 README(T11)에 절차화(자율 빌드 범위 밖, 의도적).
- **플레이스홀더:** 코드 스텝은 실제 코드 포함. 콘텐츠(T5)·UI 폴리시(T6/T7/T10)는 랄프 루프가 루브릭으로 반복 개선.
- **타입 일관성:** `validateArticle`/`pickIssueDate`/`gradeMC/OX/Cloze`/`scoreSection`/`renderHome`/`renderQuiz`/`openPrint`/`speak/stop` 시그니처가 태스크 간 일치.

## 비고: 랄프 루프와의 관계

이 계획은 **1회차의 뼈대**를 만든다. 품질(특히 아동 UI/UX·아침 독서 분량)은 `PROMPT.md`의 루브릭으로 매 회차 채점·개선하며, 빡센 정지 조건에 도달하면 `<promise>`로 종료한다.
