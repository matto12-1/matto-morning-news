// 인쇄 워크시트: 학년·본문/문제 선택·여러 호가 제대로 나오는지.
// (2026-08-19 1·2학년 인쇄 누락 사고 이후 추가)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { buildWorksheetHtml, printWorksheet } from "../assets/print.js";

const load = (d) => JSON.parse(readFileSync(new URL(`../content/${d}.json`, import.meta.url)));
const article = load("2026-09-30");
const textOf = (body) => body.map((s) => s.text || s).join("\n");
const pages = (html) => (html.match(/<section class="page/g) || []).length;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

for (const level of ["sprout", "lower", "upper"]) {
  test(`${level}: 해당 학년 본문이 실린다`, () => {
    const html = buildWorksheetHtml(article, level, "student");
    assert.ok(html.includes(textOf(article.body[level]).slice(0, 30)), `${level} 본문 누락`);
    assert.ok(html.includes(`lv-${level}`), `${level} 학년 클래스 누락`);
  });

  test(`${level}: 낱말 문제는 그 학년 본문에 나오는 낱말만 쓴다`, () => {
    const html = buildWorksheetHtml(article, level, "teacher");
    const text = textOf(article.body[level]);
    const off = (article.vocab || []).filter((v) => !text.includes(v.word) && html.includes(`<li>${v.word}</li>`));
    assert.deepEqual(off.map((v) => v.word), [], "본문에 없는 낱말이 인쇄됨");
  });
}

test("학생용에는 정답이 없고 교사용에는 있다", () => {
  assert.ok(!buildWorksheetHtml(article, "sprout", "student").includes("pw-ans"));
  assert.ok(buildWorksheetHtml(article, "sprout", "teacher").includes("pw-ans"));
});

test("기본은 본문 + 문제 두 면", () => {
  assert.equal(pages(buildWorksheetHtml(article, "lower", "student")), 2);
});

test("본문만 / 문제만 고르면 한 면씩", () => {
  const onlyBody = buildWorksheetHtml(article, "lower", "student", { body: true, quiz: false });
  const onlyQuiz = buildWorksheetHtml(article, "lower", "student", { body: false, quiz: true });
  assert.equal(pages(onlyBody), 1);
  assert.equal(pages(onlyQuiz), 1);
  assert.ok(onlyBody.includes("pw-body") && !onlyBody.includes("pw-h2"), "본문만인데 문제가 섞임");
  assert.ok(onlyQuiz.includes("pw-h2") && !onlyQuiz.includes('class="pw-body"'), "문제만인데 본문이 섞임");
  // 본문 없이 뽑아도 어느 기사인지 알 수 있어야 한다.
  assert.ok(onlyQuiz.includes(esc(article.title)), "문제면에 기사 제목이 없음");
});

test("바닥글은 거짓 쪽번호 대신 면 이름을 단다", () => {
  const html = buildWorksheetHtml(article, "lower", "student");
  // 문항이 많은 학년은 문제가 두 면으로 흐르므로 'n / 2'는 거짓말이 된다.
  assert.ok(!/\d+ \/ \d+/.test(html), "고정 쪽번호가 남아 있음");
  assert.ok(html.includes("읽을거리") && html.includes("학습지"));
  // 낱장으로 흩어져도 어느 호인지 알 수 있어야 한다.
  assert.equal((html.match(new RegExp(`제${article.issueNo}호`, "g")) || []).length >= 4, true);
  assert.ok(buildWorksheetHtml(article, "lower", "teacher").includes("교사용 정답지"));
});

test("그 학년이 없는 호는 3·4학년으로 내려서 뽑는다", () => {
  const noSprout = { ...article, body: { lower: article.body.lower, upper: article.body.upper } };
  const html = buildWorksheetHtml(noSprout, "sprout", "student");
  assert.ok(html.includes("lv-lower"), "폴백 실패");
  assert.ok(!html.includes("lv-sprout"));
});

test("여러 호를 고르면 호마다 두 면씩 이어 붙는다", () => {
  // printWorksheet는 DOM이 필요하므로 조립 규칙만 직접 확인한다.
  const dates = readdirSync(new URL("../content/", import.meta.url))
    .filter((f) => /^\d{4}-\d\d-\d\d\.json$/.test(f)).sort().slice(-3).map((f) => f.slice(0, 10));
  const html = dates.map((d) => buildWorksheetHtml(load(d), "lower", "student")).join("");
  assert.equal(pages(html), dates.length * 2);
  for (const d of dates) assert.ok(html.includes(esc(load(d).title)), `${d} 누락`);
  assert.equal(typeof printWorksheet, "function");
});
