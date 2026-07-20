import { test } from "node:test";
import assert from "node:assert/strict";
import { validateArticle } from "./validate.mjs";

const good = {
  date: "2026-07-21", issueNo: 1, category: "science", categoryLabel: "과학·자연·우주",
  title: "왜 하늘은 파랄까?", subtitle: "빛 이야기", readingTimeMin: { lower: 2, upper: 3 },
  body: { lower: "쉬운 본문.", upper: "조금 더 깊은 본문." },
  vocab: [
    { word: "산란", meaning: "흩어짐" },
    { word: "대기", meaning: "지구를 둘러싼 공기" },
    { word: "파장", meaning: "물결의 길이" },
  ],
  quiz: {
    comprehension: [
      { type: "mc", question: "왜?", choices: ["a", "b", "c", "d"], answerIndex: 2, explain: "해설" },
      { type: "ox", question: "참?", answer: true, explain: "해설" },
      { type: "mc", question: "무엇?", choices: ["a", "b"], answerIndex: 0, explain: "해설" },
    ],
    vocab: [
      { type: "meaning", question: "뜻?", choices: ["a", "b", "c", "d"], answerIndex: 0 },
      { type: "cloze", question: "빈칸 ___", answer: "산란", acceptable: ["산란"] },
    ],
    think: { question: "만약?", modelAnswer: "예시" },
    bonus: null,
  },
  source: "일반 상식 재구성", illustration: null,
};

test("valid article passes", () => {
  assert.deepEqual(validateArticle(good), { ok: true, errors: [] });
});

test("answerIndex out of range fails", () => {
  const bad = structuredClone(good); bad.quiz.comprehension[0].answerIndex = 9;
  assert.equal(validateArticle(bad).ok, false);
});

test("missing body.upper fails", () => {
  const bad = structuredClone(good); delete bad.body.upper;
  assert.equal(validateArticle(bad).ok, false);
});

test("too few vocab fails", () => {
  const bad = structuredClone(good); bad.vocab = [{ word: "a", meaning: "b" }];
  assert.equal(validateArticle(bad).ok, false);
});

test("banned word fails", () => {
  const bad = structuredClone(good); bad.body.lower = "총기 이야기";
  assert.equal(validateArticle(bad).ok, false);
});

test("bad category fails", () => {
  const bad = structuredClone(good); bad.category = "sports";
  assert.equal(validateArticle(bad).ok, false);
});

test("missing think fails", () => {
  const bad = structuredClone(good); delete bad.quiz.think;
  assert.equal(validateArticle(bad).ok, false);
});

test("cloze without acceptable fails", () => {
  const bad = structuredClone(good); delete bad.quiz.vocab[1].acceptable;
  assert.equal(validateArticle(bad).ok, false);
});
