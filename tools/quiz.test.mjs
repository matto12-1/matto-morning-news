import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, gradeMC, gradeOX, gradeCloze, gradeItem, scoreSection } from "../assets/quiz.js";

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

test("gradeItem dispatches by type", () => {
  assert.equal(gradeItem({ type: "mc", answerIndex: 0 }, 0), true);
  assert.equal(gradeItem({ type: "meaning", answerIndex: 1 }, 1), true);
  assert.equal(gradeItem({ type: "ox", answer: false }, false), true);
  assert.equal(gradeItem({ type: "cloze", acceptable: ["가"] }, "가"), true);
  assert.equal(gradeItem({ type: "unknown" }, 0), false);
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
