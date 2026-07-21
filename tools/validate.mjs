// tools/validate.mjs — 콘텐츠 자동 검증. 나이틀리 잡·CI·테스트에서 사용.
export const BANNED_WORDS = [
  "살인", "총기", "자살", "성폭력", "마약", "도박", "혐오", "테러", "학살", "음란",
];
const CATS = ["science", "history", "literature", "language", "tech", "society", "art", "mind"];

export function validateArticle(a) {
  const e = [];
  const req = (c, m) => { if (!c) e.push(m); };

  if (!a || typeof a !== "object") return { ok: false, errors: ["기사 객체 없음"] };

  req(/^\d{4}-\d{2}-\d{2}$/.test(a.date), "date 형식 오류(YYYY-MM-DD)");
  req(Number.isInteger(a.issueNo) && a.issueNo >= 1, "issueNo 오류(1 이상 정수)");
  req(CATS.includes(a.category), `category 오류(${CATS.join("/")})`);
  req(!!a.title, "title 누락");
  req(!!a.subtitle, "subtitle 누락");
  const bodyOk = (b) => {
    if (typeof b === "string") return b.trim().length > 0;
    if (Array.isArray(b)) return b.length > 0 && b.every((s) => s && typeof s.text === "string" && s.text.trim().length > 0);
    return false;
  };
  req(a.body && bodyOk(a.body.lower), "body.lower 누락/형식오류(문자열 또는 섹션 배열)");
  req(a.body && bodyOk(a.body.upper), "body.upper 누락/형식오류(문자열 또는 섹션 배열)");

  req(Array.isArray(a.vocab) && a.vocab.length >= 3, "vocab 3개 이상 필요");
  (a.vocab || []).forEach((v, i) => req(v && v.word && v.meaning, `vocab[${i}] 낱말/뜻 누락`));

  const q = a.quiz || {};
  // comprehension: 배열(구버전) 또는 { lower, upper }(레벨별) 모두 허용
  let compItems = [];
  if (Array.isArray(q.comprehension)) {
    req(q.comprehension.length >= 3, "comprehension 3문항 이상");
    compItems = q.comprehension;
  } else if (q.comprehension && typeof q.comprehension === "object") {
    req(Array.isArray(q.comprehension.lower) && q.comprehension.lower.length >= 3, "comprehension.lower 3문항 이상");
    req(Array.isArray(q.comprehension.upper) && q.comprehension.upper.length >= 3, "comprehension.upper 3문항 이상");
    compItems = [...(q.comprehension.lower || []), ...(q.comprehension.upper || [])];
  } else {
    e.push("comprehension 누락");
  }
  compItems.forEach((x, i) => {
    req(!!x.question, `comprehension[${i}] 질문 누락`);
    if (x.type === "mc") {
      req(Array.isArray(x.choices) && x.choices.length >= 2, `comprehension[${i}] 보기 부족`);
      req(Number.isInteger(x.answerIndex) && x.answerIndex >= 0 && Array.isArray(x.choices) && x.answerIndex < x.choices.length, `comprehension[${i}] answerIndex 범위`);
    } else if (x.type === "ox") {
      req(typeof x.answer === "boolean", `comprehension[${i}] ox answer 불리언`);
    } else if (x.type === "cloze") {
      req(Array.isArray(x.acceptable) && x.acceptable.length >= 1, `comprehension[${i}] cloze acceptable 필요`);
    } else if (x.type === "multi") {
      req(Array.isArray(x.choices) && x.choices.length >= 3, `comprehension[${i}] multi 보기 3개 이상`);
      req(Array.isArray(x.answerIndexes) && x.answerIndexes.length >= 1 &&
        x.answerIndexes.every((k) => Number.isInteger(k) && k >= 0 && Array.isArray(x.choices) && k < x.choices.length),
        `comprehension[${i}] multi answerIndexes 범위`);
    } else if (x.type === "order") {
      req(Array.isArray(x.steps) && x.steps.length >= 3 && x.steps.every((s) => typeof s === "string" && s.trim()), `comprehension[${i}] order steps 3개 이상`);
    } else {
      e.push(`comprehension[${i}] 알 수 없는 type: ${x.type}`);
    }
    req(!!x.explain, `comprehension[${i}] 해설 누락`);
  });

  req(Array.isArray(q.vocab) && q.vocab.length >= 2, "vocab 퀴즈 2문항 이상");
  (q.vocab || []).forEach((x, i) => {
    req(!!x.question, `vquiz[${i}] 질문 누락`);
    if (x.type === "meaning") {
      req(Array.isArray(x.choices) && x.choices.length >= 2, `vquiz[${i}] 보기 부족`);
      req(Number.isInteger(x.answerIndex) && x.answerIndex >= 0 && Array.isArray(x.choices) && x.answerIndex < x.choices.length, `vquiz[${i}] answerIndex 범위`);
    } else if (x.type === "cloze") {
      req(Array.isArray(x.acceptable) && x.acceptable.length >= 1, `vquiz[${i}] acceptable 필요`);
    } else {
      e.push(`vquiz[${i}] 알 수 없는 type: ${x.type}`);
    }
  });

  req(q.think && q.think.question && q.think.modelAnswer, "think 문항(질문/모범답안) 누락");

  const blob = JSON.stringify(a);
  BANNED_WORDS.forEach((w) => { if (blob.includes(w)) e.push(`금칙어 포함: ${w}`); });

  return { ok: e.length === 0, errors: e };
}

// CLI: node tools/validate.mjs content/2026-07-21.json
const invokedDirect = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("tools/validate.mjs");
if (invokedDirect && process.argv[2]) {
  const fs = await import("node:fs/promises");
  const a = JSON.parse(await fs.readFile(process.argv[2], "utf8"));
  const r = validateArticle(a);
  console.log(r.ok ? "OK" : "FAIL\n" + r.errors.join("\n"));
  process.exit(r.ok ? 0 : 1);
}
