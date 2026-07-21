import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, gradeMC, gradeOX, gradeCloze, gradeMulti, gradeOrder, gradeMatch, gradeItem, scoreSection, correctText } from "../assets/quiz.js";

test("normalize strips spaces/punct/case", () => {
  assert.equal(normalize(" 산란! "), "산란");
  assert.equal(normalize("Hello, World"), "helloworld");
});

test("gradeMC", () => {
  assert.equal(gradeMC({ answerIndex: 2 }, 2), true);
  assert.equal(gradeMC({ answerIndex: 2 }, 1), false);
});

test("gradeOX", () => {
  assert.equal(gradeOX({ answer: true }, true), true);
  assert.equal(gradeOX({ answer: true }, false), false);
});

test("gradeCloze accepts normalized variants", () => {
  assert.equal(gradeCloze({ acceptable: ["산란"] }, " 산란 "), true);
  assert.equal(gradeCloze({ acceptable: ["산란", "빛의 산란"] }, "빛의산란"), true);
  assert.equal(gradeCloze({ acceptable: ["산란"] }, "굴절"), false);
});

test("gradeMulti needs exact set (order-independent)", () => {
  const item = { answerIndexes: [0, 2] };
  assert.equal(gradeMulti(item, [2, 0]), true);
  assert.equal(gradeMulti(item, [0, 2, 0]), true);
  assert.equal(gradeMulti(item, [0]), false);
  assert.equal(gradeMulti(item, [0, 1, 2]), false);
  assert.equal(gradeMulti(item, []), false);
});

test("gradeOrder needs exact sequence", () => {
  const item = { steps: ["가", "나", "다"] };
  assert.equal(gradeOrder(item, ["가", "나", "다"]), true);
  assert.equal(gradeOrder(item, ["나", "가", "다"]), false);
  assert.equal(gradeOrder(item, ["가", "나"]), false);
});

test("gradeMatch needs every word on its own meaning", () => {
  const item = { pairs: [{ word: "가", meaning: "A" }, { word: "나", meaning: "B" }, { word: "다", meaning: "C" }] };
  assert.equal(gradeMatch(item, [0, 1, 2]), true);
  assert.equal(gradeMatch(item, [1, 0, 2]), false);
  assert.equal(gradeMatch(item, [0, 1, -1]), false); // 미완성
  assert.equal(gradeMatch(item, [0, 1]), false);
});

test("gradeItem dispatches by type", () => {
  assert.equal(gradeItem({ type: "mc", answerIndex: 0 }, 0), true);
  assert.equal(gradeItem({ type: "meaning", answerIndex: 1 }, 1), true);
  assert.equal(gradeItem({ type: "ox", answer: false }, false), true);
  assert.equal(gradeItem({ type: "cloze", acceptable: ["가"] }, "가"), true);
  assert.equal(gradeItem({ type: "multi", answerIndexes: [1, 2] }, [2, 1]), true);
  assert.equal(gradeItem({ type: "order", steps: ["a", "b"] }, ["a", "b"]), true);
  assert.equal(gradeItem({ type: "match", pairs: [{ word: "가", meaning: "A" }, { word: "나", meaning: "B" }] }, [0, 1]), true);
  assert.equal(gradeItem({ type: "unknown" }, 0), false);
});

test("correctText renders answer per type", () => {
  assert.equal(correctText({ type: "mc", choices: ["가", "나"], answerIndex: 1 }), "나");
  assert.equal(correctText({ type: "ox", answer: true }), "O (맞아요)");
  assert.equal(correctText({ type: "cloze", acceptable: ["산란"] }), "산란");
  assert.equal(correctText({ type: "multi", choices: ["가", "나", "다"], answerIndexes: [0, 2] }), "가, 다");
  assert.equal(correctText({ type: "order", steps: ["하나", "둘"] }), "하나  →  둘");
  assert.equal(correctText({ type: "match", pairs: [{ word: "가", meaning: "A" }, { word: "나", meaning: "B" }] }), "가 = A / 나 = B");
});

test("scoreSection counts correct", () => {
  const items = [
    { type: "mc", answerIndex: 0 },
    { type: "ox", answer: true },
    { type: "cloze", acceptable: ["나무"] },
  ];
  assert.deepEqual(scoreSection(items, [0, true, "나무"]), { correct: 3, total: 3 });
  assert.deepEqual(scoreSection(items, [1, true, "돌"]), { correct: 1, total: 3 });
});
