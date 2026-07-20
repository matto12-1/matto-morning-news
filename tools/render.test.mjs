import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate, renderBody } from "../assets/render.js";

test("formatDate formats Korean date with weekday", () => {
  assert.equal(formatDate("2026-07-21"), "2026년 7월 21일 화요일");
});

test("renderBody wraps vocab words in .vocab buttons", () => {
  const html = renderBody("빛의 산란은 흩어짐", [{ word: "산란", meaning: "흩어짐" }]);
  assert.match(html, /class="vocab" data-word="산란"/);
  assert.match(html, />산란</);
});

test("renderBody splits paragraphs on blank lines", () => {
  const html = renderBody("첫째 문단\n\n둘째 문단", []);
  assert.equal((html.match(/<p>/g) || []).length, 2);
});

test("renderBody escapes HTML in text", () => {
  const html = renderBody("위험 <script> 태그", []);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test("renderBody handles no vocab safely", () => {
  const html = renderBody("낱말 없음", []);
  assert.equal(html, "<p>낱말 없음</p>");
});
